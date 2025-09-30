// src/controllers/merchantController.ts
import { Request, Response, NextFunction } from 'express';
import { merchantService } from '../services/merchantService';
import { validationService } from '../services/validationService';
import { bankApiService } from '../services/bankApiService';
import { notificationService } from '../services/notifications';
import { MerchantSubmission, OnboardingStatus } from '../types/merchant';
import { logger } from '../utils/logger';
import { BadRequestError, NotFoundError } from '../utils/errors';

export class MerchantController {
    /**
     * Create or update merchant profile (draft)
     */
    async saveProfile(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            if (!req.user) {
                throw new BadRequestError('User not authenticated', 'UNAUTHORIZED');
            }

            const data: MerchantSubmission = req.body;
            const userId = req.user.userId;

            // Check if merchant already exists
            let merchant = await merchantService.getMerchantByUserId(userId);

            if (merchant) {
                // Update existing
                merchant = await merchantService.updateMerchant(merchant.id, data);
            } else {
                // Create new
                merchant = await merchantService.createMerchant(userId, data);
            }

            res.json({
                success: true,
                data: merchant,
                message: 'Profile saved successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Submit merchant profile for validation
     */
    async submitProfile(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            if (!req.user) {
                throw new BadRequestError('User not authenticated', 'UNAUTHORIZED');
            }

            const userId = req.user.userId;
            const merchant = await merchantService.getMerchantByUserId(userId);

            if (!merchant) {
                throw new NotFoundError('Merchant profile not found', 'MERCHANT_NOT_FOUND');
            }

            // Validate profile
            await validationService.validateMerchantProfile(merchant);

            // Update status to submitted
            const updated = await merchantService.updateStatus(
                merchant.id,
                'submitted'
            );

            // Send notification to admin
            await notificationService.notifyAdminNewSubmission(updated);

            // Send confirmation to merchant
            await notificationService.notifyMerchantStatusChange(
                updated,
                'draft',
                'submitted'
            );

            logger.business(
                'merchant_submitted',
                merchant.id,
                'merchant',
                { userId }
            );

            res.json({
                success: true,
                data: updated,
                message: 'Application submitted successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get merchant profile
     */
    async getProfile(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            if (!req.user) {
                throw new BadRequestError('User not authenticated', 'UNAUTHORIZED');
            }

            const userId = req.user.userId;
            const merchant = await merchantService.getMerchantByUserId(userId);

            if (!merchant) {
                res.json({
                    success: true,
                    data: null,
                    message: 'No merchant profile found'
                });
                return;
            }

            res.json({
                success: true,
                data: merchant
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get merchant by ID (admin)
     */
    async getMerchantById(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const { merchantId } = req.params;
            const merchant = await merchantService.getMerchantById(merchantId);

            res.json({
                success: true,
                data: merchant
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get all merchants (admin)
     */
    async getAllMerchants(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const status = req.query.status as OnboardingStatus | undefined;
            const merchants = await merchantService.getAllMerchants(status);

            res.json({
                success: true,
                data: merchants,
                count: merchants.length
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Validate merchant (admin)
     */
    async validateMerchant(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const { merchantId } = req.params;
            const merchant = await merchantService.getMerchantById(merchantId);

            if (merchant.onboardingStatus !== 'submitted') {
                throw new BadRequestError(
                    'Merchant must be in submitted status',
                    'INVALID_STATUS'
                );
            }

            // Perform validation
            await validationService.validateMerchantProfile(merchant);

            // Update status to validating
            const updated = await merchantService.updateStatus(
                merchantId,
                'validating'
            );

            // Send notification
            await notificationService.notifyMerchantStatusChange(
                updated,
                'submitted',
                'validating'
            );

            logger.business(
                'merchant_validated',
                merchantId,
                'merchant',
                { adminUserId: req.user?.userId }
            );

            res.json({
                success: true,
                data: updated,
                message: 'Merchant validated successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Submit to bank (admin)
     */
    async submitToBank(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const { merchantId } = req.params;
            const merchant = await merchantService.getMerchantById(merchantId);

            if (merchant.onboardingStatus !== 'validating') {
                throw new BadRequestError(
                    'Merchant must be validated first',
                    'INVALID_STATUS'
                );
            }

            // Submit to bank API
            const bankResponse = await bankApiService.submitMerchantApplication(merchant);

            // Update merchant with bank response
            const updated = await merchantService.updateStatus(
                merchantId,
                'pending_bank_approval',
                undefined,
                {
                    bankApplicationId: bankResponse.applicationId,
                    bankResponse: {
                        success: bankResponse.success,
                        applicationId: bankResponse.applicationId,
                        message: bankResponse.message,
                        estimatedProcessingTime: bankResponse.estimatedProcessingTime
                    }
                }
            );

            // Send notification
            await notificationService.notifyMerchantStatusChange(
                updated,
                'validating',
                'pending_bank_approval'
            );

            logger.business(
                'merchant_submitted_to_bank',
                merchantId,
                'merchant',
                {
                    adminUserId: req.user?.userId,
                    bankApplicationId: bankResponse.applicationId
                }
            );

            res.json({
                success: true,
                data: {
                    merchant: updated,
                    bankResponse
                },
                message: 'Application submitted to bank successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Approve merchant manually (admin override)
     */
    async approveMerchant(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const { merchantId } = req.params;
            const merchant = await merchantService.getMerchantById(merchantId);
            const oldStatus = merchant.onboardingStatus;

            const updated = await merchantService.updateStatus(
                merchantId,
                'approved'
            );

            // Send notification
            await notificationService.notifyMerchantStatusChange(
                updated,
                oldStatus,
                'approved'
            );

            logger.business(
                'merchant_approved',
                merchantId,
                'merchant',
                {
                    adminUserId: req.user?.userId,
                    manualOverride: true
                }
            );

            res.json({
                success: true,
                data: updated,
                message: 'Merchant approved successfully'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Reject merchant (admin)
     */
    async rejectMerchant(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const { merchantId } = req.params;
            const { reason } = req.body;

            if (!reason || typeof reason !== 'string') {
                throw new BadRequestError(
                    'Rejection reason is required',
                    'MISSING_REASON'
                );
            }

            const merchant = await merchantService.getMerchantById(merchantId);
            const oldStatus = merchant.onboardingStatus;

            const updated = await merchantService.updateStatus(
                merchantId,
                'rejected',
                reason
            );

            // Send notification
            await notificationService.notifyMerchantStatusChange(
                updated,
                oldStatus,
                'rejected'
            );

            logger.business(
                'merchant_rejected',
                merchantId,
                'merchant',
                {
                    adminUserId: req.user?.userId,
                    reason
                }
            );

            res.json({
                success: true,
                data: updated,
                message: 'Merchant rejected'
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Delete merchant profile (admin)
     */
    async deleteMerchant(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const { merchantId } = req.params;

            await merchantService.deleteMerchant(merchantId);

            logger.business(
                'merchant_deleted',
                merchantId,
                'merchant',
                { adminUserId: req.user?.userId }
            );

            res.json({
                success: true,
                message: 'Merchant profile deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    }
}

export const merchantController = new MerchantController();