// src/services/externalVerification.ts

import { redis } from '../config/redis';
import { logger } from '../utils/logger';

/**
 * verifyMerchant
 * Simulates or performs external verification for a merchant.
 * You can replace the mock logic with an actual API call.
 *
 * @param merchantId - The ID of the merchant to verify
 * @returns Promise<{ success: boolean, message?: string }>
 */
export const verifyMerchant = async (merchantId: string): Promise<{ success: boolean; message?: string }> => {
    try {
        logger.info(`Starting verification for merchant: ${merchantId}`);

        // Example: check if already verified in Redis
        const cachedResult = await redis.get(`merchant_verification:${merchantId}`);
        if (cachedResult) {
            logger.info(`Found cached verification result for merchant ${merchantId}`);
            return { success: cachedResult === 'true' };
        }

        // Mock external verification logic
        const isVerified = Math.random() > 0.3; // 70% chance to succeed
        logger.info(`Verification result for ${merchantId}: ${isVerified}`);

        // Cache result in Redis for 1 hour
        await redis.set(`merchant_verification:${merchantId}`, String(isVerified), 'EX', 3600);

        return { success: isVerified, message: isVerified ? 'Verified successfully' : 'Verification failed' };
    } catch (error) {
        logger.error(`Error verifying merchant ${merchantId}:`);
        return { success: false, message: 'Internal error during verification' };
    }
};
