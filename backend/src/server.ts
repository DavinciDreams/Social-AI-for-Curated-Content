import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { feedRouter } from './services/feed/feedRouter';
import { configRouter } from './services/config/configRouter';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
    res.send('Brain Rot Filter Backend is running');
});

app.use('/api/feeds', feedRouter);
app.use('/api/config', configRouter);

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});
