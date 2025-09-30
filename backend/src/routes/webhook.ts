// src/routes/webhook.ts
import { Router } from 'express';
import { webhookController } from '../controllers/webhookController';
import { verifyWebhookSignature } from '../middleware/webhookAuth';

const router = Router();

// Bank webhook (with signature verification)
router.post(
    '/bank',
    verifyWebhookSignature,
    (req, res, next) => webhookController.handleBankWebhook(req, res, next)
);

// Test webhook (development only)
router.post(
    '/test',
    (req, res, next) => webhookController.testWebhook(req, res, next)
);

export default router;