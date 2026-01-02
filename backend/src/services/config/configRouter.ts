import { Router } from 'express';
import { getConfig, updateConfig } from './configController';

export const configRouter = Router();

configRouter.get('/', getConfig);
configRouter.post('/', updateConfig);
