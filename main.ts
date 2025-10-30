/**
 * main.ts
 *
 * This is the entry point for the Synapse Obsidian plugin. It orchestrates the plugin's lifecycle,
 * including loading settings, initializing services, registering UI components, and handling the core
 * thought processing workflow.
 */
import { Plugin, Notice, TFile, Editor, WorkspaceLeaf } from "obsidian";
import {
  SynapseSettings,
  DEFAULT_SETTINGS,
  SynapseSettingTab,
} from "./src/settings";
import { LLMService } from "./src/llmService";
import { NoteManager } from "./src/noteManager";
import { ContextBuilder } from "./src/contextBuilder";
import {
  BranchSidebarView,
  SYNAPSE_BRANCH_VIEW_TYPE,
} from "./src/branchSidebar";
import { BranchStore } from "./src/branchStore";
import { ContextPreviewModal } from "./src/contextPreviewModal";

type GeneratedResponse = Awaited<ReturnType<LLMService["generateResponse"]>>;

type SelectionRange = {
  from: { line: number; ch: number };
  to: { line: number; ch: number };
};

type SelectionPayload = {
  prompt: string;
  selectedText: string;
  range: SelectionRange;
};

type SelectionResponseConfig = {
  pendingMessage: string;
  writingMessage?: string;
  successMessage: string;
  handleResponse: (
    response: GeneratedResponse,
    payload: SelectionPayload,
  ) => Promise<void>;
};

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
 *   - Branch Sidebar: Persistent context chain
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
  // Store for managing the active branch chain
  branchStore!: BranchStore;
  // Tracks pending navigation triggered by internal links
  private pendingLinkTargetPath: string | null = null;
  // Remembers previously active file to infer link-based navigation
  private lastActiveFilePath: string | null = null;

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

    this.registerView(
      SYNAPSE_BRANCH_VIEW_TYPE,
      (leaf) => new BranchSidebarView(leaf, this),
    );

    // Add a ribbon icon for quick branch access
    this.addRibbonIcon("git-branch", "Open Synapse Branch", () => {
      void this.showBranchView();
    });

    this.addCommand({
      id: "synapse-add-note-to-branch",
      name: "Add note to branch",
      callback: () => this.addActiveNoteToBranch(),
    });

    this.addCommand({
      id: "synapse-clear-branch",
      name: "Clear branch",
      callback: () => this.branchStore.clear(),
    });

    this.addCommand({
      id: "synapse-show-branch",
      name: "Show branch",
      callback: () => this.showBranchView(),
    });

    this.addCommand({
      id: "synapse-preview-context",
      name: "Preview branch context",
      callback: () => this.previewBranchContext(),
    });

    this.addCommand({
      id: "synapse-inline-response",
      name: "Inline response from selection",
      hotkeys: [{ modifiers: ["Mod"], key: "Enter" }],
      editorCallback: (editor, view) => {
        const file = view?.file;
        const selection = editor.getSelection();
        if (!file) {
          new Notice("No active file. Please open a note first.");
          return;
        }
        this.generateInlineResponse(editor, file);
      },
    });

    this.addCommand({
      id: "synapse-note-response",
      name: "Response in new linked note",
      hotkeys: [{ modifiers: ["Mod", "Shift"], key: "Enter" }],
      editorCallback: (editor, view) => {
        const file = view?.file;
        const selection = editor.getSelection();
        if (!file) {
          new Notice("No active file. Please open a note first.");
          return;
        }
        if (!selection || selection.trim().length === 0) {
          new Notice("Highlight text first, then press Ctrl/Cmd+Shift+Enter.");
          return;
        }
        this.generateLinkedNoteResponse(editor, file);
      },
    });

    const initialFile = this.app.workspace.getActiveFile();
    this.lastActiveFilePath = initialFile?.path ?? null;
    this.registerEvent(
      this.app.workspace.on("file-open", async (file) => {
        if (!file) {
          return;
        }

        if (
          this.pendingLinkTargetPath &&
          file.path === this.pendingLinkTargetPath
        ) {
          this.branchStore.add(file);
          await this.showBranchView();
          this.pendingLinkTargetPath = null;
        } else if (this.lastActiveFilePath) {
          const linksFromPrevious =
            this.app.metadataCache.resolvedLinks[this.lastActiveFilePath] ?? {};
          if (linksFromPrevious[file.path]) {
            this.branchStore.add(file);
            await this.showBranchView();
          }
        }

        this.lastActiveFilePath = file.path;
      }),
    );

    this.registerDomEvent(document, "click", (event) => {
      this.handleInternalLinkClick(event);
    });
  }

  /**
   * Called when the plugin is unloaded. Performs all necessary cleanup.
   */
  onunload() {
    // Remove the custom styles injected by the plugin.
    const styleEl = document.getElementById("synapse-styles");
    if (styleEl) {
      styleEl.remove();
    }
    // Detach any open Synapse branch views from the workspace.
    this.app.workspace.detachLeavesOfType(SYNAPSE_BRANCH_VIEW_TYPE);
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
        const styleEl = document.createElement("style");
        styleEl.id = "synapse-styles"; // Assign an ID for easy removal on unload
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
    this.branchStore = new BranchStore();
  }

  /**
   * Loads the plugin's settings from Obsidian's data storage.
   * Merges loaded settings with default settings and updates initialized services.
   */
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    // After loading, update the services with the user's configured settings.
    this.llmService.updateSettings(this.settings);
    this.contextBuilder.updateSettings({
      contextDepth: this.settings.contextDepth,
      autoContextMaxNotes: this.settings.autoContextMaxNotes,
    });
  }

  /**
   * Saves the current plugin settings to Obsidian's data storage.
   * Also updates the services with the newly saved settings.
   */
  async saveSettings() {
    await this.saveData(this.settings);
    // After saving, update the services to reflect any changes.
    this.llmService.updateSettings(this.settings);
    this.contextBuilder.updateSettings({
      contextDepth: this.settings.contextDepth,
      autoContextMaxNotes: this.settings.autoContextMaxNotes,
    });
  }

  /**
   * The main thought processing workflow, now supporting both automatic backlink traversal
   * and explicit note selection via branching.
   */
  async processThought(
    prompt: string,
    activeFile: TFile,
    selectedNotes?: TFile[],
  ) {
    const thinkingNotice = new Notice("Building context...", 0);

    try {
      let context: string;

      if (selectedNotes && selectedNotes.length > 0) {
        // Use explicitly selected notes for context
        context = await this.buildBranchedContext(selectedNotes);
      } else if (this.branchStore.getBranch().length > 0) {
        context = await this.buildBranchedContext(
          this.branchStore.getBranch().map((entry) => entry.file),
        );
      } else {
        // Fall back to automatic backlink traversal
        context = await this.contextBuilder.buildAutoContext(activeFile);
      }

      thinkingNotice.setMessage("Generating response...");

      const { title, content } = await this.llmService.generateResponse(
        prompt,
        context,
      );
      const newNote = await this.noteManager.createNote(
        title,
        content,
        this.settings.newNoteFolder,
        activeFile,
      );

      this.branchStore.add(newNote);
      await this.showBranchView();

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

  public async addActiveNoteToBranch() {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice("No active note. Please open a note first.");
      return;
    }
    this.branchStore.add(activeFile);
    await this.showBranchView();
    new Notice(`${activeFile.basename} added to branch.`);
  }

  private async showBranchView() {
    let leaf: WorkspaceLeaf | null =
      this.app.workspace.getLeavesOfType(SYNAPSE_BRANCH_VIEW_TYPE)[0] ?? null;

    if (!leaf) {
      const rightLeaf =
        this.app.workspace.getRightLeaf(false) ??
        this.app.workspace.getRightLeaf(true);
      if (!rightLeaf) {
        return;
      }
      leaf = rightLeaf;
      await leaf.setViewState({
        type: SYNAPSE_BRANCH_VIEW_TYPE,
        active: true,
      });
    }

    if (!leaf) {
      return;
    }

    this.app.workspace.revealLeaf(leaf);
  }

  private async previewBranchContext() {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      new Notice("No active file to preview context from.");
      return;
    }

    const branchEntries = this.branchStore.getBranch();
    new ContextPreviewModal(
      this.app,
      this.contextBuilder,
      activeFile,
      branchEntries.length > 0
        ? branchEntries.map((entry) => entry.file)
        : undefined,
      () => {
        this.branchStore.clear();
        new Notice("Context chain cleared");
      },
    ).open();
  }

  private async generateInlineResponse(editor: Editor, file?: TFile | null) {
    if (!file) {
      new Notice("No active file. Please open a note first.");
      return;
    }

    await this.processSelectionResponse(editor, file, {
      pendingMessage: "Generating inline response...",
      writingMessage: "Writing response...",
      successMessage: "Inline response inserted.",
      handleResponse: async (response, payload) => {
        const inlineText = response.content?.trim().length
          ? response.content.trim()
          : response.raw.trim();
        editor.replaceRange(
          `${payload.selectedText}\n\n${inlineText}\n`,
          payload.range.from,
          payload.range.to,
        );
      },
    });
  }

  private async generateLinkedNoteResponse(
    editor: Editor,
    file?: TFile | null,
  ) {
    if (!file) {
      new Notice("No active file. Please open a note first.");
      return;
    }

    await this.processSelectionResponse(editor, file, {
      pendingMessage: "Generating linked note...",
      writingMessage: "Creating note...",
      successMessage: "Response saved as new note.",
      handleResponse: async (response, payload) => {
        const newNote = await this.noteManager.createNote(
          response.title,
          response.content,
          this.settings.newNoteFolder,
          file,
        );

        const linkText = this.app.fileManager.generateMarkdownLink(
          newNote,
          file.path,
        );
        editor.replaceRange(
          `${payload.selectedText}\n\n${linkText}\n`,
          payload.range.from,
          payload.range.to,
        );

        this.branchStore.add(newNote);
        await this.showBranchView();
      },
    });
  }

  private async generateResponse(prompt: string, activeFile: TFile) {
    let context: string;
    const branchEntries = this.branchStore.getBranch();
    if (branchEntries.length > 0) {
      context = await this.buildBranchedContext(
        branchEntries.map((entry) => entry.file),
      );
    } else {
      context = await this.contextBuilder.buildAutoContext(activeFile);
    }

    return await this.llmService.generateResponse(prompt, context);
  }

  private getSelectionPayload(editor: Editor): SelectionPayload | null {
    const selectedText = editor.getSelection();
    const prompt = selectedText.trim();
    if (!prompt) {
      new Notice("Select text to send as a prompt.");
      return null;
    }

    const from = editor.getCursor("from");
    const to = editor.getCursor("to");
    return {
      prompt,
      selectedText,
      range: {
        from: { line: from.line, ch: from.ch },
        to: { line: to.line, ch: to.ch },
      },
    };
  }

  private async processSelectionResponse(
    editor: Editor,
    file: TFile,
    config: SelectionResponseConfig,
  ) {
    const payload = this.getSelectionPayload(editor);
    if (!payload) {
      return;
    }

    const notice = new Notice(config.pendingMessage, 0);
    try {
      if (!this.isSelectionIntact(editor, payload)) {
        notice.hide();
        new Notice("Selection changed before response could be generated.");
        return;
      }

      const response = await this.generateResponse(payload.prompt, file);
      if (config.writingMessage) {
        notice.setMessage(config.writingMessage);
      }

      if (!this.isSelectionIntact(editor, payload)) {
        notice.hide();
        new Notice("Selection changed while generating the response.");
        return;
      }

      await config.handleResponse(response, payload);
      notice.hide();
      new Notice(config.successMessage);
    } catch (error) {
      console.error("Synapse Error:", error);
      notice.hide();
      if (error instanceof Error) {
        new Notice(`Error: ${error.message}`);
      }
    }
  }

  private isSelectionIntact(
    editor: Editor,
    payload: SelectionPayload,
  ): boolean {
    const current = editor.getRange(payload.range.from, payload.range.to);
    return current === payload.selectedText;
  }

  private handleInternalLinkClick(event: MouseEvent) {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }

    const linkEl = event.target.closest("a.internal-link");
    if (!(linkEl instanceof HTMLElement)) {
      return;
    }

    const activeFile = this.app.workspace.getActiveFile();
    const linkTarget =
      linkEl.getAttribute("data-href") || linkEl.getAttribute("href");
    if (!linkTarget || !activeFile) {
      return;
    }

    const destination = this.app.metadataCache.getFirstLinkpathDest(
      linkTarget,
      activeFile.path,
    );
    if (destination instanceof TFile) {
      this.pendingLinkTargetPath = destination.path;
      this.branchStore.add(destination);
    }
  }
}
