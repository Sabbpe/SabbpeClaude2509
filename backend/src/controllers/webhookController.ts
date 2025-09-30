// src/controllers/webhookController.ts
import { Request, Response, NextFunction } from 'express';
import { merchantService } from '../services/merchantService';
import { bankApiService } from '../services/bankApiService';
import { notificationService } from '../services/notifications';
import { BankWebhookPayload } from '../types/bank';
import { logger } from '../utils/logger';
import { BadRequestError } from '../utils/errors';

export class WebhookController {
    /**
     * Handle bank webhook for application decision
     */
    async handleBankWebhook(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            const payload: BankWebhookPayload = req.body;

            logger.info('Received bank webhook', {
                applicationId: payload.applicationId,
                merchantId: payload.merchantId,
                status: payload.status
            });

            // Verify webhook
            const isValid = await bankApiService.verifyWebhook(payload);

            if (!isValid) {
                throw new BadRequestError(
                    'Invalid webhook payload',
                    'INVALID_WEBHOOK_PAYLOAD'
                );
            }

            // Get merchant
            const merchant = await merchantService.getMerchantById(payload.merchantId);

            // Verify application ID matches
            if (merchant.bankApplicationId !== payload.applicationId) {
                logger.warn('Webhook application ID mismatch', {
                    merchantId: payload.merchantId,
                    expectedApplicationId: merchant.bankApplicationId,
                    receivedApplicationId: payload.applicationId
                });

                throw new BadRequestError(
                    'Application ID mismatch',
                    'APPLICATION_ID_MISMATCH'
                );
            }

            const oldStatus = merchant.onboardingStatus;

            // Process decision
            if (payload.decision.approved) {
                // Approve merchant
                const updated = await merchantService.updateStatus(
                    merchant.id,
                    'approved',
                    undefined,
                    {
                        bankResponse: {
                            success: true,
                            applicationId: payload.applicationId,
                            message: 'Approved by bank',
                            additionalData: {
                                accountNumber: payload.decision.accountNumber || '',
                                merchantCode: payload.decision.merchantCode || ''
                            }
                        }
                    }
                );

                // Send notification
                await notificationService.notifyMerchantStatusChange(
                    updated,
                    oldStatus,
                    'approved'
                );

                logger.business(
                    'merchant_approved_by_bank',
                    merchant.id,
                    'merchant',
                    {
                        applicationId: payload.applicationId,
                        accountNumber: payload.decision.accountNumber
                    }
                );
            } else {
                // Reject merchant
                const updated = await merchantService.updateStatus(
                    merchant.id,
                    'rejected',
                    payload.decision.reason || 'Rejected by bank',
                    {
                        bankResponse: {
                            success: false,
                            applicationId: payload.applicationId,
                            message: payload.decision.reason || 'Rejected by bank'
                        }
                    }
                );

                // Send notification
                await notificationService.notifyMerchantStatusChange(
                    updated,
                    oldStatus,
                    'rejected'
                );

                logger.business(
                    'merchant_rejected_by_bank',
                    merchant.id,
                    'merchant',
                    {
                        applicationId: payload.applicationId,
                        reason: payload.decision.reason
                    }
                );
            }

            // Respond to webhook
            res.json({
                success: true,
                message: 'Webhook processed successfully'
            });
        } catch (error) {
            logger.error(
                'Webhook processing error',
                error instanceof Error ? error : undefined,
                { body: req.body }
            );

            next(error);
        }
    }

    /**
     * Test webhook endpoint (development only)
     */
    async testWebhook(
        req: Request,
        res: Response,
        next: NextFunction
    ): Promise<void> {
        try {
            if (process.env.NODE_ENV === 'production') {
                throw new BadRequestError(
                    'Test webhook not available in production',
                    'NOT_AVAILABLE'
                );
            }

            const { merchantId, approved } = req.body;

            if (!merchantId || typeof approved !== 'boolean') {
                throw new BadRequestError(
                    'merchantId and approved (boolean) are required',
                    'INVALID_TEST_DATA'
                );
            }

            const merchant = await merchantService.getMerchantById(merchantId);

            // Create test webhook payload
            const testPayload: BankWebhookPayload = {
                applicationId: merchant.bankApplicationId || 'test-app-id',
                merchantId: merchant.id,
                status: approved ? 'approved' : 'rejected',
                decision: {
                    approved,
                    reason: approved ? undefined : 'Test rejection',
                    accountNumber: approved ? 'TEST123456' : undefined,
                    merchantCode: approved ? 'MERCH001' : undefined
                },
                processedAt: new Date().toISOString()
            };

            // Process the test webhook
            req.body = testPayload;
            await this.handleBankWebhook(req, res, next);
        } catch (error) {
            next(error);
        }
    }
}

export const webhookController = new WebhookController();