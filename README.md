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

#### Manual Installation (from source)

1.  Clone this repository into your Obsidian vault's plugin folder: `<YourVault>/.obsidian/plugins/synapse`.
2.  Navigate to the plugin directory: `cd <YourVault>/.obsidian/plugins/synapse`.
3.  Install dependencies: `npm install`.
4.  Build the plugin: `npm run build`.
5.  Reload Obsidian, go to `Settings` > `Community plugins`, and enable "Synapse".

## License

[MIT](https://choosealicense.com/licenses/mit/)
