# Synapse

## The Philosophy

Linear chat logs are terrible for complex thinking. Ideas aren't linear—they branch, fork, and reconnect. Standard AI chatbots force your sprawling thoughts into a narrow, inflexible timeline. When a conversation is over, it's lost in a separate app, disconnected from your actual knowledge base.

**Synapse fixes this.**

It leverages the core strengths of Obsidian—notes as nodes, links as connections—to create a native, non-linear conversational experience with Large Language Models. Each turn in a conversation becomes a new note, automatically linked to its parent. Your train of thought becomes a tangible, navigable, and permanent part of your digital brain.

* **Conversational AI in Your Vault:** Interact with powerful LLMs directly within Obsidian.
* **Automatic Note Creation & Linking:** Every AI response generates a new, linked note, building your thought-tree automatically.
* **Smart Context Building:**
  - **Manual Branching:** Explicitly select which notes to include in the context by following links. Perfect for curating specific thought paths.
  - **Automatic History:** Or let Synapse automatically build context by following the most recent backlinks.
* **Context-Aware History:** Synapse sends the relevant context to the LLM, ensuring coherent and dynamic conversations while saving tokens.
* **Native Graph View Integration:** Visualize your branching conversations in real-time using Obsidian's Graph View.

### Using Branch Context

The Branch feature lets you explicitly choose which notes to include in the conversation:

1. **Start Branching:**
   - Click the Branch button in the ribbon, or
   - Use the "Branch Context" command, or
   - Click Branch in the console view

2. **Build Your Chain:**
   - The modal shows your current note and its connections
   - Click any linked note (inbound or outbound) to add it to the chain
   - Keep selecting notes to build your desired context path
   - The order of selection matters - it's the order the LLM will see

3. **Finish & Connect:**
   - Click "Stop here" when you've selected all desired notes
   - The console opens with your chain ready
   - Type your prompt and click Connect
   - The LLM response includes your curated context

#### Manual Installation (from source)

1.  Clone this repository into your Obsidian vault's plugin folder: `<YourVault>/.obsidian/plugins/synapse`.
2.  Navigate to the plugin directory: `cd <YourVault>/.obsidian/plugins/synapse`.
3.  Install dependencies: `npm install`.
4.  Build the plugin: `npm run build`.
5.  Reload Obsidian, go to `Settings` > `Community plugins`, and enable "Synapse".

## License

[MIT](https://choosealicense.com/licenses/mit/)
