import { Router } from 'express';
import { getFeeds } from './feedController';

export const feedRouter = Router();

feedRouter.get('/', getFeeds);
