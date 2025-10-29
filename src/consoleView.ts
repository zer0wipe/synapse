/**
 * consoleView.ts
 * 
 * Defines the custom Obsidian view for the Synapse console. This view provides the user
 * interface for interacting with the Synapse plugin, allowing them to input prompts
 * and trigger the thought processing workflow.
 */
import { ItemView, WorkspaceLeaf, Notice, ButtonComponent, TFile } from 'obsidian';
import SynapsePlugin from '../main';
import { ContextBuilder } from './contextBuilder';
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
 * - Quick branch additions from the active note
 * - Direct thought generation
 * 
 * UI Components:
 * - Text input area
 * - Action buttons:
 *   - Preview: Show context chain
 *   - Branch: Add the active note to the branch chain
 *   - Connect: Generate thought
 *   - Nevermind: Cancel operation
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
    // Instance of the context builder service
    contextBuilder: ContextBuilder;

    /**
     * Constructs a new SynapseConsoleView.
     * @param leaf The workspace leaf this view belongs to.
     * @param plugin The main Synapse plugin instance.
     */
    constructor(leaf: WorkspaceLeaf, plugin: SynapsePlugin) {
        super(leaf);
        this.plugin = plugin;
        // Services are passed from the main plugin to ensure they use the same instances and settings.
        this.contextBuilder = plugin.contextBuilder;
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
                const branchEntries = this.plugin.branchStore.getBranch();
                new ContextPreviewModal(
                    this.app,
                    this.contextBuilder,
                    activeFile,
                    branchEntries.length > 0 ? branchEntries.map(entry => entry.file) : undefined,
                    () => {
                        this.plugin.branchStore.clear();
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
                this.plugin.addActiveNoteToBranch();
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
     * Clears the text from the prompt input area.
     */
    clearPrompt() {
        this.promptInput.value = "";
    }

    /**
     * Processes the user's prompt.
     * It retrieves the prompt, clears the input, checks for an active file,
     * and then delegates the actual thought processing to the main plugin instance.
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
        this.plugin.processThought(prompt, activeFile);
    }
}
