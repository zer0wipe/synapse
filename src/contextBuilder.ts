/**
 * contextBuilder.ts
 * 
 * This service is responsible for building a conversational context from a chain of linked Obsidian notes.
 * It traverses backlinks from a starting note up to a specified depth, gathers their content,
 * and formats it into a single string suitable for input to a Large Language Model (LLM).
 */
import { App, TFile } from 'obsidian';

/**
 * Manages the process of building conversational context from Obsidian notes.
 * It identifies a chain of related notes (via backlinks) and concatenates their content.
 */
export class ContextBuilder {
    // The Obsidian App instance, providing access to vault and metadata.
    private app: App;
    // The maximum depth to traverse backlinks when building context.
    private maxDepth: number;

    /**
     * Constructs a new ContextBuilder instance.
     * @param app The Obsidian App instance.
     * @param maxDepth The maximum number of backlinks to traverse.
     */
    constructor(app: App, maxDepth: number) {
        this.app = app;
        this.maxDepth = maxDepth;
    }

    /**
     * Updates the maximum context depth setting.
     * @param maxDepth The new maximum depth for context building.
     */
    public updateSettings(maxDepth: number) {
        this.maxDepth = maxDepth;
    }

    /**
     * Builds a conversational context string by traversing backlinks from a starting file.
     * The context includes the content of the `startFile` and its `maxDepth` number of parents.
     * @param startFile The Obsidian note from which to start building context.
     * @returns A formatted string containing the content of the context chain.
     */
    async buildContext(startFile: TFile): Promise<string> {
        let contextChain: TFile[] = [];
        let currentFile: TFile | null = startFile;
        let depth = 0;
        const visitedFiles = new Set<string>(); // To prevent infinite loops in case of circular links

        // 1. Traverse backward to find the conversation history (parent notes).
        while (currentFile && depth < this.maxDepth) {
            if (visitedFiles.has(currentFile.path)) {
                break; // Stop if a circular link is detected to prevent infinite recursion.
            }
            visitedFiles.add(currentFile.path);

            // Add the current file to the beginning of the chain (oldest first).
            contextChain.unshift(currentFile);

            // Find the parent note that links to the current file.
            const parentFile = this.findParent(currentFile);
            currentFile = parentFile;
            depth++;
        }

        // 2. Read and format the content of the notes in the context chain.
        let contextString = "";
        for (const file of contextChain) {
            const content = await this.app.vault.read(file);
            // Remove Obsidian wiki-links (e.g., [[Link Name]]) to avoid leaking link noise into the LLM context.
            // A non-greedy regex is used to match content inside double brackets.
            const contentWithoutLinks = content.replace(/\[\[.*?\]\]/g, '');
            contextString += `--- [Note: ${file.basename}] ---
${contentWithoutLinks}\n\n`;
        }

        return contextString;
    }

    /**
     * Finds the "parent" note that links to the given file.
     * The strategy is to find all backlinks and select the most recently modified one
     * as the likely conversational predecessor.
     * @param file The file for which to find the parent.
     * @returns The parent TFile or null if no parent is found.
     */
    private findParent(file: TFile): TFile | null {
        const backlinks = this.getBacklinks(file);

        if (backlinks.length > 0) {
            // Sort backlinks by modification time (newest first) to prioritize recent conversations.
            backlinks.sort((a, b) => b.stat.mtime - a.stat.mtime);
            return backlinks[0];
        }
        return null;
    }

    /**
     * Retrieves all notes that link to the given file (backlinks).
     * It attempts to use an undocumented Obsidian API for efficiency, falling back to a more
     * general method if the API is not available or does not return data.
     * @param file The file for which to get backlinks.
     * @returns An array of TFile objects representing the backlinks.
     */
    private getBacklinks(file: TFile): TFile[] {
        const backlinks: TFile[] = [];
        
        // Method 1: Attempt to use the undocumented `getBacklinksForFile` method for efficiency.
        // WARNING: This is an undocumented API and may break in future Obsidian updates.
        // It provides a direct way to get backlinks, which is more performant than iterating `resolvedLinks`.
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

        // Method 2: Fallback using resolvedLinks (less efficient but reliable across versions).
        // This iterates through all resolved links in the vault to find those pointing to the current file.
        const allLinks = this.app.metadataCache.resolvedLinks;
        for (const sourcePath in allLinks) {
            const links = allLinks[sourcePath];
            if (links && links[file.path]) {
                const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);
                // Ensure the source file is a TFile and not already added to avoid duplicates.
                if (sourceFile instanceof TFile && !backlinks.some(f => f.path === sourceFile.path)) {
                    backlinks.push(sourceFile);
                }
            }
        }
        return backlinks;
    }

}

