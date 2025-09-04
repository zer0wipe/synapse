/**
 * llmService.ts
 * 
 * This service is responsible for all interactions with Large Language Models (LLMs).
 * It handles API key management, constructing API requests, sending prompts with context,
 * and parsing the LLM's responses into a structured format (title and content for a new note).
 */
import { request, RequestUrlParam, Notice } from 'obsidian';
import { SynapseSettings } from '../src/settings';

/**
 * Manages communication with configured Large Language Models.
 * Currently supports the Gemini API.
 */
export class LLMService {
    private settings: SynapseSettings;

    /**
     * Constructs a new LLMService instance.
     * @param settings The plugin settings.
     */
    constructor(settings: SynapseSettings) {
        this.settings = settings;
    }

    /**
     * Updates the settings for the LLM service.
     * @param settings The new plugin settings.
     */
    public updateSettings(settings: SynapseSettings) {
        this.settings = settings;
    }

    /**
     * Makes an asynchronous API call to the Gemini LLM.
     * @param contents The content payload to send to the Gemini API.
     * @param model The specific Gemini model to call.
     * @returns The parsed JSON response from the Gemini API.
     * @throws An error if the API key is not set or if the API call fails.
     */
    private async callGemini(contents: any[], model: string): Promise<any> {
        // Validate that an API key is set before making a request.
        if (!this.settings.geminiApiKey) {
            new Notice("Gemini API key is not set in the plugin settings.");
            throw new Error("Gemini API key is not set in the plugin settings.");
        }

        // Configure the request options for the Gemini API.
        const requestOptions: RequestUrlParam = {
            url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.settings.geminiApiKey}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ contents }) // Convert the content payload to a JSON string.
        };

        try {
            // Send the request and parse the JSON response.
            const response = await request(requestOptions);
            return JSON.parse(response);
        } catch (error) {
            // Log and notify the user of any API call errors.
            console.error("Error calling Gemini API:", error);
            const message = error instanceof Error ? error.message : String(error);
            new Notice(`Failed to call Gemini API. ${message}`);
            throw new Error(`Failed to call Gemini API. ${message}`);
        }
    }

    /**
     * Generates a response from the LLM based on a user prompt and conversational context.
     * It constructs the full prompt, calls the appropriate LLM API, and parses the response
     * into a title and content for a new Obsidian note.
     * @param prompt The user's input prompt.
     * @param context The conversational context built from previous notes.
     * @returns An object containing the generated title and content.
     * @throws An error if the API provider is unsupported or if the LLM response is empty/invalid.
     */
    async generateResponse(prompt: string, context: string): Promise<{title: string, content: string}> {
        // Currently, only Gemini is supported. This block would be extended for other providers.
        if (this.settings.apiProvider === 'Gemini') {
            // Construct the content payload for the Gemini API, including system prompt, context, and user prompt.
            const contents = [
                {
                    "role": "user",
                    "parts": [
                        { "text": this.settings.systemPrompt + `\n\n[CONTEXT HISTORY START]\n${context}\n[CONTEXT HISTORY END]\n\n[USER PROMPT]\n${prompt}` }
                    ]
                }
            ];

            try {
                // Call the Gemini API and extract the response text.
                const data = await this.callGemini(contents, this.settings.model);
                const responseText = String(
                    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
                ).trim();
                
                if (!responseText) {
                    throw new Error('No content returned from model');
                }
                
                // Parse the response text into a title and content.
                // The first line is assumed to be the title, the rest is content.
                const firstNewline = responseText.indexOf('\n');
                let title: string;
                let content: string;

                if (firstNewline === -1) {
                    // If no newline, take the first 100 characters as title, rest as content (or empty if too short).
                    title = responseText.substring(0, 100).trim();
                    content = responseText.substring(100).trim();
                } else {
                    title = responseText.substring(0, firstNewline).trim();
                    content = responseText.substring(firstNewline + 1).trim();
                }

                // Ensure the title is not excessively long, even if it had a newline.
                if (title.length > 100) {
                    title = title.substring(0, 100).trim();
                }
                return { title, content };
            } catch (error) {
                // Handle errors during response generation.
                console.error("Error generating response:", error);
                new Notice("Failed to generate response from Gemini.");
                throw new Error("Failed to generate response from Gemini.");
            }
        } else {
            // Handle unsupported API providers.
            new Notice(`Unsupported API Provider: ${this.settings.apiProvider}`);
            throw new Error(`Unsupported API Provider: ${this.settings.apiProvider}`);
        }
    }
}

