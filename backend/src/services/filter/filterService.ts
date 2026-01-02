import axios from 'axios';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

interface FilterResult {
    score: number;
    is_brain_rot: boolean;
    reasoning: string;
}

import config from '../../config/config';

export const filterContent = async (text: string): Promise<FilterResult> => {
    try {
        const response = await axios.post(`${AI_SERVICE_URL}/filter`, {
            text: text,
            context: config.filterPrompts.system
        });
        return response.data;
    } catch (error) {
        console.error('Error calling AI service:', error);
        // Fallback: assume content is OK if AI is down, to avoid blocking feeds
        return {
            score: 0.5,
            is_brain_rot: false,
            reasoning: 'AI Service Unavailable'
        };
    }
};
