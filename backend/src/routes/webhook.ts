import { Router } from 'express';
import { verifyMerchant } from '../services/externalVerification';

const router = Router();

router.post('/external-verification', async (req, res) => {
    try {
        await verifyMerchant(req.body);
        res.status(200).send('OK');
    } catch (err) {
        console.error(err);
        res.status(500).send('Webhook processing failed');
    }
});

export default router;
