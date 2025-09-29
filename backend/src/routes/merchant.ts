import { Router } from 'express';
import { verifyMerchant } from '../services/externalVerification';

const router = Router();

router.post('/submit', async (req, res) => {
    try {
        const result = await verifyMerchant(req.body);
        res.json({ success: true, data: result });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

export default router;
