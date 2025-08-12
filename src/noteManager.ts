import { App, TFile, normalizePath, MarkdownView } from 'obsidian';

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
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);

        if (activeView && activeView.file?.path === sourceFile.path) {
            const editor = activeView.editor;
            const linkText = this.app.fileManager.generateMarkdownLink(newFile, sourceFile.path);
            
            // Insert the link at the cursor position, ensuring separation
            editor.replaceSelection(`\n\n${linkText}\n\n`);
        } else {
            // Fallback if the source file is not the active view (e.g., if the process was slow and the user switched notes)
            const linkText = `\n\n[[${newFile.basename}]]\n\n`;
            await this.app.vault.append(sourceFile, linkText);
        }
    }
}
