import { request, RequestUrlParam, Notice } from 'obsidian';

export class LLMService {
    private apiKey: string;
    private apiProvider: string;
    private model: string;
    private titleModel: string;
    private systemPrompt: string;

    constructor(apiKey: string, apiProvider: string, model: string, titleModel: string, systemPrompt: string) {
        this.apiKey = apiKey;
        this.apiProvider = apiProvider;
        this.model = model;
        this.titleModel = titleModel;
        this.systemPrompt = systemPrompt;
    }

    public updateApiKey(apiKey: string) {
        this.apiKey = apiKey;
    }

    public updateModelSettings(apiProvider: string, model: string, titleModel: string, systemPrompt: string) {
        this.apiProvider = apiProvider;
        this.model = model;
        this.titleModel = titleModel;
        this.systemPrompt = systemPrompt;
    }

    private async callGemini(contents: any[], model: string): Promise<any> {
        if (!this.apiKey) {
            new Notice("Gemini API key is not set in the plugin settings.");
            throw new Error("Gemini API key is not set in the plugin settings.");
        }

        const requestOptions: RequestUrlParam = {
            url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ contents })
        };

        try {
            const response = await request(requestOptions);
            return JSON.parse(response);
        } catch (error) {
            console.error("Error calling Gemini API:", error);
            if (error instanceof Error) {
                new Notice(`Failed to call Gemini API. ${error.message}`);
                throw new Error(`Failed to call Gemini API. ${error.message}`);
            }
        }
    }

    async generateResponse(prompt: string, context: string): Promise<{title: string, content: string}> {
        // Currently only supports Gemini. Add logic here to switch based on this.apiProvider
        if (this.apiProvider === 'Gemini') {
            const contents = [
                {
                    "role": "user",
                    "parts": [
                        { "text": this.systemPrompt + `\n\n[CONTEXT HISTORY START]\n${context}\n[CONTEXT HISTORY END]\n\n[USER PROMPT]\n${prompt}` }
                    ]
                }
            ];

            try {
                const data = await this.callGemini(contents, this.model);
                const responseText = data.candidates[0].content.parts[0].text.trim();
                const firstNewline = responseText.indexOf('\n');
                let title: string;
                let content: string;

                if (firstNewline === -1) {
                    // If no newline, take the first 100 characters as title, rest as content (or empty if too short)
                    title = responseText.substring(0, 100).trim();
                    content = responseText.substring(100).trim();
                } else {
                    title = responseText.substring(0, firstNewline).trim();
                    content = responseText.substring(firstNewline + 1).trim();
                }

                // Ensure title is not excessively long, even if it had a newline
                if (title.length > 100) {
                    title = title.substring(0, 100).trim();
                }
                return { title, content };
            } catch (error) {
                console.error("Error generating response:", error);
                new Notice("Failed to generate response from Gemini.");
                throw new Error("Failed to generate response from Gemini.");
            }
        } else {
            new Notice(`Unsupported API Provider: ${this.apiProvider}`);
            throw new Error(`Unsupported API Provider: ${this.apiProvider}`);
        }
    }
}
