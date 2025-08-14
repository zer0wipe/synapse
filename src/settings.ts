import { App, PluginSettingTab, Setting } from 'obsidian';
import SynapsePlugin from '../main';

export interface SynapseSettings {
    geminiApiKey: string;
    apiProvider: string;
	model: string;
    titleModel: string;
    newNoteFolder: string;
    contextDepth: number;
    systemPrompt: string;
}

export const DEFAULT_SETTINGS: SynapseSettings = {
    geminiApiKey: '',
    apiProvider: 'Gemini',
	model: 'gemini-1.5-flash',
    titleModel: 'gemini-1.5-flash',
    newNoteFolder: '', // Default to root
    contextDepth: 5,
    systemPrompt: `You are Synapse, an AI assistant embedded within a knowledge graph (Obsidian). 
The user is expanding their thoughts. Analyze the provided context (a chain of previous notes) and respond to the latest prompt. 
Your response will be saved as a new, linked note. Be insightful and continue the line of reasoning.
The first line of your response should be a concise, descriptive title (5-10 words) for the note. The rest of the response should be the content of the note.`
}

export class SynapseSettingTab extends PluginSettingTab {
	plugin: SynapsePlugin;

	constructor(app: App, plugin: SynapsePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

        new Setting(containerEl)
            .setName('Gemini API Key')
            .setDesc('Enter your Gemini API key.')
            .addText(text => text
                .setPlaceholder('Enter your secret key')
                .setValue(this.plugin.settings.geminiApiKey)
                .onChange(async (value) => {
                    this.plugin.settings.geminiApiKey = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('API Provider')
            .setDesc('Select the API provider for the LLM.')
            .addDropdown(dropdown => dropdown
                .addOption('Gemini', 'Gemini')
                .setValue(this.plugin.settings.apiProvider)
                .onChange(async (value) => {
                    this.plugin.settings.apiProvider = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Primary Model')
            .setDesc('The LLM model to use for generating responses.')
            .addText(text => text
                .setPlaceholder('e.g., gemini-1.5-flash')
                .setValue(this.plugin.settings.model)
                .onChange(async (value) => {
                    this.plugin.settings.model = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('New Note Folder')
            .setDesc('The folder where new conversation notes will be created. If empty, notes will be created in the same folder as the source note.')
            .addText(text => text
                .setPlaceholder('e.g., Synapse Conversations')
                .setValue(this.plugin.settings.newNoteFolder)
                .onChange(async (value) => {
                    this.plugin.settings.newNoteFolder = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Context Depth')
            .setDesc('How many levels of backlinks to traverse to build the conversation history.')
            .addSlider(slider => slider
                .setLimits(1, 15, 1)
                .setValue(this.plugin.settings.contextDepth)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.contextDepth = value;
                    await this.plugin.saveSettings();
                }));

        const systemPromptSetting = new Setting(containerEl)
            .setName('System Prompt')
            .setDesc('Define the system prompt for the AI assistant. This sets the AI\'s persona and instructions.');

        systemPromptSetting.settingEl.style.flexDirection = 'column';
        systemPromptSetting.settingEl.style.alignItems = 'flex-start'; // Align items to the start when column
        systemPromptSetting.controlEl.style.width = '100%'; // Make the control element fill the width

        systemPromptSetting.addTextArea(text => {
            text
                .setPlaceholder('You are Synapse, an AI assistant...')
                .setValue(this.plugin.settings.systemPrompt)
                .onChange(async (value) => {
                    this.plugin.settings.systemPrompt = value;
                    await this.plugin.saveSettings();
                });
            text.inputEl.style.width = '100%';
            text.inputEl.style.marginTop = '10px';
            text.inputEl.style.height = 'auto'; // Set initial height to auto
            text.inputEl.style.overflowY = 'hidden'; // Hide scrollbar initially
            text.inputEl.addEventListener('input', () => {
                text.inputEl.style.height = 'auto';
                text.inputEl.style.height = text.inputEl.scrollHeight + 'px';
            });
        });
	}
}
