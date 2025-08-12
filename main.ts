import { Plugin, Notice, TFile, WorkspaceLeaf } from 'obsidian';
import { SynapseSettings, DEFAULT_SETTINGS, SynapseSettingTab } from './src/settings';
import { LLMService } from './src/llmService';
import { NoteManager } from './src/noteManager';
import { ContextBuilder } from './src/contextBuilder';
import { SynapseConsoleView, SYNAPSE_VIEW_TYPE } from './src/consoleView';

export default class SynapsePlugin extends Plugin {
	settings!: SynapseSettings;
    llmService!: LLMService;
    noteManager!: NoteManager;
    contextBuilder!: ContextBuilder;

	async onload() {
		// Initialize services first with default settings
        this.initializeServices();

		await this.loadSettings(); // Load user settings, which will then update services
		
        this.loadStyles();

		this.addSettingTab(new SynapseSettingTab(this.app, this));

        // Register the new console view
        this.registerView(
            SYNAPSE_VIEW_TYPE,
            (leaf) => new SynapseConsoleView(leaf, this)
        );

        this.addRibbonIcon('brain-circuit', 'Synapse', () => {
            this.activateView();
        });

		this.addCommand({
			id: 'open-synapse-console',
			name: 'Synapse: Open Console',
            callback: () => {
                this.activateView();
            }
		});
	}

    onunload() {
        const styleEl = document.getElementById('synapse-styles');
        if (styleEl) {
            styleEl.remove();
        }
        this.app.workspace.detachLeavesOfType(SYNAPSE_VIEW_TYPE);
    }

    async loadStyles() {
        const css = await this.app.vault.adapter.read(`${this.app.vault.configDir}/plugins/synapse/src/styles.css`);
        const styleEl = document.createElement('style');
        styleEl.id = 'synapse-styles';
        styleEl.innerHTML = css;
        document.head.appendChild(styleEl);
    }

    initializeServices() {
        // Initialize with default settings first
        this.llmService = new LLMService(DEFAULT_SETTINGS.geminiApiKey, DEFAULT_SETTINGS.apiProvider, DEFAULT_SETTINGS.model, DEFAULT_SETTINGS.titleModel);
        this.noteManager = new NoteManager(this.app);
        this.contextBuilder = new ContextBuilder(this.app, DEFAULT_SETTINGS.contextDepth);
    }

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        // Update services with loaded settings after they've been initialized
        this.llmService.updateModelSettings(this.settings.apiProvider, this.settings.model, this.settings.titleModel);
        this.llmService.updateApiKey(this.settings.geminiApiKey);
        this.contextBuilder.updateSettings(this.settings.contextDepth);
	}

	async saveSettings() {
		await this.saveData(this.settings);
        // Update services with new settings
        this.llmService.updateModelSettings(this.settings.apiProvider, this.settings.model, this.settings.titleModel);
        this.llmService.updateApiKey(this.settings.geminiApiKey);
        this.contextBuilder.updateSettings(this.settings.contextDepth);
	}

    async activateView() {
        this.app.workspace.detachLeavesOfType(SYNAPSE_VIEW_TYPE);

        const leaf = this.app.workspace.getRightLeaf(true); // Get or create a new leaf in the right sidebar
        if (leaf) {
            await leaf.setViewState({
                type: SYNAPSE_VIEW_TYPE,
                active: true,
            });
    
            this.app.workspace.revealLeaf(leaf);
        }
    }

    async processThought(prompt: string, activeFile: TFile) {
        const thinkingNotice = new Notice("Synapse is building context...", 0);

        try {
            // 1. Build Context (The "Train-Shot")
            const context = await this.contextBuilder.buildContext(activeFile);
            thinkingNotice.setMessage("Synapse is generating response...");

            // 2. Generate Response
            const { title, content } = await this.llmService.generateResponse(prompt, context);

            // 3. Create New Note
            const newNote = await this.noteManager.createNote(title, content, this.settings.newNoteFolder, activeFile);

            // 4. Link New Note at Cursor
            await this.noteManager.linkNoteAtCursor(newNote, activeFile);

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
}
