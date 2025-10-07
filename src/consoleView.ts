/**
 * consoleView.ts
 * 
 * Defines the custom Obsidian view for the Synapse console. This view provides the user
 * interface for interacting with the Synapse plugin, allowing them to input prompts
 * and trigger the thought processing workflow.
 */
import { ItemView, WorkspaceLeaf, Setting, Notice, ButtonComponent, TFile } from 'obsidian';
import SynapsePlugin from '../main';
import { LLMService } from './llmService';
import { ContextBuilder } from './contextBuilder';
import { NoteManager } from './noteManager';
import { ContextPreviewModal } from './contextPreviewModal';

/**
 * The unique identifier for the Synapse console view type.
 */
/**
 * The unique identifier for the Synapse console view.
 * Used for view registration and retrieval in Obsidian's view system.
 */
export const SYNAPSE_VIEW_TYPE = "synapse-console-view";

/**
 * SynapseConsoleView implements the main interface for thought generation.
 * This view serves as the primary interaction point for users, providing
 * a clean, focused environment for developing thoughts with AI assistance.
 * 
 * Core Features:
 * - Prompt input with auto-resize
 * - Context preview functionality
 * - Branching context selection
 * - Direct thought generation
 * 
 * UI Components:
 * - Text input area
 * - Action buttons:
 *   - Preview: Show context chain
 *   - Branch: Select context notes
 *   - Connect: Generate thought
 *   - Nevermind: Cancel operation
 * 
 * State Management:
 * - Tracks selected notes for branching
 * - Maintains input state
 * - Handles view lifecycle
 * 
 * @extends ItemView
 * @example
 * ```typescript
 * const view = new SynapseConsoleView(leaf, plugin);
 * await view.onOpen(); // Initialize view
 * ```
 */

/**
 * Represents the Synapse console view, extending Obsidian's ItemView.
 * It provides an input area for prompts and buttons to trigger actions.
 */
export class SynapseConsoleView extends ItemView {
    // Reference to the main plugin instance
    plugin: SynapsePlugin;
    // HTML element for the prompt input area
    promptInput!: HTMLTextAreaElement;
    // Instance of the LLM service for generating responses
    llmService: LLMService;
    // Instance of the context builder service
    contextBuilder: ContextBuilder;
    // Instance of the note manager service
    noteManager: NoteManager;
    // Array of selected notes for branching context
    selectedNotes?: TFile[];

    /**
     * Constructs a new SynapseConsoleView.
     * @param leaf The workspace leaf this view belongs to.
     * @param plugin The main Synapse plugin instance.
     */
    constructor(leaf: WorkspaceLeaf, plugin: SynapsePlugin) {
        super(leaf);
        this.plugin = plugin;
        // Services are passed from the main plugin to ensure they use the same instances and settings.
        this.llmService = plugin.llmService;
        this.contextBuilder = plugin.contextBuilder;
        this.noteManager = plugin.noteManager;
    }

    /**
     * Returns the unique view type for this console view.
     * @returns The view type string.
     */
    getViewType(): string {
        return SYNAPSE_VIEW_TYPE;
    }

    /**
     * Returns the display name for this view, shown in the Obsidian UI.
     * @returns The display name string.
     */
    getDisplayText(): string {
        return "Synapse";
    }

    /**
     * Called when the view is opened. Renders the UI elements for the console.
     */
    async onOpen() {
        const { contentEl } = this;
        contentEl.empty(); // Clear any existing content
        contentEl.addClass("synapse-plugin"); // Add main plugin class for scoping
        contentEl.addClass("synapse-console"); // Add console view class

        // Create a container for the prompt input area.
        const container = contentEl.createEl("div", { cls: "synapse-console-content" });
        
        // Add textarea
        this.promptInput = container.createEl("textarea");
        this.promptInput.rows = 5;
        this.promptInput.placeholder = "Enter your thought here...";
        // Auto-resize the textarea based on content.
        this.promptInput.addEventListener('input', () => {
            this.promptInput.style.height = 'auto';
            this.promptInput.style.height = this.promptInput.scrollHeight + 'px';
        });

        // Create a container for control buttons directly after textarea
        const controls = container.createEl("div", { cls: "synapse-console-controls" });
        
        // Add spacer to push any remaining space to the bottom
        container.createEl("div", { cls: "synapse-console-spacer" });
        
        // "Nevermind" button to clear the prompt and close the view.
        const nevermindButton = new ButtonComponent(controls);
        nevermindButton
            .setButtonText("Nevermind")
            .setClass("synapse-button")
            .onClick(() => {
                this.clearPrompt();
                this.selectedNotes = undefined; // Clear selected notes
                this.leaf.detach(); // Close the view
            });

        // "Preview Context" button to show the context preview modal
        const previewButton = new ButtonComponent(controls);
        previewButton
            .setButtonText("Preview Context")
            .setClass("synapse-button")
            .setIcon("eye")
            .onClick(() => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) {
                    new Notice("No active file to preview context from.");
                    return;
                }
                new ContextPreviewModal(
                    this.app,
                    this.contextBuilder,
                    activeFile,
                    this.selectedNotes,
                    () => {
                        this.selectedNotes = [];
                        new Notice("Context chain cleared");
                    }
                ).open();
            });

        // "Branch" button to start the branching workflow
        const branchButton = new ButtonComponent(controls);
        branchButton
            .setButtonText("Branch")
            .setClass("synapse-button")
            .setIcon("git-branch")
            .onClick(() => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) {
                    new Notice("No active note. Please open a note first.");
                    return;
                }
                this.plugin.startBranching();
            });

        // "Connect" button to process the prompt.
        const connectButton = new ButtonComponent(controls);
        connectButton
            .setButtonText("Connect")
            .setClass("synapse-button")
            .setCta() // Apply a call-to-action style
            .onClick(() => {
                this.processPrompt();
            });
    }

    /**
     * Called when the view is closed. Performs any necessary cleanup.
     */
    async onClose() {
        // Clear any selected notes when the view is closed
        this.selectedNotes = undefined;
    }

    /**
     * Clears the text from the prompt input area.
     */
    clearPrompt() {
        this.promptInput.value = "";
    }

    /**
     * Processes the user's prompt.
     * It retrieves the prompt, clears the input, checks for an active file,
     * and then delegates the actual thought processing to the main plugin instance.
     * @param selectedNotes Optional array of notes selected through branching
     */
    async processPrompt() {
        const prompt = this.promptInput.value;
        if (!prompt) return; // Do not process empty prompts

        this.clearPrompt(); // Clear input immediately after submission for better UX

        // Ensure there is an active file to link the new thought to.
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice("No active file. Please open a note to continue your thought.");
            return;
        }

        // Delegate the core thought processing logic to the main plugin.
        // This keeps the view focused on UI and input handling.
        this.plugin.processThought(prompt, activeFile, this.selectedNotes);
        
        // Clear the selected notes after processing
        this.selectedNotes = undefined;
    }
    
    /**
     * Sets the array of selected notes for branched context building.
     * @param notes The array of notes selected through the branching modal.
     */
    setSelectedNotes(notes: TFile[]) {
        this.selectedNotes = notes;
    }
}
