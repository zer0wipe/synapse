import { ItemView, WorkspaceLeaf, Setting, Notice, ButtonComponent } from 'obsidian';
import SynapsePlugin from '../main';
import { LLMService } from './llmService';
import { ContextBuilder } from './contextBuilder';
import { NoteManager } from './noteManager';

export const SYNAPSE_VIEW_TYPE = "synapse-console-view";

export class SynapseConsoleView extends ItemView {
    plugin: SynapsePlugin;
    promptInput!: HTMLTextAreaElement;
    llmService: LLMService;
    contextBuilder: ContextBuilder;
    noteManager: NoteManager;

    constructor(leaf: WorkspaceLeaf, plugin: SynapsePlugin) {
        super(leaf);
        this.plugin = plugin;
        this.llmService = plugin.llmService;
        this.contextBuilder = plugin.contextBuilder;
        this.noteManager = plugin.noteManager;
    }

    getViewType(): string {
        return SYNAPSE_VIEW_TYPE;
    }

    getDisplayText(): string {
        return "Synapse";
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass("synapse-console-view");

        const textContainer = contentEl.createEl("div", { cls: "synapse-modal-text-container" });
        this.promptInput = textContainer.createEl("textarea");
        this.promptInput.rows = 5;
        this.promptInput.placeholder = "Enter your thought here...";
        this.promptInput.addEventListener('input', () => {
            this.promptInput.style.height = 'auto';
            this.promptInput.style.height = this.promptInput.scrollHeight + 'px';
        });

        const controls = contentEl.createEl("div", { cls: "synapse-modal-controls" });
        const nevermindButton = new ButtonComponent(controls);
        nevermindButton
            .setButtonText("Nevermind")
            .onClick(() => {
                this.clearPrompt();
                this.leaf.detach();
            });

        const connectButton = new ButtonComponent(controls);
        connectButton
            .setButtonText("Connect")
            .setCta()
            .onClick(() => {
                this.processPrompt();
            });
    }

    async onClose() {
        // Clean up resources if any
    }

    clearPrompt() {
        this.promptInput.value = "";
    }

    async processPrompt() {
        const prompt = this.promptInput.value;
        if (!prompt) return; // Don't process empty prompts

        this.clearPrompt(); // Clear input after submission

        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice("No active file. Please open a note to continue your thought.");
            return;
        }

        // Re-using the processThought logic from main.ts
        this.plugin.processThought(prompt, activeFile);
    }
}
