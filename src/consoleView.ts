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

/**
 * The unique identifier for the Synapse console view type.
 */
export const SYNAPSE_VIEW_TYPE = "synapse-console-view";

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
        contentEl.addClass("synapse-console-view"); // Add a class for styling

        // Create a container for the prompt input area.
        const textContainer = contentEl.createEl("div", { cls: "synapse-modal-text-container" });
        this.promptInput = textContainer.createEl("textarea");
        this.promptInput.rows = 5;
        this.promptInput.placeholder = "Enter your thought here...";
        // Auto-resize the textarea based on content.
        this.promptInput.addEventListener('input', () => {
            this.promptInput.style.height = 'auto';
            this.promptInput.style.height = this.promptInput.scrollHeight + 'px';
        });

        // Create a container for control buttons.
        const controls = contentEl.createEl("div", { cls: "synapse-modal-controls" });
        
        // "Nevermind" button to clear the prompt and close the view.
        const nevermindButton = new ButtonComponent(controls);
        nevermindButton
            .setButtonText("Nevermind")
            .onClick(() => {
                this.clearPrompt();
                this.leaf.detach(); // Close the view
            });

        // "Branch" button to start the branching workflow
        const branchButton = new ButtonComponent(controls);
        branchButton
            .setButtonText("Branch")
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
            .setCta() // Apply a call-to-action style
            .onClick(() => {
                this.processPrompt();
            });
    }

    /**
     * Called when the view is closed. Performs any necessary cleanup.
     */
    async onClose() {
        // No specific resources to clean up at the moment.
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
    }
    
    /**
     * Sets the array of selected notes for branched context building.
     * @param notes The array of notes selected through the branching modal.
     */
    setSelectedNotes(notes: TFile[]) {
        this.selectedNotes = notes;
    }
}
