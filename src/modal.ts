import { App, Modal, TextAreaComponent, ButtonComponent } from 'obsidian';

export class PromptModal extends Modal {
    prompt: string;
    onSubmit: (prompt: string) => void;

    constructor(app: App, onSubmit: (prompt: string) => void) {
        super(app);
        this.onSubmit = onSubmit;
        this.prompt = "";
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass("synapse-modal-container");

        const header = contentEl.createEl("div", { cls: "synapse-modal-header" });
        header.createEl("h3", { text: "Synapse: Continue thought..." });

        const textContainer = contentEl.createEl("div", { cls: "synapse-modal-text-container" });
        const textArea = new TextAreaComponent(textContainer);
        textArea.inputEl.rows = 10;
        textArea.setPlaceholder("Enter your thought here...");
        textArea.onChange((value) => {
            this.prompt = value;
        });

        textArea.inputEl.addEventListener('input', () => {
            textArea.inputEl.style.height = 'auto';
            textArea.inputEl.style.height = textArea.inputEl.scrollHeight + 'px';
        });

        setTimeout(() => textArea.inputEl.focus(), 0);

        const controls = contentEl.createEl("div", { cls: "synapse-modal-controls" });
        const generateButton = new ButtonComponent(controls);
        generateButton
            .setButtonText("Generate")
            .setCta()
            .onClick(() => {
                if (this.prompt) {
                    this.close();
                    this.onSubmit(this.prompt);
                }
            });
    }

    onClose() {
        this.contentEl.empty();
    }
}
