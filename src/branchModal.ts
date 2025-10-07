/**
 * branchModal.ts
 * 
 * This module implements the branching modal interface that allows users to
 * interactively select notes to build their context chain.
 */
import { App, Modal, TFile, setIcon } from 'obsidian';

/**
 * BranchModal implements the branching interface for thought context selection.
 * This modal allows users to navigate their note graph and select multiple notes
 * to include in their thought's context chain.
 * 
 * UI Components:
 * - Chain Preview: Shows currently selected notes
 * - Current Note: Displays active note
 * - Link Navigation:
 *   - Inbound Links: Notes linking to current note
 *   - Outbound Links: Notes linked from current note
 * 
 * Interaction Flow:
 * 1. Start from active note
 * 2. Navigate through note connections
 * 3. Select relevant notes for context
 * 4. Confirm final chain
 * 
 * @extends Modal
 * @example
 * ```typescript
 * new BranchModal(app, currentFile, (selectedNotes) => {
 *   // Handle selected notes
 * }).open();
 * ```
 */
export class BranchModal extends Modal {
    private currentNote: TFile;
    private selectedNotes: TFile[] = [];
    private onComplete: (notes: TFile[]) => void;

    constructor(app: App, startNote: TFile, onComplete: (notes: TFile[]) => void) {
        super(app);
        this.currentNote = startNote;
        this.selectedNotes = []; // Don't automatically add the start note
        this.onComplete = onComplete;
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.addClass('synapse-plugin');
        await this.updateModalContent();
    }

    private async updateModalContent() {
        const { contentEl } = this;
        contentEl.empty();

        // Header
        const headerEl = contentEl.createDiv('modal-header');
        headerEl.createEl('h2', { text: 'Branch Context' });

        // Current chain
        const chainEl = contentEl.createDiv('chain-container');
        chainEl.createEl('h3', { text: 'Context Chain:' });
        const chainList = chainEl.createEl('ul');
        if (this.selectedNotes.length === 0) {
            const li = chainList.createEl('li');
            li.setText('No notes added to context yet');
            li.addClass('no-notes');
        } else {
            this.selectedNotes.forEach((note, index) => {
                const li = chainList.createEl('li');
                const noteText = li.createSpan();
                noteText.setText(note.basename);
                
                // Add remove button
                const removeBtn = li.createEl('button');
                removeBtn.addClass('remove-note');
                setIcon(removeBtn, 'x');
                removeBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.selectedNotes.splice(index, 1);
                    this.updateModalContent();
                };
            });
        }

        // Current note info
        const currentNoteEl = contentEl.createDiv('current-note');
        const currentNoteHeader = currentNoteEl.createDiv('current-note-header');
        currentNoteHeader.createEl('h3', { text: `Current Note: ${this.currentNote.basename}` });
        
        // Add to context button
        if (!this.selectedNotes.some(note => note.path === this.currentNote.path)) {
            const addBtn = currentNoteHeader.createEl('button', {
                text: 'Add to Context'
            });
            addBtn.addClass('add-to-context');
            setIcon(addBtn, 'plus');
            addBtn.onclick = () => {
                this.addToContext(this.currentNote);
            };
        } else {
            const inContextSpan = currentNoteHeader.createEl('span');
            inContextSpan.setText('In context');
            inContextSpan.addClass('in-context');
        }

        // Links container
        const linksEl = contentEl.createDiv('links-container');
        
        // Inbound links
        const inboundEl = linksEl.createDiv('inbound-links');
        inboundEl.createEl('h4', { text: 'Inbound Links:' });
        const inboundLinks = this.getInboundLinks(this.currentNote);
        const inboundList = inboundEl.createEl('ul');
        if (inboundLinks.length === 0) {
            const li = inboundList.createEl('li');
            li.setText('No inbound links');
            li.addClass('no-links');
        } else {
            inboundLinks.forEach(link => {
                const li = inboundList.createEl('li');
                const btn = li.createEl('button');
                btn.setText(link.basename);
                btn.onclick = () => this.selectNote(link);
            });
        }

        // Outbound links
        const outboundEl = linksEl.createDiv('outbound-links');
        outboundEl.createEl('h4', { text: 'Outbound Links:' });
        const outboundLinks = await this.getOutboundLinks(this.currentNote);
        const outboundList = outboundEl.createEl('ul');
        outboundLinks.forEach(link => {
            const li = outboundList.createEl('li');
            const btn = li.createEl('button');
            btn.setText(link.basename);
            btn.onclick = () => this.selectNote(link);
        });

        // Action buttons
        const actionsEl = contentEl.createDiv('modal-actions');
        
        const finishBtn = actionsEl.createEl('button', {
            text: 'Stop here – use current chain'
        });
        finishBtn.onclick = () => {
            this.finish();
        };
    }

    private getInboundLinks(file: TFile): TFile[] {
        // Get the resolved backlinks from the metadata cache
        const resolvedLinks = this.app.metadataCache.resolvedLinks;
        const inboundLinks: TFile[] = [];

        // Look through all files in the metadata cache
        for (const [sourcePath, links] of Object.entries(resolvedLinks)) {
            // If this file has a link to our target file
            if (links[file.path]) {
                const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);
                if (sourceFile instanceof TFile) {
                    inboundLinks.push(sourceFile);
                }
            }
        }
        
        return inboundLinks;
    }

    private async getOutboundLinks(file: TFile): Promise<TFile[]> {
        // Get the file's content and parse for wiki-links
        const content = await this.app.vault.read(file);
        const matches = Array.from(content.matchAll(/\[\[(.*?)\]\]/g));
        
        // Resolve the links to actual TFiles
        const links = matches
            .map(match => match[1].split('|')[0]) // Handle [[Link|Alias]] format
            .map(link => this.app.metadataCache.getFirstLinkpathDest(link, file.path))
            .filter((file): file is TFile => file instanceof TFile);
            
        return Array.from(new Set(links)); // Remove duplicates
    }

    private selectNote(note: TFile) {
        // Just navigate to the note without adding it to context
        this.currentNote = note;
        this.updateModalContent();
    }

    private addToContext(note: TFile) {
        if (!this.selectedNotes.some(n => n.path === note.path)) {
            this.selectedNotes.push(note);
            this.updateModalContent();
        }
    }

    private finish() {
        // If no notes are selected, add the current note
        if (this.selectedNotes.length === 0) {
            this.selectedNotes.push(this.currentNote);
        }
        this.onComplete(this.selectedNotes);
        this.close();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}