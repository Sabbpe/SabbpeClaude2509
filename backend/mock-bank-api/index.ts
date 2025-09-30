import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(bodyParser.json());

const PORT = 3001;
const BACKEND_WEBHOOK_URL = 'http://localhost:5000/api/supabase/bank-webhook';

interface Application {
    merchantId: string;
    businessName: string;
    email: string;
    receivedAt: string;
}

const applications = new Map<string, Application>();
const pendingApplications = new Map<string, Application>();

// Main endpoint to receive merchant applications
app.post('/merchant-applications', async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('\n📨 Received merchant application');
        console.log('Business Name:', req.body.businessName);
        console.log('Email:', req.body.email);
        console.log('Merchant ID:', req.body.merchantId);

        const applicationId = `APP-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

        const applicationData: Application = {
            merchantId: req.body.merchantId,
            businessName: req.body.businessName,
            email: req.body.email,
            receivedAt: new Date().toISOString()
        };

        applications.set(applicationId, applicationData);
        pendingApplications.set(applicationId, applicationData);

        console.log('✅ Application ID:', applicationId);
        console.log('⏸️  Application pending manual review');
        console.log(`📋 Review at: http://localhost:${PORT}/admin/pending`);
        console.log(`📋 Approve: POST http://localhost:${PORT}/admin/decide/${applicationId} with {"approved": true}`);
        console.log(`📋 Reject: POST http://localhost:${PORT}/admin/decide/${applicationId} with {"approved": false}`);

        res.json({
            success: true,
            applicationId: applicationId,
            status: 'pending_review',
            estimatedProcessingTime: 'Awaiting manual review',
            message: 'Application received and pending review'
        });

    } catch (error) {
        console.error('Error processing application:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Admin: View all pending applications
app.get('/admin/pending', (req: Request, res: Response): void => {
    const pending = Array.from(pendingApplications.entries()).map(([id, app]) => ({
        applicationId: id,
        merchantId: app.merchantId,
        businessName: app.businessName,
        email: app.email,
        receivedAt: app.receivedAt
    }));

    res.json({
        count: pending.length,
        applications: pending
    });
});

// Admin: Manually approve or reject an application
app.post('/admin/decide/:applicationId', async (req: Request, res: Response): Promise<void> => {
    try {
        const { applicationId } = req.params;
        const { approved, reason } = req.body;

        if (typeof approved !== 'boolean') {
            res.status(400).json({
                error: 'Missing or invalid "approved" field. Must be true or false.'
            });
            return;
        }

        const application = pendingApplications.get(applicationId);

        if (!application) {
            res.status(404).json({
                error: 'Application not found or already processed',
                applicationId: applicationId
            });
            return;
        }

        console.log(`\n🏦 Manual Decision for ${applicationId}`);
        console.log(`Decision: ${approved ? '✅ APPROVED' : '❌ REJECTED'}`);
        console.log(`Business: ${application.businessName}`);
        if (!approved && reason) {
            console.log(`Reason: ${reason}`);
        }

        // Send webhook to backend
        const webhookPayload = {
            applicationId: applicationId,
            merchantId: application.merchantId,
            status: approved ? 'approved' : 'rejected',
            decision: {
                approved: approved,
                reason: approved ? null : (reason || 'Manual rejection by admin')
            },
            processedAt: new Date().toISOString()
        };

        console.log('📤 Sending webhook to backend:', BACKEND_WEBHOOK_URL);

        const response = await axios.post(BACKEND_WEBHOOK_URL, webhookPayload, {
            headers: {
                'Content-Type': 'application/json',
                'X-Bank-Signature': 'mock-signature-12345'
            }
        });

        console.log('✅ Webhook delivered successfully');
        console.log('Backend response:', response.data);

        // Remove from pending
        pendingApplications.delete(applicationId);

        res.json({
            success: true,
            message: `Application ${approved ? 'approved' : 'rejected'} successfully`,
            applicationId: applicationId,
            webhookDelivered: true
        });

    } catch (error) {
        console.error('❌ Error processing decision:', error);
        if (axios.isAxiosError(error)) {
            res.status(500).json({
                error: 'Failed to send webhook to backend',
                details: error.message
            });
        } else {
            res.status(500).json({
                error: 'Internal server error'
            });
        }
    }
});

// Admin: Bulk approve/reject
app.post('/admin/bulk-decide', async (req: Request, res: Response): Promise<void> => {
    try {
        const { approved, applicationIds, reason } = req.body;

        if (typeof approved !== 'boolean') {
            res.status(400).json({ error: '"approved" must be true or false' });
            return;
        }

        if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
            res.status(400).json({ error: '"applicationIds" must be a non-empty array' });
            return;
        }

        const results = [];

        for (const applicationId of applicationIds) {
            const application = pendingApplications.get(applicationId);

            if (!application) {
                results.push({ applicationId, success: false, error: 'Not found' });
                continue;
            }

            try {
                const webhookPayload = {
                    applicationId: applicationId,
                    merchantId: application.merchantId,
                    status: approved ? 'approved' : 'rejected',
                    decision: {
                        approved: approved,
                        reason: approved ? null : (reason || 'Bulk rejection')
                    },
                    processedAt: new Date().toISOString()
                };

                await axios.post(BACKEND_WEBHOOK_URL, webhookPayload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Bank-Signature': 'mock-signature-12345'
                    }
                });

                pendingApplications.delete(applicationId);
                results.push({ applicationId, success: true });

            } catch (error) {
                results.push({
                    applicationId,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        console.log(`\n🏦 Bulk Decision: ${approved ? 'APPROVED' : 'REJECTED'} ${results.filter(r => r.success).length}/${applicationIds.length} applications`);

        res.json({
            success: true,
            processed: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results: results
        });

    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check
app.get('/health', (req: Request, res: Response): void => {
    res.json({
        status: 'ok',
        service: 'Mock Bank API',
        pendingApplications: pendingApplications.size
    });
});

// Get application status
app.get('/api/applications/:applicationId', (req: Request, res: Response): void => {
    const applicationId = req.params.applicationId;
    const application = applications.get(applicationId);
    const isPending = pendingApplications.has(applicationId);

    if (application) {
        res.json({
            ...application,
            applicationId: applicationId,
            status: isPending ? 'pending_review' : 'processed'
        });
    } else {
        res.status(404).json({ error: 'Application not found' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log('\n🏦 Mock Bank API Server Running (Manual Control Mode)');
    console.log('================================');
    console.log(`📡 Port: ${PORT}`);
    console.log(`🔗 Application endpoint: http://localhost:${PORT}/merchant-applications`);
    console.log(`🏥 Health: http://localhost:${PORT}/health`);
    console.log('\n📋 Admin Endpoints:');
    console.log(`   View pending: GET http://localhost:${PORT}/admin/pending`);
    console.log(`   Approve: POST http://localhost:${PORT}/admin/decide/{applicationId}`);
    console.log(`            Body: {"approved": true}`);
    console.log(`   Reject: POST http://localhost:${PORT}/admin/decide/{applicationId}`);
    console.log(`           Body: {"approved": false, "reason": "Your reason here"}`);
    console.log(`   Bulk: POST http://localhost:${PORT}/admin/bulk-decide`);
    console.log(`         Body: {"approved": true/false, "applicationIds": ["APP-1", "APP-2"]}`);
    console.log('================================\n');
});