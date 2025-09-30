// src/routes/merchant.ts
import { Router } from 'express';
import { merchantController } from '../controllers/merchantController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Merchant routes (require merchant role)
router.post(
    '/profile',
    authenticate,
    authorize('merchant'),
    (req, res, next) => merchantController.saveProfile(req, res, next)
);

router.post(
    '/submit',
    authenticate,
    authorize('merchant'),
    (req, res, next) => merchantController.submitProfile(req, res, next)
);

router.get(
    '/profile',
    authenticate,
    authorize('merchant'),
    (req, res, next) => merchantController.getProfile(req, res, next)
);

// Admin routes
router.get(
    '/all',
    authenticate,
    authorize('admin'),
    (req, res, next) => merchantController.getAllMerchants(req, res, next)
);

router.get(
    '/:merchantId',
    authenticate,
    authorize('admin'),
    (req, res, next) => merchantController.getMerchantById(req, res, next)
);

router.post(
    '/:merchantId/validate',
    authenticate,
    authorize('admin'),
    (req, res, next) => merchantController.validateMerchant(req, res, next)
);

router.post(
    '/:merchantId/submit-to-bank',
    authenticate,
    authorize('admin'),
    (req, res, next) => merchantController.submitToBank(req, res, next)
);

router.post(
    '/:merchantId/approve',
    authenticate,
    authorize('admin'),
    (req, res, next) => merchantController.approveMerchant(req, res, next)
);

router.post(
    '/:merchantId/reject',
    authenticate,
    authorize('admin'),
    (req, res, next) => merchantController.rejectMerchant(req, res, next)
);

router.delete(
    '/:merchantId',
    authenticate,
    authorize('admin'),
    (req, res, next) => merchantController.deleteMerchant(req, res, next)
);

export default router;