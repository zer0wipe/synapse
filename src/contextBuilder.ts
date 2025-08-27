import { App, TFile } from 'obsidian';

export class ContextBuilder {
    private app: App;
    private maxDepth: number;

    constructor(app: App, maxDepth: number) {
        this.app = app;
        this.maxDepth = maxDepth;
    }

    public updateSettings(maxDepth: number) {
        this.maxDepth = maxDepth;
    }

    async buildContext(startFile: TFile): Promise<string> {
        let contextChain: TFile[] = [];
        let currentFile: TFile | null = startFile;
        let depth = 0;
        const visitedFiles = new Set<string>();

        // 1. Traverse backward to find the conversation history
        while (currentFile && depth < this.maxDepth) {
            if (visitedFiles.has(currentFile.path)) {
                break; // Prevent circular dependencies
            }
            visitedFiles.add(currentFile.path);

            contextChain.unshift(currentFile); // Add to the start (oldest first)

            const parentFile = this.findParent(currentFile);
            currentFile = parentFile;
            depth++;
        }

        // 2. Read and format the content of the notes in the chain
        let contextString = "";
        for (const file of contextChain) {
            const content = await this.app.vault.read(file);
            // Remove Obsidian wiki-links like [[...]] to avoid leaking link noise into LLM context.
            // Use a non-greedy match inside double brackets.
            const contentWithoutLinks = content.replace(/\[\[[^\]]+\]\]/g, '');
            contextString += `--- [Note: ${file.basename}] ---
${contentWithoutLinks}

`;
        }

        return contextString;
    }

    // Finds the "parent" note (the one that links to the current file)
    private findParent(file: TFile): TFile | null {
        const backlinks = this.getBacklinks(file);

        if (backlinks.length > 0) {
            // Strategy: Choose the most recently modified parent as the likely conversational predecessor.
            backlinks.sort((a, b) => b.stat.mtime - a.stat.mtime);
            return backlinks[0];
        }
        return null;
    }

    private getBacklinks(file: TFile): TFile[] {
        const backlinks: TFile[] = [];
        
        // Method 1: Using the undocumented getBacklinksForFile (more efficient)
        if ((this.app.metadataCache as any).getBacklinksForFile) {
            const backlinkData = (this.app.metadataCache as any).getBacklinksForFile(file);
            if (backlinkData) {
                const paths = Object.keys(backlinkData.data);
                for (const path of paths) {
                    const sourceFile = this.app.vault.getAbstractFileByPath(path);
                    if (sourceFile instanceof TFile) {
                        backlinks.push(sourceFile);
                    }
                }
                if (backlinks.length > 0) {
                    return backlinks;
                }
            }
        }

        // Method 2: Fallback using resolvedLinks (less efficient but reliable)
        const allLinks = this.app.metadataCache.resolvedLinks;
        for (const sourcePath in allLinks) {
            const links = allLinks[sourcePath];
            if (links && links[file.path]) {
                const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);
                if (sourceFile instanceof TFile && !backlinks.some(f => f.path === sourceFile.path)) {
                    backlinks.push(sourceFile);
                }
            }
        }
        return backlinks;
    }

}
