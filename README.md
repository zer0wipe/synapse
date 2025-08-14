# Synapse

## The Philosophy

Linear chat logs are terrible for complex thinking. Ideas aren't linear—they branch, fork, and reconnect. Standard AI chatbots force your sprawling thoughts into a narrow, inflexible timeline. When a conversation is over, it's lost in a separate app, disconnected from your actual knowledge base.

**Synapse fixes this.**

It leverages the core strengths of Obsidian—notes as nodes, links as connections—to create a native, non-linear conversational experience with Large Language Models. Each turn in a conversation becomes a new note, automatically linked to its parent. Your train of thought becomes a tangible, navigable, and permanent part of your digital brain.

* **Conversational AI in Your Vault:** Interact with powerful LLMs directly within Obsidian.
* **Automatic Note Creation & Linking:** Every AI response generates a new, linked note, building your thought-tree automatically.
* **Effortless Branching & Forking:** Explore different lines of thought simply by prompting from any previous note. The old paths remain intact.
* **Context-Aware History:** Synapse automatically sends the current branch's history to the LLM, ensuring relevant and dynamic context while saving tokens and cost.
* **Native Graph View Integration:** Visualize your branching conversations in real-time using Obsidian's Graph View.

## Installation

#### From the Community Plugins Store (Recommended)

1.  Go to `Settings` > `Community plugins`.
2.  Make sure `Restricted mode` is **off**.
3.  Click `Browse` and search for "Synapse".
4.  Click `Install`, and then once it's finished, click `Enable`.

#### Manual Installation

1.  Download the latest release from the [Releases page](https://github.com/zer0wipe/Synapse/releases) on GitHub.
2.  Unzip the downloaded file.
3.  Copy the unzipped folder into your Obsidian vault's plugin folder: `<YourVault>/.obsidian/plugins/`.
4.  Reload Obsidian, go to `Settings` > `Community plugins`, and enable "Synapse".

### Configuration

1.  After enabling the plugin, go to the **Synapse** tab in the `Settings` window.
2.  **Select your LLM Provider** Currently only Gemini.
3.  **Enter your API Key.** This is stored locally and securely on your machine.
4.  Choose your preferred AI Model from the dropdown 
5.  Configure your preferred hotkey for triggering Synapse for a seamless workflow.

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License

[MIT](https://choosealicense.com/licenses/mit/)
