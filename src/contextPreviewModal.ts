/**
 * contextPreviewModal.ts
 * 
 * A modal that shows the current context chain that will be sent to the LLM.
 * This helps users understand what information the LLM will have access to.
 */
import { App, Modal, TFile } from 'obsidian';
import { ContextBuilder } from './contextBuilder';

/**
 * ContextPreviewModal provides a preview of the context that will be sent to the LLM.
 * This modal helps users understand and verify the information that will inform
 * their thought generation process.
 * 
 * Features:
 * - Shows full context chain
 * - Displays note count and summary
 * - Provides readable preview of actual context
 * - Offers guidance on modifying context
 * 
 * UI Sections:
 * - Header with context summary
 * - Scrollable context preview
 * - Helper note for modification
 * - Error handling display
 * 
 * @extends Modal
 * @example
 * ```typescript
 * new ContextPreviewModal(
 *   app,
 *   contextBuilder,
 *   activeFile,
 *   selectedNotes
 * ).open();
 * ```
 */
export class ContextPreviewModal extends Modal {
    private contextBuilder: ContextBuilder;
    private activeFile: TFile;
    private selectedNotes?: TFile[];
    private onClear?: () => void;

    constructor(
        app: App, 
        contextBuilder: ContextBuilder, 
        activeFile: TFile, 
        selectedNotes?: TFile[],
        onClear?: () => void
    ) {
        super(app);
        this.contextBuilder = contextBuilder;
        this.activeFile = activeFile;
        this.selectedNotes = selectedNotes;
        this.onClear = onClear;
    }

    async onOpen() {
        this.contentEl.addClass('synapse-plugin');
        this.modalEl.addClass('synapse-modal');
        this.modalEl.addClass('context-preview-modal');
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass('context-preview-modal');

        // Header
        const headerEl = contentEl.createDiv('modal-header');
        headerEl.createEl('h2', { text: 'Context Preview' });

        // Loading indicator
        const loadingEl = contentEl.createDiv('loading');
        loadingEl.createEl('span', { text: 'Building context...' });

        try {
            // Get the context that would be sent to the LLM
            const context = this.selectedNotes 
                ? await this.contextBuilder.buildContextFromNotes(this.selectedNotes)
                : await this.contextBuilder.buildContext(this.activeFile);

            // Hide loading indicator
            loadingEl.hide();

            // Show context summary
            const summaryEl = contentEl.createDiv('context-summary');
            const summaryHeader = summaryEl.createDiv('summary-header');
            
            const noteCount = this.selectedNotes?.length || 1; // At least 1 for active file
            const summaryText = summaryHeader.createEl('p', { 
                text: `Context chain includes ${noteCount} note${noteCount > 1 ? 's' : ''}.` 
            });

            // Add clear button if we have selectedNotes and onClear callback
            if (this.selectedNotes && this.selectedNotes.length > 0 && this.onClear) {
                const clearBtn = summaryHeader.createEl('button');
                clearBtn.addClass('clear-context');
                clearBtn.setText('Clear Context');
                clearBtn.onclick = () => {
                    if (this.onClear) {
                        this.onClear();
                        this.close();
                    }
                };
            }

            // Show the actual context
            const previewEl = contentEl.createDiv('context-preview');
            const preEl = previewEl.createEl('pre');
            preEl.createEl('code', { text: context });

            // Add a note about editing
            const noteEl = contentEl.createDiv('context-note');
            noteEl.createEl('p', { 
                text: 'Adjust the context by adding or removing notes from the branch sidebar or the command palette.'
            });
        } catch (error) {
            loadingEl.hide();
            const errorEl = contentEl.createDiv('error');
            errorEl.createEl('p', { 
                text: 'Error building context: ' + (error instanceof Error ? error.message : String(error))
            });
        }

        // Close button
        const footerEl = contentEl.createDiv('modal-footer');
        const closeBtn = footerEl.createEl('button', { text: 'Close' });
        closeBtn.onclick = () => this.close();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
