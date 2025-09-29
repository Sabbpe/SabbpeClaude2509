import { Worker } from 'bullmq';
import { redis } from '../config/redis.js';
import { verifyMerchant } from '../services/externalVerification.js';
import { sendNotification } from '../services/notifications.js';
import { logger } from '../utils/logger.js';

export const VERIFICATION_QUEUE = 'external-verification';

// Define the job data
export interface VerificationJobData {
    merchantId: string;
}

// Create the worker
export const externalVerificationWorker = new Worker(
    VERIFICATION_QUEUE,
    async (job: { data: VerificationJobData }) => {
        const { merchantId } = job.data;

        try {
            logger.info(`Processing verification for merchant: ${merchantId}`);

            const result = await verifyMerchant(merchantId);

            if (result.success) {
                await sendNotification(merchantId, 'Verification successful!');
                logger.info(`Merchant ${merchantId} verified successfully.`);
            } else {
                await sendNotification(merchantId, 'Verification failed!');
                logger.warn(`Merchant ${merchantId} verification failed.`);
            }

            return result;
        } catch (error) {
            logger.error(`Error processing merchant ${merchantId}:`);
            throw error;
        }
    },
    { connection: redis } // redis connection
);

// Event listeners
externalVerificationWorker.on('completed', (job: { data: VerificationJobData }) => {
    logger.info(`Job ${job.data.merchantId} completed`);
});

externalVerificationWorker.on('failed', (job: { data: VerificationJobData } | undefined, err: Error) => {
    const merchantId = job?.data?.merchantId ?? 'unknown';
    logger.error(`Job for merchant ${merchantId} failed:`);
});
