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

/**
 * The main class for the Synapse plugin. Extends Obsidian's Plugin class.
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

        // Add a ribbon icon to the Obsidian sidebar to quickly open the Synapse console.
        this.addRibbonIcon('brain-circuit', 'Synapse', () => {
            this.activateView();
        });

		// Register a command to open the Synapse console via the command palette.
		this.addCommand({
			id: 'open-synapse-console',
			name: 'Synapse: Open Console',
            callback: () => {
                this.activateView();
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
        this.llmService = new LLMService(DEFAULT_SETTINGS.geminiApiKey, DEFAULT_SETTINGS.apiProvider, DEFAULT_SETTINGS.model, DEFAULT_SETTINGS.titleModel, DEFAULT_SETTINGS.systemPrompt);
        this.noteManager = new NoteManager(this.app);
        this.contextBuilder = new ContextBuilder(this.app, DEFAULT_SETTINGS.contextDepth);
    }

	/**
	 * Loads the plugin's settings from Obsidian's data storage.
	 * Merges loaded settings with default settings and updates initialized services.
	 */
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        // After loading, update the services with the user's configured settings.
        this.llmService.updateModelSettings(this.settings.apiProvider, this.settings.model, this.settings.titleModel, this.settings.systemPrompt);
        this.llmService.updateApiKey(this.settings.geminiApiKey);
        this.contextBuilder.updateSettings(this.settings.contextDepth);
	}

	/**
	 * Saves the current plugin settings to Obsidian's data storage.
	 * Also updates the services with the newly saved settings.
	 */
	async saveSettings() {
		await this.saveData(this.settings);
        // After saving, update the services to reflect any changes.
        this.llmService.updateModelSettings(this.settings.apiProvider, this.settings.model, this.settings.titleModel, this.settings.systemPrompt);
        this.llmService.updateApiKey(this.settings.geminiApiKey);
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
     * Orchestrates the main thought processing workflow.
     * This involves building context, generating an LLM response, creating a new note,
     * and linking it to the active note via frontmatter.
     * @param prompt The user's input prompt for the LLM.
     * @param activeFile The currently active Obsidian note (the source of the thought).
     */
    async processThought(prompt: string, activeFile: TFile) {
        // Display a notice to the user indicating that context is being built.
        const thinkingNotice = new Notice("Synapse is building context...", 0);

        try {
            // 1. Build Context: Gather relevant information from linked notes to provide to the LLM.
            const context = await this.contextBuilder.buildContext(activeFile);
            thinkingNotice.setMessage("Synapse is generating response...");

            // 2. Generate Response: Send the prompt and context to the LLM to get a title and content for the new note.
            const { title, content } = await this.llmService.generateResponse(prompt, context);

            // 3. Create New Note: Create a new Obsidian note with the generated title and content.
            const newNote = await this.noteManager.createNote(title, content, this.settings.newNoteFolder, activeFile);

            // 4. Link New Note in Frontmatter: Add a link to the newly created note in the source note's frontmatter.
            await this.noteManager.addLinkToNoteFrontmatter(newNote, activeFile);

            // Hide the thinking notice and show a success message.
            thinkingNotice.hide();
            new Notice("Thought expanded. Check your graph view!");

        } catch (error) {
            // Handle any errors during the thought processing, displaying a notice to the user.
            console.error("Synapse Error:", error);
            thinkingNotice.hide();
            if (error instanceof Error) {
                new Notice(`Error: ${error.message}`);
            }
        }
    }
}
