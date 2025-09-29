import express from 'express';
import cors from 'cors';
import { json } from 'body-parser';
import merchantRoutes from './routes/merchant';
import webhookRoutes from './routes/webhook';
import { logger } from './utils/logger';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(json());

app.use('/merchant', merchantRoutes);
app.use('/webhook', webhookRoutes);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    logger.info(`Backend server running on port ${PORT}`);
});
