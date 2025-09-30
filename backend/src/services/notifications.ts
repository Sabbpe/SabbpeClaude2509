// src/services/notifications.ts
import { MerchantProfile, OnboardingStatus } from '../types/merchant';
import { logger } from '../utils/logger';

export interface NotificationPayload {
    to: string;
    subject: string;
    body: string;
    type: 'email' | 'sms' | 'push';
}

export class NotificationService {
    /**
     * Send notification to merchant about status change
     */
    async notifyMerchantStatusChange(
        merchant: MerchantProfile,
        oldStatus: OnboardingStatus,
        newStatus: OnboardingStatus
    ): Promise<void> {
        const notification = this.buildStatusChangeNotification(
            merchant,
            oldStatus,
            newStatus
        );

        await this.sendNotification(notification);

        logger.info('Status change notification sent', {
            merchantId: merchant.id,
            email: merchant.email,
            oldStatus,
            newStatus
        });
    }

    /**
     * Build notification for status change
     */
    private buildStatusChangeNotification(
        merchant: MerchantProfile,
        oldStatus: OnboardingStatus,
        newStatus: OnboardingStatus
    ): NotificationPayload {
        const subject = this.getSubjectForStatus(newStatus);
        const body = this.getBodyForStatus(merchant, newStatus);

        return {
            to: merchant.email,
            subject,
            body,
            type: 'email'
        };
    }

    /**
     * Get email subject for status
     */
    private getSubjectForStatus(status: OnboardingStatus): string {
        const subjects: Record<OnboardingStatus, string> = {
            draft: 'Your application is saved',
            submitted: 'Application submitted successfully',
            validating: 'Application under review',
            pending_bank_approval: 'Application sent to bank for approval',
            approved: 'Congratulations! Your application is approved',
            rejected: 'Application update required'
        };

        return subjects[status];
    }

    /**
     * Get email body for status
     */
    private getBodyForStatus(
        merchant: MerchantProfile,
        status: OnboardingStatus
    ): string {
        const bodies: Record<OnboardingStatus, string> = {
            draft: `Hi ${merchant.businessName},\n\nYour merchant application has been saved as draft. You can continue editing and submit when ready.`,

            submitted: `Hi ${merchant.businessName},\n\nYour merchant application has been submitted successfully. Our team will review it shortly.`,

            validating: `Hi ${merchant.businessName},\n\nYour application is currently under review by our team. We'll notify you once the review is complete.`,

            pending_bank_approval: `Hi ${merchant.businessName},\n\nYour application has been submitted to the bank for final approval. This typically takes 2-3 business days.`,

            approved: `Hi ${merchant.businessName},\n\nCongratulations! Your merchant application has been approved. You can now start using our platform.\n\nWelcome aboard!`,

            rejected: `Hi ${merchant.businessName},\n\nYour application requires some updates. Reason: ${merchant.rejectionReason || 'Please review and resubmit.'}\n\nYou can update your application and resubmit.`
        };

        return bodies[status];
    }

    /**
     * Send notification (mock implementation)
     */
    private async sendNotification(notification: NotificationPayload): Promise<void> {
        // In production, integrate with email service (SendGrid, AWS SES, etc.)
        logger.debug('Sending notification', {
            to: notification.to,
            subject: notification.subject,
            type: notification.type
        });

        // Mock send delay
        await new Promise(resolve => setTimeout(resolve, 100));

        // Log as sent
        console.log(`📧 Email sent to ${notification.to}: ${notification.subject}`);
    }

    /**
     * Send admin notification
     */
    async notifyAdminNewSubmission(merchant: MerchantProfile): Promise<void> {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@sabbpe.com';

        const notification: NotificationPayload = {
            to: adminEmail,
            subject: 'New merchant application submitted',
            body: `A new merchant application has been submitted:\n\nBusiness: ${merchant.businessName}\nEmail: ${merchant.email}\nSubmitted: ${merchant.submittedAt}`,
            type: 'email'
        };

        await this.sendNotification(notification);

        logger.info('Admin notification sent', {
            merchantId: merchant.id,
            adminEmail
        });
    }
}

export const notificationService = new NotificationService();