/**
 * main.ts
 * 
 * This is the entry point for the Synapse Obsidian plugin. It orchestrates the plugin's lifecycle,
 * including loading settings, initializing services, registering UI components, and handling the core
 * thought processing workflow.
 */
import { Plugin, Notice, TFile } from 'obsidian';
import { SynapseSettings, DEFAULT_SETTINGS, SynapseSettingTab } from './src/settings';
import { LLMService } from './src/llmService';
import { NoteManager } from './src/noteManager';
import { ContextBuilder } from './src/contextBuilder';
import { SynapseConsoleView, SYNAPSE_VIEW_TYPE } from './src/consoleView';
import { BranchModal } from './src/branchModal';

/**
 * Synapse: An AI-powered thought exploration plugin for Obsidian.
 * 
 * Synapse creates an active environment for growing thoughts within your knowledge graph.
 * It treats notes as evolving conversations with an LLM, enabling organic exploration
 * of ideas through branching context paths.
 * 
 * Core Features:
 * - Thought Generation: Create AI-assisted notes from your knowledge context
 * - Context Branching: Select multiple notes to inform new thoughts
 * - Preview System: Verify context before generation
 * - Flexible Integration: Works with various LLM providers
 * 
 * Architecture:
 * - Services:
 *   - LLMService: Handles AI interaction
 *   - ContextBuilder: Manages context chain creation
 *   - NoteManager: Handles note operations
 * 
 * - UI Components:
 *   - Console View: Main interaction interface
 *   - Branch Modal: Context selection
 *   - Preview Modal: Context verification
 * 
 * Integration Points:
 * - Ribbon icons for quick access
 * - Commands for keyboard control
 * - Settings for customization
 * 
 * @extends Plugin
 * Manages plugin settings, initializes core services, and defines the main logic
 * for processing user thoughts into new, linked notes.
 */
export default class SynapsePlugin extends Plugin {
	// Plugin settings, loaded from data.json
	settings!: SynapseSettings;
    // Service for interacting with Large Language Models (LLMs)
    llmService!: LLMService;
    // Service for managing Obsidian notes (creation, linking)
    noteManager!: NoteManager;
    // Service for building conversational context from linked notes
    contextBuilder!: ContextBuilder;

	/**
	 * Called when the plugin is loaded. Performs all necessary setup.
	 */
	async onload() {
		// Initialize core services with default settings. These will be updated once user settings are loaded.
        this.initializeServices();

		// Load user settings from the plugin's data file. This will also update the services.
		await this.loadSettings();
		
        // Load and apply plugin styles.
        await this.loadStyles();

		// Add the plugin's settings tab to Obsidian's settings pane.
		this.addSettingTab(new SynapseSettingTab(this.app, this));

        // Register the custom Synapse console view, allowing it to be opened in the workspace.
        this.registerView(
            SYNAPSE_VIEW_TYPE,
            (leaf) => new SynapseConsoleView(leaf, this)
        );

        // Add a ribbon icon for the console
        this.addRibbonIcon('brain-circuit', 'Open Synapse Console', () => {
            this.activateView();
        });

        // Add a ribbon icon for branching
        this.addRibbonIcon('git-branch', 'Branch Context', () => {
            this.startBranching();
        });

		// Register the console command
		this.addCommand({
			id: 'open-synapse-console',
			name: 'Open Console',
            callback: () => {
                this.activateView();
            }
		});

        // Register the branch command
        this.addCommand({
            id: 'start-branch',
            name: 'Branch Context',
            callback: () => {
                this.startBranching();
            }
        });
	}

    /**
     * Called when the plugin is unloaded. Performs all necessary cleanup.
     */
    onunload() {
        // Remove the custom styles injected by the plugin.
        const styleEl = document.getElementById('synapse-styles');
        if (styleEl) {
            styleEl.remove();
        }
        // Detach any open Synapse console views from the workspace.
        this.app.workspace.detachLeavesOfType(SYNAPSE_VIEW_TYPE);
    }

    /**
     * Loads the plugin's custom CSS styles.
     * It first attempts to load from the plugin's root directory (for distribution),
     * then falls back to the `src/` directory (for development).
     */
    async loadStyles() {
        const pluginDir = `${this.app.vault.configDir}/plugins/${this.manifest.id}`;
        const candidates = [
            `${pluginDir}/styles.css`,
            `${pluginDir}/src/styles.css`,
        ];
        for (const path of candidates) {
            try {
                const css = await this.app.vault.adapter.read(path);
                const styleEl = document.createElement('style');
                styleEl.id = 'synapse-styles'; // Assign an ID for easy removal on unload
                styleEl.innerHTML = css;
                document.head.appendChild(styleEl);
                return; // Styles loaded successfully, exit loop
            } catch (_) {
                // If loading from this path fails, try the next candidate
            }
        }
    }

    /**
     * Initializes the core services (LLMService, NoteManager, ContextBuilder)
     * with default settings. This is done early to ensure services are always available.
     */
    initializeServices() {
        this.llmService = new LLMService(DEFAULT_SETTINGS);
        this.noteManager = new NoteManager(this.app);
        this.contextBuilder = new ContextBuilder(this.app);
    }

	/**
	 * Loads the plugin's settings from Obsidian's data storage.
	 * Merges loaded settings with default settings and updates initialized services.
	 */
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        // After loading, update the services with the user's configured settings.
        this.llmService.updateSettings(this.settings);
        this.contextBuilder.updateSettings(this.settings.contextDepth);
	}

	/**
	 * Saves the current plugin settings to Obsidian's data storage.
	 * Also updates the services with the newly saved settings.
	 */
	async saveSettings() {
		await this.saveData(this.settings);
        // After saving, update the services to reflect any changes.
        this.llmService.updateSettings(this.settings);
        this.contextBuilder.updateSettings(this.settings.contextDepth);
	}

    /**
     * Activates (opens or reveals) the Synapse console view in the Obsidian workspace.
     * It ensures only one instance of the view is open at a time.
     */
    async activateView() {
        // Detach any existing leaves of the Synapse view type to ensure a fresh view.
        this.app.workspace.detachLeavesOfType(SYNAPSE_VIEW_TYPE);

        // Get or create a new leaf in the right sidebar for the console view.
        const leaf = this.app.workspace.getRightLeaf(true);
        if (leaf) {
            // Set the view state to open the Synapse console.
            await leaf.setViewState({
                type: SYNAPSE_VIEW_TYPE,
                active: true,
            });
    
            // Reveal the leaf to make it visible to the user.
            this.app.workspace.revealLeaf(leaf);
        }
    }

    /**
     * Starts the branching workflow for building context from the active note.
     */
    async startBranching() {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
            new Notice("No active note. Please open a note first.");
            return;
        }

        // Open the branch modal to let the user select notes
        new BranchModal(this.app, activeFile, (selectedNotes) => {
            // When the user finishes selecting notes, build context from them
            this.processThoughtWithBranch(selectedNotes);
        }).open();
    }

    /**
     * Processes a thought using an explicitly selected chain of notes for context.
     * @param notes The array of notes selected by the user for building context.
     */
    async processThoughtWithBranch(notes: TFile[]) {
        if (notes.length === 0) {
            new Notice("No notes selected for context.");
            return;
        }

        const focusNote = notes[0]; // The first note is our focus note
        const thinkingNotice = new Notice("Building context from selected notes...", 0);

        try {
            // Build context string from the selected notes
            let contextString = "";
            for (const note of notes) {
                const content = await this.app.vault.read(note);
                // Remove wiki-links to avoid leaking link noise
                const contentWithoutLinks = content.replace(/\[\[.*?\]\]/g, '');
                contextString += `--- [Note: ${note.basename}] ---\n${contentWithoutLinks}\n\n`;
            }

            thinkingNotice.hide();
            
            // Open/focus the console view to get the prompt
            await this.activateView();
            
            // Get the active console view
            const leaves = this.app.workspace.getLeavesOfType(SYNAPSE_VIEW_TYPE);
            const consoleView = leaves[0]?.view as SynapseConsoleView;
            if (consoleView) {
                consoleView.setSelectedNotes(notes);
            } else {
                new Notice("Failed to open the console view. Please try again.");
            }

        } catch (error) {
            console.error("Synapse Error:", error);
            thinkingNotice.hide();
            if (error instanceof Error) {
                new Notice(`Error: ${error.message}`);
            }
        }
    }

    /**
     * The main thought processing workflow, now supporting both automatic backlink traversal
     * and explicit note selection via branching.
     */
    async processThought(prompt: string, activeFile: TFile, selectedNotes?: TFile[]) {
        const thinkingNotice = new Notice("Building context...", 0);

        try {
            let context: string;

            if (selectedNotes && selectedNotes.length > 0) {
                // Use explicitly selected notes for context
                context = await this.buildBranchedContext(selectedNotes);
            } else {
                // Fall back to automatic backlink traversal
                context = await this.contextBuilder.buildContext(activeFile);
            }

            thinkingNotice.setMessage("Generating response...");

            const { title, content } = await this.llmService.generateResponse(prompt, context);
            const newNote = await this.noteManager.createNote(title, content, this.settings.newNoteFolder, activeFile);
            await this.noteManager.addLinkToNoteFrontmatter(newNote, activeFile);

            thinkingNotice.hide();
            new Notice("Thought expanded. Check your graph view!");

        } catch (error) {
            console.error("Synapse Error:", error);
            thinkingNotice.hide();
            if (error instanceof Error) {
                new Notice(`Error: ${error.message}`);
            }
        }
    }

    /**
     * Builds context from an explicitly selected chain of notes.
     */
    private async buildBranchedContext(notes: TFile[]): Promise<string> {
        // Simply delegate to contextBuilder's new buildContextFromNotes method
        return await this.contextBuilder.buildContextFromNotes(notes);
    }
}
