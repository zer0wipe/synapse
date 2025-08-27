import { App, TFile, normalizePath, MarkdownView, parseYaml, stringifyYaml } from 'obsidian';

export class NoteManager {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    private sanitizeTitle(title: string): string {
        // This will remove any characters that are not allowed in file names.
        return title.replace(/[\/:]/g, '');
    }

    async createNote(title: string, content: string, baseFolder: string, sourceFile: TFile): Promise<TFile> {
        const sanitizedTitle = this.sanitizeTitle(title);
        let folderPath = baseFolder;

        // If no specific folder is set, create it in the same folder as the source file.
        if (!folderPath && sourceFile.parent) {
            folderPath = sourceFile.parent.path;
        }

        // Ensure the folder exists
        if (folderPath && folderPath !== '/' && !this.app.vault.getAbstractFileByPath(folderPath)) {
            try {
                await this.app.vault.createFolder(folderPath);
            } catch (error) {
                console.error(`Error creating folder ${folderPath}:`, error);
                folderPath = sourceFile.parent?.path || ''; // Fallback to source file's folder or root
            }
        }

        let filePath = normalizePath(`${folderPath ? folderPath + '/' : ''}${sanitizedTitle}.md`);
        
        // Handle file name conflicts by appending a timestamp
        if (this.app.vault.getAbstractFileByPath(filePath)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            filePath = normalizePath(`${folderPath ? folderPath + '/' : ''}${sanitizedTitle}-${timestamp}.md`);
        }
        
        return await this.app.vault.create(filePath, content);
    }

    async linkNoteAtCursor(newFile: TFile, sourceFile: TFile) {
        const linkText = this.app.fileManager.generateMarkdownLink(newFile, sourceFile.path);
        const currentContent = await this.app.vault.read(sourceFile);

        let frontmatter = {};
        let contentWithoutFrontmatter = currentContent;
        const frontmatterMatch = currentContent.match(/^---\n(.*?)\n---\n(.*)/s);

        if (frontmatterMatch) {
            frontmatter = parseYaml(frontmatterMatch[1]) || {};
            contentWithoutFrontmatter = frontmatterMatch[2];
        }

        // Ensure the 'synapse-links' array exists
        if (!frontmatter['synapse-links']) {
            frontmatter['synapse-links'] = [];
        }
        // Add the new link if it's not already present
        if (!frontmatter['synapse-links'].includes(linkText)) {
            frontmatter['synapse-links'].push(linkText);
        }

        const newFrontmatter = `---\n${stringifyYaml(frontmatter)}---\n`;
        const newContent = newFrontmatter + contentWithoutFrontmatter;

        await this.app.vault.modify(sourceFile, newContent);
    }
}
