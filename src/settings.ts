import { App, PluginSettingTab, Setting } from 'obsidian';
import SynapsePlugin from '../main';

export interface SynapseSettings {
    geminiApiKey: string;
    apiProvider: string;
	model: string;
    titleModel: string;
    newNoteFolder: string;
    contextDepth: number;
}

export const DEFAULT_SETTINGS: SynapseSettings = {
    geminiApiKey: '',
    apiProvider: 'Gemini',
	model: 'gemini-1.5-flash',
    titleModel: 'gemini-1.5-flash',
    newNoteFolder: '', // Default to root
    contextDepth: 5
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
            .setName('Title Model')
            .setDesc('The LLM model to use for generating titles.')
            .addText(text => text
                .setPlaceholder('e.g., gemini-1.5-flash')
                .setValue(this.plugin.settings.titleModel)
                .onChange(async (value) => {
                    this.plugin.settings.titleModel = value;
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
	}
}
