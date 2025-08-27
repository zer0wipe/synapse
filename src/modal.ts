/**
 * modal.ts
 * 
 * Defines a custom Obsidian modal for capturing user input (prompts).
 * This modal provides a textarea for the user to type their thought and buttons
 * to either submit the prompt or cancel the operation.
 */
import { App, Modal, TextAreaComponent, ButtonComponent } from 'obsidian';

/**
 * A custom modal for user prompt input. It allows the user to enter text
 * and then triggers a callback function with the entered prompt.
 */
export class PromptModal extends Modal {
    // The current value of the prompt entered by the user.
    prompt: string;
    // A callback function to be executed when the prompt is submitted.
    onSubmit: (prompt: string) => void;

    /**
     * Constructs a new PromptModal instance.
     * @param app The Obsidian App instance.
     * @param onSubmit The callback function to run when the prompt is submitted.
     */
    constructor(app: App, onSubmit: (prompt: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
        this.prompt = ""; // Initialize prompt to an empty string.
    }

    /**
     * Called when the modal is opened. Renders the UI elements for the prompt input.
     */
    onOpen() {
        const { contentEl } = this;
        contentEl.addClass("synapse-modal-container"); // Add a class for styling.

        // Create the modal header.
        const header = contentEl.createEl("div", { cls: "synapse-modal-header" });
        header.createEl("h3", { text: "Synapse: Continue thought..." });

        // Create the text area for prompt input.
        const textContainer = contentEl.createEl("div", { cls: "synapse-modal-text-container" });
        const textArea = new TextAreaComponent(textContainer);
        textArea.inputEl.rows = 10;
        textArea.setPlaceholder("Enter your thought here...");
        textArea.onChange((value) => {
            this.prompt = value; // Update the prompt property as the user types.
        });

        // Auto-resize the textarea vertically based on its content.
        textArea.inputEl.addEventListener('input', () => {
            textArea.inputEl.style.height = 'auto';
            textArea.inputEl.style.height = textArea.inputEl.scrollHeight + 'px';
        });

        // Set focus to the textarea when the modal opens for immediate input.
        setTimeout(() => textArea.inputEl.focus(), 0);

        // Create control buttons for the modal.
        const controls = contentEl.createEl("div", { cls: "synapse-modal-controls" });
        
        // "Generate" button to submit the prompt.
        const generateButton = new ButtonComponent(controls);
        generateButton
            .setButtonText("Generate")
            .setCta() // Apply a call-to-action style.
            .onClick(() => {
                if (this.prompt) {
                    this.close(); // Close the modal.
                    this.onSubmit(this.prompt); // Execute the callback with the prompt.
                }
            });
    }

    /**
     * Called when the modal is closed. Clears the modal's content.
     */
    onClose() {
        this.contentEl.empty(); // Clear content to free up resources.
    }
}
