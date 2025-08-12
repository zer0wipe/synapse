import { request, RequestUrlParam, Notice } from 'obsidian';

export class LLMService {
    private apiKey: string;
    private apiProvider: string;
    private model: string;
    private titleModel: string;

    constructor(apiKey: string, apiProvider: string, model: string, titleModel: string) {
        this.apiKey = apiKey;
        this.apiProvider = apiProvider;
        this.model = model;
        this.titleModel = titleModel;
    }

    public updateApiKey(apiKey: string) {
        this.apiKey = apiKey;
    }

    public updateModelSettings(apiProvider: string, model: string, titleModel: string) {
        this.apiProvider = apiProvider;
        this.model = model;
        this.titleModel = titleModel;
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
            const systemMessage = `You are Synapse, an AI assistant embedded within a knowledge graph (Obsidian). 
The user is expanding their thoughts. Analyze the provided context (a chain of previous notes) and respond to the latest prompt. 
Your response will be saved as a new, linked note. Be insightful and continue the line of reasoning.
The first line of your response should be a concise, descriptive title (5-10 words) for the note. The rest of the response should be the content of the note.`;

            const contents = [
                {
                    "role": "user",
                    "parts": [
                        { "text": systemMessage }
                    ]
                },
                {
                    "role": "model",
                    "parts": [
                        { "text": "Okay, I am ready." }
                    ]
                },
                {
                    "role": "user",
                    "parts": [
                        { "text": `[CONTEXT HISTORY START]\n${context}\n[CONTEXT HISTORY END]\n\n[USER PROMPT]\n${prompt}` }
                    ]
                }
            ];

            try {
                const data = await this.callGemini(contents, this.model);
                const responseText = data.candidates[0].content.parts[0].text.trim();
                const firstNewline = responseText.indexOf('\n');
                if (firstNewline === -1) {
                    return { title: responseText, content: '' };
                }
                const title = responseText.substring(0, firstNewline).trim();
                const content = responseText.substring(firstNewline + 1).trim();
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
