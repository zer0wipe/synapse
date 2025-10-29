# Synapse

  Synapse turns Obsidian into a branching conversation space for ideas. Each exchange with your LLM becomes a linked note inside your vault, so thinking grows as a graph instead of a flat chat log.

  ## Synapse 2.0 Mindset

  > Context is a living artifact, not a configuration screen.

  - **Action over administration:** Branching happens by doing—linking, writing, selecting—not by pausing for menus.
  - **Leak, don’t plan:** Add notes to the branch opportunistically in the flow of writing and exploring.
  - **Residue of action:** The current branch stays visible as a byproduct of your work, not a hidden toggle.

  ## What’s New in 2.0

  - Dockable Branch sidebar that shows the active chain, supports drag-to-reorder, quick removal, and a clear action.
  - Branch growth by interaction: follow an internal link and the target note joins the branch automatically.
  - Command palette-first workflow for adding, clearing, and revealing the branch.
  - Inline (`Mod+Enter`) and linked-note (`Mod+Shift+Enter`) responses that honor the curated branch context.
  - Context preview modal to audit the exact chain you are about to send.

  ## Core Workflow

  1. Open a seed note and launch the Synapse Console from the ribbon or command palette.
  2. Keep writing—follow backlinks. Each note you touch can “leak” into the Branch sidebar.
  3. Use `Synapse: Add note to branch` when you want explicit control, or drag notes in the sidebar to reorder/remove.
  4. Highlight text and fire `Mod+Enter` for an inline answer or `Mod+Shift+Enter` to spawn a linked note. Synapse sends only the visible branch to your model.
  5. Explore and extend the conversation directly from within your vault.

  ### Branch Sidebar

  - Add by action: opening links or running `Synapse: Add note to branch`.
  - Reorder with drag and drop; remove with the `×` button; clear via command palette.
  - Keep it handy with `Synapse: Show branch` to toggle the dockable pane.

  ### Keyboard-First Commands

  | Command | Default Hotkey | Description |
  | --- | --- | --- |
  | Synapse: Open console | — | Focus the console view in the right sidebar. |
  | Synapse: Add note to branch | — | Append the active note or linked note under cursor. |
  | Synapse: Clear branch | — | Empty the curated branch chain. |
  | Synapse: Show branch | — | Reveal the Branch sidebar view. |
  | Synapse: Inline response from selection | `Mod+Enter` | Send highlighted text; write answer inline. |
  | Synapse: Response in new linked note | `Mod+Shift+Enter` | Generate a new note and link it beneath the selection. |

  ## Configuration

  Open *Settings → Community plugins → Synapse* to tune:

  - **Ollama endpoint** – Base URL for your local or remote Ollama instance.
  - **API provider & model** – Currently supports Ollama; set the model slug to match your install.
  - **New note folder** – Optional folder for generated notes; defaults to the source note’s location.
  - **Context depth** – How many backlink hops to include when auto-building context.
  - **System prompt** – Customize Synapse’s voice and output expectations (title-first by default).

  Keep an Ollama server running with your chosen model pulled (`ollama run mistral`, etc.) so Synapse can connect.

  ## Installation

  1. Clone the plugin into your vault: `<YourVault>/.obsidian/plugins/synapse>`
  2. Install dependencies: `npm install`
  3. Build the plugin: `npm run build`
  4. Reload Obsidian and enable Synapse from *Settings → Community plugins*

  ## License

  [MIT](https://choosealicense.com/licenses/mit/)