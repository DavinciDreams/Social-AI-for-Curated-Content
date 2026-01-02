import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import config, { AppConfig } from '../../config/config';

const SETTINGS_PATH = path.join(__dirname, '../../config/settings.json');

export const getConfig = async (req: Request, res: Response) => {
    res.json(config);
};

export const updateConfig = async (req: Request, res: Response) => {
    try {
        const newConfig: AppConfig = req.body;

        // Basic validation
        if (!Array.isArray(newConfig.feeds) || !newConfig.filterPrompts?.system) {
            return res.status(400).json({ error: 'Invalid configuration format' });
        }

        // Write to file
        await fs.writeFile(SETTINGS_PATH, JSON.stringify(newConfig, null, 2));

        // Update in-memory config (hacky reload)
        Object.assign(config, newConfig);

        res.json({ message: 'Configuration updated', config: newConfig });
    } catch (error) {
        console.error('Error updating config:', error);
        res.status(500).json({ error: 'Failed to update configuration' });
    }
};
