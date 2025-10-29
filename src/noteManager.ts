/**
 * noteManager.ts
 * 
 * This service is responsible for managing Obsidian notes, including creating new notes
 * and establishing links between them. It handles file path normalization, folder creation,
 * filename conflict resolution, and updating note frontmatter.
 */
import { App, TFile, normalizePath } from 'obsidian';

/**
 * Manages the creation and linking of Obsidian notes within the vault.
 */
/**
 * NoteManager handles all note-related operations in the vault.
 * This service is responsible for creating, updating, and managing notes
 * while maintaining Obsidian's expected file structure and metadata.
 * 
 * Core Functions:
 * - Creates new notes with proper titles and paths
 * - Handles note content formatting and metadata
 * - Manages note relationships and backlinks
 * - Ensures unique filenames and proper paths
 * 
 * File Naming Strategy:
 * - Sanitizes titles for filesystem compatibility
 * - Handles duplicate file names with timestamps
 * - Maintains folder structure based on settings
 * 
 * @example
 * ```typescript
 * const manager = new NoteManager(app);
 * await manager.createNote(title, content, folder, activeFile);
 * ```
 */
export class NoteManager {
    // The Obsidian App instance, providing access to vault operations.
    private app: App;

    /**
     * Constructs a new NoteManager instance.
     * @param app The Obsidian App instance.
     */
    constructor(app: App) {
        this.app = app;
    }

    /**
     * Sanitizes a given title string to be safe for use as an Obsidian filename.
     * 
     * This method processes raw titles to ensure they are compatible with:
     * - File system requirements
     * - Obsidian's naming conventions
     * - Cross-platform compatibility
     * 
     * Processing Steps:
     * 1. Remove illegal characters ('/', ':')
     * 2. Replace problematic characters with safe alternatives
     * 3. Trim whitespace and normalize separators
     * 
     * @param title The raw title string to be sanitized
     * @returns A sanitized string safe for use as a filename
     * 
     * @example
     * ```typescript
     * const safeTitle = manager.sanitizeTitle('My: Special/Note');
     * // Returns: 'My Special Note'
     * ```
     * @returns The sanitized title string.
     */
    private sanitizeTitle(title: string): string {
        const cleaned = title
            .replace(/[\/:\\*\?"<>|#\[\]]/g, '') // remove filesystem and markdown control chars
            .replace(/\s+/g, ' ')
            .trim();
        return cleaned.length > 0 ? cleaned : 'Synapse Note';
    }

    /**
     * Creates a new Obsidian note with the given title and content.
     * Handles folder creation, sanitizes the title, and resolves filename conflicts
     * by appending a timestamp if a file with the same name already exists.
     * @param title The title for the new note.
     * @param content The content for the new note.
     * @param baseFolder The base folder where the note should be created. If empty, uses the source file's folder.
     * @param sourceFile The original note from which the new note is being created.
     * @returns A Promise that resolves to the newly created TFile.
     */
    async createNote(title: string, content: string, baseFolder: string, sourceFile: TFile): Promise<TFile> {
        const sanitizedTitle = this.sanitizeTitle(title);
        let folderPath = baseFolder;

        // If no specific base folder is set in settings, default to the source file's parent folder.
        if (!folderPath && sourceFile.parent) {
            folderPath = sourceFile.parent.path;
        }

        // Ensure the target folder exists. If not, attempt to create it.
        // Avoid creating a folder for the root path '/'.
        if (folderPath && folderPath !== '/' && !this.app.vault.getAbstractFileByPath(folderPath)) {
            try {
                await this.app.vault.createFolder(folderPath);
            } catch (error) {
                console.error(`Error creating folder ${folderPath}:`, error);
                // Fallback to the source file's folder or the vault root if folder creation fails.
                folderPath = sourceFile.parent?.path || '';
            }
        }

        // Construct the full file path, normalizing it for Obsidian.
        let filePath = normalizePath(`${folderPath ? folderPath + '/' : ''}${sanitizedTitle}.md`);
        
        // Handle potential file name conflicts by appending a timestamp.
        if (this.app.vault.getAbstractFileByPath(filePath)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            filePath = normalizePath(`${folderPath ? folderPath + '/' : ''}${sanitizedTitle}-${timestamp}.md`);
        }
        
        // Create the new note in the vault with the specified content.
        return await this.app.vault.create(filePath, content);
    }

}
