import settings from './settings.json';

export interface FeedConfig {
    id: string;
    name: string;
    url: string;
    type: string;
}

export interface AppConfig {
    feeds: FeedConfig[];
    filterPrompts: {
        system: string;
    };
    social?: {
        twitter?: string;
        reddit?: string;
    };
}

const config: AppConfig = settings;

export default config;
