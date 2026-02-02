import axios from 'axios';
import config from '../../config/config';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_SERVICE_TIMEOUT = parseInt(process.env.AI_SERVICE_TIMEOUT || '30000', 10);

export interface FilterResult {
    score: number;
    is_brain_rot: boolean;
    reasoning: string;
}

export interface FilterRequest {
    text: string;
    context?: string;
}

export interface FilterResponse {
    score: number;
    is_brain_rot: boolean;
    reasoning: string;
}

/**
 * Filter content using the AI service with Llama 3 via Ollama.
 * 
 * @param text - The content text to analyze
 * @returns FilterResult with score (0-1), brain_rot flag, and reasoning
 */
export const filterContent = async (text: string): Promise<FilterResult> => {
    try {
        const response = await axios.post<FilterResponse>(
            `${AI_SERVICE_URL}/filter`,
            {
                text: text,
                context: config.filterPrompts.system
            },
            {
                timeout: AI_SERVICE_TIMEOUT,
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );
        
        return {
            score: response.data.score,
            is_brain_rot: response.data.is_brain_rot,
            reasoning: response.data.reasoning
        };
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const status = error.response?.status;
            const message = error.response?.data?.detail || error.message;
            
            console.error(`Error calling AI service (status ${status}):`, message);
            
            // Fallback: assume content is OK if AI is down, to avoid blocking feeds
            // Return a neutral score with appropriate reasoning
            return {
                score: 0.5,
                is_brain_rot: false,
                reasoning: `AI Service Unavailable: ${message}. Content not filtered.`
            };
        }
        
        console.error('Unexpected error calling AI service:', error);
        return {
            score: 0.5,
            is_brain_rot: false,
            reasoning: 'AI Service Error: Content not filtered.'
        };
    }
};

/**
 * Check if the AI service is healthy and Ollama is connected.
 * 
 * @returns Health status of the AI service
 */
export const checkAiServiceHealth = async (): Promise<{
    status: string;
    model: string;
    ollama_host: string;
    ollama_connected: boolean;
}> => {
    try {
        const response = await axios.get(`${AI_SERVICE_URL}/health`, {
            timeout: 5000,
        });
        return response.data;
    } catch (error) {
        console.error('Error checking AI service health:', error);
        return {
            status: 'unavailable',
            model: 'unknown',
            ollama_host: AI_SERVICE_URL,
            ollama_connected: false
        };
    }
};
