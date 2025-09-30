// backend/src/index.ts

import dotenv from 'dotenv';
dotenv.config();
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';

import authRoutes from './routes/auth';
import merchantRoutes from './routes/merchant';
import adminRoutes from './routes/admin';
import webhookRoutes from './routes/webhook';
import supabaseRoutes from './routes/supabase';  // ✅ Added
import { logger } from './utils/logger';
import {
    AppError,
    isOperationalError
} from './utils/errors';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Handle unhandled rejections and uncaught exceptions
process.on('unhandledRejection', (reason: unknown) => {
    logger.error(
        'Unhandled Promise Rejection',
        reason instanceof Error ? reason : undefined
    );

    if (reason instanceof Error && !isOperationalError(reason)) {
        process.exit(1);
    }
});

process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', error);
    process.exit(1);
});

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - startTime;
        logger.request(
            req.method,
            req.path,
            res.statusCode,
            duration
        );
    });

    next();
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/merchants', merchantRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/supabase', supabaseRoutes);  // ✅ Added

// 404 handler
app.use((req: Request, res: Response) => {
    logger.warn(`Route not found: ${req.method} ${req.path}`);

    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: `Route ${req.method} ${req.path} not found`
        }
    });
});

// Global error handler
app.use((err: Error | AppError, req: Request, res: Response, next: NextFunction) => {
    const context = {
        method: req.method,
        path: req.path,
        userId: req.user?.userId
    };

    if (err instanceof AppError) {
        logger.error(
            `Application error: ${err.message}`,
            err,
            {
                ...context,
                statusCode: err.statusCode,
                code: err.code
            }
        );

        res.status(err.statusCode).json(err.toJSON());
        return;
    }

    // Unexpected errors
    logger.error(
        `Unexpected error: ${err.message}`,
        err,
        context
    );

    res.status(500).json({
        success: false,
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        }
    });
});

// Start server
app.listen(PORT, () => {
    logger.info('Server started successfully', {
        port: PORT,
        env: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
    });

    console.log('');
    console.log('✅ SabbPe Backend Server Running');
    console.log('================================');
    console.log(`📡 API: http://localhost:${PORT}/api`);
    console.log(`🏥 Health: http://localhost:${PORT}/health`);
    console.log(`🔗 Supabase Webhook: http://localhost:${PORT}/api/supabase/merchant-webhook`);  // ✅ Added
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('================================');
    console.log('');
});

export default app;