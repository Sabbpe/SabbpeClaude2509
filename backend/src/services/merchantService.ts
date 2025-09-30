// src/services/merchantService.ts
import { v4 as uuidv4 } from 'uuid';
import {
    MerchantProfile,
    MerchantSubmission,
    OnboardingStatus,
    StatusUpdate
} from '../types/merchant';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors';
import { logger } from '../utils/logger';

// In-memory storage (replace with database in production)
const merchants = new Map<string, MerchantProfile>();
const merchantsByUserId = new Map<string, string>(); // userId -> merchantId mapping

export class MerchantService {
    /**
     * Create a new merchant profile
     */
    async createMerchant(
        userId: string,
        data: MerchantSubmission
    ): Promise<MerchantProfile> {
        // Check if user already has a merchant profile
        if (merchantsByUserId.has(userId)) {
            throw new ConflictError(
                'Merchant profile already exists for this user',
                'MERCHANT_ALREADY_EXISTS'
            );
        }

        const merchantId = uuidv4();
        const now = new Date().toISOString();

        const merchant: MerchantProfile = {
            ...data,
            id: merchantId,
            userId,
            onboardingStatus: 'draft',
            createdAt: now,
            updatedAt: now
        };

        merchants.set(merchantId, merchant);
        merchantsByUserId.set(userId, merchantId);

        logger.info('Merchant profile created', {
            merchantId,
            userId,
            businessName: data.businessName
        });

        return merchant;
    }

    /**
     * Get merchant by ID
     */
    async getMerchantById(merchantId: string): Promise<MerchantProfile> {
        const merchant = merchants.get(merchantId);

        if (!merchant) {
            throw new NotFoundError(
                'Merchant not found',
                'MERCHANT_NOT_FOUND'
            );
        }

        return merchant;
    }

    /**
     * Get merchant by user ID
     */
    async getMerchantByUserId(userId: string): Promise<MerchantProfile | null> {
        const merchantId = merchantsByUserId.get(userId);

        if (!merchantId) {
            return null;
        }

        return merchants.get(merchantId) || null;
    }

    /**
     * Update merchant profile
     */
    async updateMerchant(
        merchantId: string,
        data: Partial<MerchantSubmission>
    ): Promise<MerchantProfile> {
        const merchant = await this.getMerchantById(merchantId);

        // Only allow updates if status is draft or rejected
        if (!['draft', 'rejected'].includes(merchant.onboardingStatus)) {
            throw new BadRequestError(
                'Cannot update merchant in current status',
                'INVALID_STATUS_FOR_UPDATE'
            );
        }

        const updated: MerchantProfile = {
            ...merchant,
            ...data,
            id: merchant.id,
            userId: merchant.userId,
            onboardingStatus: merchant.onboardingStatus,
            updatedAt: new Date().toISOString()
        };

        merchants.set(merchantId, updated);

        logger.info('Merchant profile updated', {
            merchantId,
            userId: merchant.userId
        });

        return updated;
    }

    /**
     * Update merchant status
     */
    async updateStatus(
        merchantId: string,
        newStatus: OnboardingStatus,
        reason?: string,
        additionalData?: Partial<MerchantProfile>
    ): Promise<MerchantProfile> {
        const merchant = await this.getMerchantById(merchantId);
        const oldStatus = merchant.onboardingStatus;

        // Validate status transition
        this.validateStatusTransition(oldStatus, newStatus);

        const now = new Date().toISOString();
        const statusTimestampField = this.getStatusTimestampField(newStatus);

        const updated: MerchantProfile = {
            ...merchant,
            ...additionalData,
            onboardingStatus: newStatus,
            rejectionReason: newStatus === 'rejected' ? reason : undefined,
            [statusTimestampField]: now,
            updatedAt: now
        };

        merchants.set(merchantId, updated);

        const statusUpdate: StatusUpdate = {
            merchantId,
            fromStatus: oldStatus,
            toStatus: newStatus,
            reason,
            metadata: additionalData?.metadata
        };

        logger.onboarding(merchantId, newStatus, oldStatus, merchant.userId);

        return updated;
    }

    /**
     * Get all merchants (with optional status filter)
     */
    async getAllMerchants(
        status?: OnboardingStatus
    ): Promise<MerchantProfile[]> {
        let allMerchants = Array.from(merchants.values());

        if (status) {
            allMerchants = allMerchants.filter(m => m.onboardingStatus === status);
        }

        return allMerchants;
    }

    /**
     * Delete merchant profile
     */
    async deleteMerchant(merchantId: string): Promise<void> {
        const merchant = await this.getMerchantById(merchantId);

        merchants.delete(merchantId);
        merchantsByUserId.delete(merchant.userId);

        logger.info('Merchant profile deleted', {
            merchantId,
            userId: merchant.userId
        });
    }

    /**
     * Validate status transition
     */
    private validateStatusTransition(
        currentStatus: OnboardingStatus,
        newStatus: OnboardingStatus
    ): void {
        const validTransitions: Record<OnboardingStatus, OnboardingStatus[]> = {
            draft: ['submitted'],
            submitted: ['validating', 'rejected'],
            validating: ['pending_bank_approval', 'rejected'],
            pending_bank_approval: ['approved', 'rejected'],
            approved: [],
            rejected: ['submitted'] // Allow resubmission
        };

        const allowedStatuses = validTransitions[currentStatus];

        if (!allowedStatuses.includes(newStatus)) {
            throw new BadRequestError(
                `Invalid status transition from ${currentStatus} to ${newStatus}`,
                'INVALID_STATUS_TRANSITION'
            );
        }
    }

    /**
     * Get the timestamp field name for a given status
     */
    private getStatusTimestampField(status: OnboardingStatus): string {
        const fieldMap: Record<OnboardingStatus, string> = {
            draft: 'createdAt',
            submitted: 'submittedAt',
            validating: 'validatedAt',
            pending_bank_approval: 'bankSubmittedAt',
            approved: 'decisionAt',
            rejected: 'decisionAt'
        };

        return fieldMap[status];
    }
}

export const merchantService = new MerchantService();