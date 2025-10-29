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
 * Currently supports the Ollama API.
 */
/**
 * LLMService handles all interactions with language model APIs.
 * This service abstracts away the complexity of different LLM providers
 * and provides a unified interface for the rest of the application.
 * 
 * Features:
 * - Supports multiple API providers (currently Ollama)
 * - Handles API configuration and requests
 * - Processes responses and error handling
 * - Manages API-specific formatting and requirements
 * 
 * @example
 * ```typescript
 * const llmService = new LLMService(settings);
 * try {
 *   const response = await llmService.generateResponse(prompt, context);
 *   // Handle response
 * } catch (error) {
 *   // Handle error
 * }
 * ```
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
     * Makes an asynchronous API call to the Ollama LLM.
     * 
     * This method handles the direct communication with Ollama's API endpoint.
     * It constructs the appropriate request parameters, handles the API call,
     * and processes the response.
     * 
     * Error Handling:
     * - Validates endpoint configuration
     * - Handles network errors
     * - Processes API-specific errors
     * - Provides user-friendly error messages
     * 
     * @param prompt The complete prompt to send to the Ollama API,
     *              including system prompt and context.
     * @param model The specific Ollama model to use (e.g., 'mistral', 'llama2').
     * @returns The parsed JSON response from the Ollama API containing
     *          the generated text.
     * @throws {Error} If the API call fails or returns an invalid response.
     * 
     * @example
     * ```typescript
     * try {
     *   const response = await this.callOllama(
     *     'Analyze this context...', 
     *     'mistral'
     *   );
     *   // Process response
     * } catch (error) {
     *   // Handle error
     * }
     * ```
     * @throws An error if the API endpoint is not set or if the API call fails.
     */
    private async callOllama(prompt: string, model: string): Promise<any> {
        // Validate that an API endpoint is set before making a request.
        if (!this.settings.ollamaEndpoint) {
            new Notice("Ollama endpoint is not set in the plugin settings.");
            throw new Error("Ollama endpoint is not set in the plugin settings.");
        }

        // Configure the request options for the Ollama API.
        const requestOptions: RequestUrlParam = {
            url: `${this.settings.ollamaEndpoint}/api/generate`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                stream: false
            })
        };

        try {
            // Send the request and parse the JSON response.
            const response = await request(requestOptions);
            return JSON.parse(response);
        } catch (error) {
            // Log and notify the user of any API call errors.
            console.error("Error calling Ollama API:", error);
            const message = error instanceof Error ? error.message : String(error);
            new Notice(`Failed to call Ollama API. ${message}`);
            throw new Error(`Failed to call Ollama API. ${message}`);
        }
    }

    /**
     * Generates a response from the LLM based on a user prompt and conversational context.
     * It constructs the full prompt, calls the appropriate LLM API, and parses the response
     * into a title and content for a new Obsidian note.
     * @param prompt The user's input prompt.
     * @param context The conversational context built from previous notes.
     * @returns An object containing the generated title, content, and raw text.
     * @throws An error if the API provider is unsupported or if the LLM response is empty/invalid.
     */
    async generateResponse(prompt: string, context: string): Promise<{title: string, content: string, raw: string}> {
        // Currently, only Ollama is supported. This block would be extended for other providers.
        if (this.settings.apiProvider === 'Ollama') {
            // Construct the prompt for the Ollama API, including system prompt, context, and user prompt.
            const fullPrompt = this.settings.systemPrompt + 
                `\n\n[CONTEXT HISTORY START]\n${context}\n[CONTEXT HISTORY END]\n\n[USER PROMPT]\n${prompt}`;

            try {
                // Call the Ollama API and extract the response text.
                const data = await this.callOllama(fullPrompt, this.settings.model);
                const responseText = String(data?.response ?? '').trim();
                
                if (!responseText) {
                    throw new Error('No content returned from model');
                }
                
                // Parse the response text into a title and content.
                // The first line is assumed to be the title, the rest is content.
                const firstNewline = responseText.indexOf('\n');
                let title: string;
                let content: string;

                if (firstNewline === -1) {
                    title = responseText.substring(0, 100).trim() || 'Synapse Response';
                    content = responseText;
                } else {
                    title = responseText.substring(0, firstNewline).trim();
                    content = responseText.substring(firstNewline + 1).trim();
                    if (!content) {
                        content = responseText;
                    }
                }

                // Ensure the title is not excessively long, even if it had a newline.
                if (title.length > 100) {
                    title = title.substring(0, 100).trim();
                }
                return { title, content, raw: responseText };
            } catch (error) {
                // Handle errors during response generation.
                console.error("Error generating response:", error);
                new Notice("Failed to generate response from Ollama.");
                throw new Error("Failed to generate response from Ollama.");
            }
        } else {
            // Handle unsupported API providers.
            new Notice(`Unsupported API Provider: ${this.settings.apiProvider}`);
            throw new Error(`Unsupported API Provider: ${this.settings.apiProvider}`);
        }
    }
}
