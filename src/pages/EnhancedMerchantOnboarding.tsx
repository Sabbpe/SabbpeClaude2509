// src/pages/EnhancedMerchantOnboarding.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useOnboardingFlow } from '@/hooks/useOnboardingFlow';
import { useMerchantData } from '@/hooks/useMerchantData';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { WelcomeScreen } from '@/components/onboarding/WelcomeScreen';
import { MerchantRegistration } from '@/components/onboarding/MerchantRegistration';
import { KYCVerification } from '@/components/onboarding/KYCVerification';
import { BankDetails } from '@/components/onboarding/BankDetails';
import { ReviewSubmit } from '@/components/onboarding/ReviewSubmit';
import { OnboardingDashboard } from '@/components/onboarding/OnboardingDashboard';

export interface OnboardingData {
    fullName: string;
    mobileNumber: string;
    email: string;
    panNumber: string;
    aadhaarNumber: string;
    businessName: string;
    gstNumber: string;
    hasGST: boolean;
    bankDetails: {
        accountNumber: string;
        ifscCode: string;
        bankName: string;
        accountHolderName: string;
        confirmAccountNumber?: string;
    };
    kycData: {
        isVideoCompleted: boolean;
        selfieUrl?: string;
        locationVerified?: boolean;
        latitude?: number;
        longitude?: number;
    };
    documents: {
        panCard?: { file: File; path: string };
        aadhaarCard?: { file: File; path: string };
        cancelledCheque?: { file: File; path: string };
        businessProof?: { file: File; path: string };
        [key: string]: { file: File; path: string } | undefined;
    };
    agreementAccepted: boolean;
    currentStep: number;
}

interface MerchantProfile {
    id?: string;
    full_name?: string;
    mobile_number?: string;
    email?: string;
    pan_number?: string;
    aadhaar_number?: string;
    business_name?: string;
    gst_number?: string;
    onboarding_status?: string;
    user_id?: string;
}

interface BaseStepProps {
    data?: OnboardingData | Record<string, unknown>;
    onDataChange?: (newData: Partial<OnboardingData> | Record<string, unknown>) => void;
    onNext?: (() => void) | ((data?: unknown) => void);
    onPrevious?: () => void;
    onPrev?: () => void;
    onGoToStep?: (stepId: string) => void;
    onSubmit?: () => Promise<void>;
    currentStep?: string;
    merchantProfile?: MerchantProfile;
    isSubmitting?: boolean;
}

interface StepInfo {
    id: string;
    title: string;
    description: string;
    component: React.ComponentType<BaseStepProps>;
}

const ONBOARDING_STEPS: StepInfo[] = [
    { id: 'welcome', title: 'Welcome', description: 'Introduction to SabbPe', component: WelcomeScreen as unknown as React.ComponentType<BaseStepProps> },
    { id: 'registration', title: 'Registration', description: 'Personal & Business Details', component: MerchantRegistration as unknown as React.ComponentType<BaseStepProps> },
    { id: 'kyc', title: 'KYC Verification', description: 'Identity Verification', component: KYCVerification as unknown as React.ComponentType<BaseStepProps> },
    { id: 'bank-details', title: 'Bank Details', description: 'Payment Settlement Setup', component: BankDetails as unknown as React.ComponentType<BaseStepProps> },
    { id: 'review', title: 'Review & Submit', description: 'Final Review', component: ReviewSubmit as unknown as React.ComponentType<BaseStepProps> },
];

const SuccessPopup: React.FC<{ isOpen: boolean; onClose: () => void; onGoToDashboard: () => void }> = ({ isOpen, onClose, onGoToDashboard }) => {
    const [applicationId] = useState(() => `APP${Date.now()}`);

    if (!isOpen) return null;

    const handleGoToDashboard = () => {
        onClose();
        onGoToDashboard();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl">
                <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-green-800 mb-2">
                        Application Submitted Successfully!
                    </h3>
                    <p className="text-gray-600 mb-6">
                        Your merchant onboarding application has been submitted for review.
                        You'll receive email updates on the approval status.
                    </p>
                    <div className="space-y-3 mb-6">
                        <div className="p-4 bg-blue-50 rounded-lg">
                            <p className="font-medium text-blue-900">Application ID: {applicationId}</p>
                            <p className="text-sm text-blue-700">Please save this ID for your records</p>
                        </div>
                        <div className="text-sm text-gray-600 text-left">
                            <p className="font-medium mb-2">What happens next:</p>
                            <ul className="space-y-1">
                                <li>• Validation within 5-10 minutes</li>
                                <li>• Bank API processing 24-48 hours</li>
                                <li>• Email confirmation sent</li>
                                <li>• Account activation once approved</li>
                            </ul>
                        </div>
                    </div>
                    <button
                        onClick={handleGoToDashboard}
                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Go to Merchant Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

const EnhancedOnboardingFlow: React.FC = () => {
    const { toast } = useToast();
    const { user } = useAuth();
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [onboardingData, setOnboardingData] = useState<OnboardingData>({
        fullName: '',
        mobileNumber: '',
        email: '',
        panNumber: '',
        aadhaarNumber: '',
        businessName: '',
        gstNumber: '',
        hasGST: true,
        bankDetails: {
            accountNumber: '',
            ifscCode: '',
            bankName: '',
            accountHolderName: ''
        },
        kycData: {
            isVideoCompleted: false
        },
        documents: {},
        agreementAccepted: false,
        currentStep: 0,
    });

    const { currentStep, currentStepIndex, totalSteps, progress, nextStep, prevStep, goToStep } = useOnboardingFlow();
    const { merchantProfile, bankDetails, documents, kycData, loading: profileLoading } = useMerchantData();

    type OnboardingStep = 'welcome' | 'registration' | 'kyc' | 'bank-details' | 'review' | 'dashboard';

    useEffect(() => {
        if (merchantProfile) {
            console.log('Populating data from merchantProfile:', merchantProfile);
            setOnboardingData(prev => ({
                ...prev,
                fullName: merchantProfile.full_name || '',
                mobileNumber: merchantProfile.mobile_number || '',
                email: merchantProfile.email || '',
                panNumber: merchantProfile.pan_number || '',
                aadhaarNumber: merchantProfile.aadhaar_number || '',
                businessName: merchantProfile.business_name || '',
                gstNumber: merchantProfile.gst_number || '',
            }));
        }
    }, [merchantProfile]);

    const handleDataChange = (newData: Partial<OnboardingData>) => {
        console.log('Updating onboarding data:', newData);
        setOnboardingData(prev => ({
            ...prev,
            ...newData,
            // Deep merge documents to avoid overwriting
            documents: {
                ...(prev.documents || {}),
                ...(newData.documents || {})
            }
        }));
    };

    const saveRegistrationData = async () => {
        if (!user?.id) {
            console.error('No user ID found');
            return false;
        }

        try {
            console.log('Saving registration data to Supabase:', onboardingData);

            const { error } = await supabase
                .from('merchant_profiles')
                .upsert({
                    user_id: user.id,
                    full_name: onboardingData.fullName,
                    mobile_number: onboardingData.mobileNumber,
                    email: onboardingData.email,
                    pan_number: onboardingData.panNumber,
                    aadhaar_number: onboardingData.aadhaarNumber,
                    business_name: onboardingData.businessName,
                    gst_number: onboardingData.gstNumber,
                    onboarding_status: 'in_progress',
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'user_id'
                });

            if (error) {
                console.error('Failed to save registration data:', error);
                toast({
                    variant: "destructive",
                    title: "Save Failed",
                    description: "Failed to save your registration data. Please try again.",
                });
                return false;
            }

            console.log('Registration data saved successfully');
            return true;
        } catch (error) {
            console.error('Error saving registration data:', error);
            return false;
        }
    };

    const handleNextStep = async () => {
        if (currentStep === 'registration') {
            const saved = await saveRegistrationData();
            if (!saved) {
                return;
            }
        }
        nextStep();
    };

    const [, setSavedProgress] = useLocalStorage('onboarding-progress', {
        currentStep,
        completedAt: null,
        lastUpdated: new Date().toISOString(),
    });

    React.useEffect(() => {
        setSavedProgress({
            currentStep,
            completedAt: currentStep === 'dashboard' ? new Date().toISOString() : null,
            lastUpdated: new Date().toISOString(),
        });
    }, [currentStep, setSavedProgress]);

    const [stepRestored, setStepRestored] = useState(false);

    useEffect(() => {
        if (!merchantProfile || stepRestored || profileLoading) return;

        console.log('Restoring step based on profile status:', merchantProfile.onboarding_status);

        const status = merchantProfile.onboarding_status;

        if (status === 'approved' || status === 'verified') {
            goToStep('dashboard');
        } else if (status === 'submitted' || status === 'in_progress' || status === 'validating' || status === 'pending_bank_approval') {
            goToStep('dashboard');
        } else if (status === 'validation_failed' || status === 'rejected' || status === 'bank_rejected') {
            goToStep('review');
        } else {
            const hasPersonalInfo = Boolean(
                merchantProfile.pan_number &&
                merchantProfile.aadhaar_number &&
                merchantProfile.business_name
            );

            const hasKYC = Boolean(kycData?.kyc_status === 'verified' || documents.length > 0);
            const hasBankDetails = Boolean(bankDetails?.account_number);

            if (hasBankDetails && hasKYC && hasPersonalInfo) {
                goToStep('review');
            } else if (hasBankDetails && hasPersonalInfo) {
                goToStep('bank-details');
            } else if (hasKYC && hasPersonalInfo) {
                goToStep('kyc');
            } else if (hasPersonalInfo) {
                goToStep('kyc');
            } else if (merchantProfile.full_name) {
                goToStep('registration');
            } else {
                goToStep('welcome');
            }
        }
        setStepRestored(true);
    }, [merchantProfile, bankDetails, documents, kycData, stepRestored, profileLoading, goToStep]);

    const handleFinalSubmit = async () => {
        console.log('Starting final submission with data:', onboardingData);

        // DEBUG: Log what we're checking
        console.log('Checking documents:', {
            panCard: onboardingData.documents?.panCard,
            aadhaarCard: onboardingData.documents?.aadhaarCard,
            businessProof: onboardingData.documents?.businessProof,
            cancelledCheque: onboardingData.documents?.cancelledCheque
        });

        // Validate required documents exist WITH PATHS
        const requiredDocs = ['panCard', 'aadhaarCard', 'businessProof', 'cancelledCheque'];
        const missingDocs = requiredDocs.filter(doc =>
            !onboardingData.documents?.[doc]?.path  // Check for path, not just existence
        );

        if (missingDocs.length > 0) {
            toast({
                variant: "destructive",
                title: "Missing Documents",
                description: `Please upload: ${missingDocs.join(', ')}`,
            });
            console.error('Missing document paths:', missingDocs);
            return;
        }

        try {
            const validationErrors: string[] = [];

            if (!onboardingData.fullName) validationErrors.push('Full name is required');
            if (!onboardingData.email) validationErrors.push('Email is required');
            if (!onboardingData.mobileNumber) validationErrors.push('Mobile number is required');
            if (!onboardingData.panNumber) validationErrors.push('PAN number is required');
            if (!onboardingData.aadhaarNumber) validationErrors.push('Aadhaar number is required');
            if (!onboardingData.businessName) validationErrors.push('Business name is required');

            if (!onboardingData.bankDetails.accountNumber || onboardingData.bankDetails.accountNumber.trim() === '') {
                validationErrors.push('Bank account number is required');
            }
            if (!onboardingData.bankDetails.ifscCode || onboardingData.bankDetails.ifscCode.trim() === '') {
                validationErrors.push('IFSC code is required');
            }
            if (!onboardingData.bankDetails.bankName || onboardingData.bankDetails.bankName.trim() === '') {
                validationErrors.push('Bank name is required');
            }
            if (!onboardingData.bankDetails.accountHolderName || onboardingData.bankDetails.accountHolderName.trim() === '') {
                validationErrors.push('Account holder name is required');
            }

            if (!onboardingData.kycData.isVideoCompleted) {
                validationErrors.push('Video KYC must be completed');
            }
            if (!onboardingData.kycData.locationVerified) {
                validationErrors.push('Location must be verified');
            }

            const requiredDocs = ['panCard', 'aadhaarCard', 'cancelledCheque'];
            requiredDocs.forEach(doc => {
                if (!onboardingData.documents[doc]) {
                    validationErrors.push(`${doc.replace(/([A-Z])/g, ' $1').trim()} is required`);
                }
            });

            if (validationErrors.length > 0) {
                toast({
                    variant: "destructive",
                    title: "Validation Failed",
                    description: validationErrors.join('; ')
                });
                setIsSubmitting(false);
                return;
            }

            if (!user?.id) {
                throw new Error('User not authenticated');
            }

            toast({
                title: "Submitting Application",
                description: "Please wait while we process your onboarding details...",
            });

            // 1. Insert/Update merchant profile
            const { data: merchantData, error: merchantError } = await supabase
                .from('merchant_profiles')
                .upsert({
                    user_id: user.id,
                    full_name: onboardingData.fullName,
                    business_name: onboardingData.businessName,
                    pan_number: onboardingData.panNumber,
                    aadhaar_number: onboardingData.aadhaarNumber,
                    gst_number: onboardingData.gstNumber,
                    email: onboardingData.email,
                    mobile_number: onboardingData.mobileNumber,
                    onboarding_status: 'pending',
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'user_id'
                })
                .select()
                .single();

            if (merchantError || !merchantData) {
                throw new Error(`Merchant profile failed: ${merchantError?.message}`);
            }

            console.log('Merchant profile created/updated:', merchantData.id);

            // 2. Insert/Update bank details
            const { error: bankError } = await supabase
                .from('merchant_bank_details')
                .upsert({
                    merchant_id: merchantData.id,
                    account_number: onboardingData.bankDetails.accountNumber,
                    ifsc_code: onboardingData.bankDetails.ifscCode,
                    bank_name: onboardingData.bankDetails.bankName,
                    account_holder_name: onboardingData.bankDetails.accountHolderName,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'merchant_id'
                });

            if (bankError) {
                throw new Error(`Bank details failed: ${bankError.message}`);
            }

            console.log('Bank details saved');

            // 3. Insert documents
            const docTypeMap: Record<string, string> = {
                'panCard': 'pan_card',
                'aadhaarCard': 'aadhaar_card',
                'cancelledCheque': 'cancelled_cheque',
                'businessProof': 'business_proof'
            };

            const documentInserts = [];
            for (const [docKey, docData] of Object.entries(onboardingData.documents)) {
                if (docData && docData.file && docData.path) {
                    const docType = docTypeMap[docKey];
                    if (docType) {
                        documentInserts.push({
                            merchant_id: merchantData.id,
                            document_type: docType,
                            file_name: docData.file.name,
                            file_path: docData.path,
                            file_size: docData.file.size,
                            mime_type: docData.file.type,
                            status: 'uploaded',
                            uploaded_at: new Date().toISOString()
                        });
                    }
                }
            }

            if (documentInserts.length > 0) {
                // Delete existing documents first
                await supabase
                    .from('merchant_documents')
                    .delete()
                    .eq('merchant_id', merchantData.id);

                const { error: docsError } = await supabase
                    .from('merchant_documents')
                    .insert(documentInserts);

                if (docsError) {
                    throw new Error(`Documents insert failed: ${docsError.message}`);
                }
                console.log(`${documentInserts.length} documents inserted`);
            }

            // 4. Insert/Update KYC
            const { error: kycError } = await supabase
                .from('merchant_kyc')
                .upsert({
                    merchant_id: merchantData.id,
                    video_kyc_completed: onboardingData.kycData.isVideoCompleted,
                    selfie_file_path: onboardingData.kycData.selfieUrl,
                    location_captured: onboardingData.kycData.locationVerified || false,
                    latitude: onboardingData.kycData.latitude,
                    longitude: onboardingData.kycData.longitude,
                    kyc_status: 'pending',
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'merchant_id'
                });

            if (kycError) {
                throw new Error(`KYC update failed: ${kycError.message}`);
            }

            console.log('KYC data saved');

            // 5. FINAL STEP: Change status to 'submitted' to trigger backend webhook
            const { error: statusError } = await supabase
                .from('merchant_profiles')
                .update({
                    onboarding_status: 'submitted',
                    submitted_at: new Date().toISOString(),
                })
                .eq('id', merchantData.id);

            if (statusError) {
                throw new Error(`Status update failed: ${statusError.message}`);
            }

            console.log('Status changed to submitted - backend webhook triggered');

            setShowSuccessPopup(true);

            toast({
                title: "Application Submitted Successfully!",
                description: "Your application is being processed by the backend.",
            });

        } catch (error) {
            console.error('Submission failed:', error);
            toast({
                variant: "destructive",
                title: "Submission Failed",
                description: error instanceof Error ? error.message : "Please try again.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        if (!user?.id || !merchantProfile?.id) return;

        const channel = supabase
            .channel('merchant-status-changes')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'merchant_profiles',
                    filter: `id=eq.${merchantProfile.id}`
                },
                (payload) => {
                    const newStatus = (payload.new as MerchantProfile).onboarding_status;

                    console.log('Status changed to:', newStatus);

                    toast({
                        title: "Status Updated",
                        description: `Application status: ${newStatus?.replace('_', ' ')}`,
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id, merchantProfile?.id, toast]);

    if (profileLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
                <Card className="p-8">
                    <CardContent className="flex items-center space-x-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <div>
                            <h3 className="font-semibold text-foreground">Loading...</h3>
                            <p className="text-sm text-muted-foreground">Fetching your onboarding progress</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (currentStep === 'dashboard') {
        return <OnboardingDashboard />;
    }

    const currentStepInfo = ONBOARDING_STEPS.find(step => step.id === currentStep);
    const CurrentStepComponent = currentStepInfo?.component || WelcomeScreen;

    const isStepCompleted = (stepId: string): boolean => {
        switch (stepId) {
            case 'welcome': return true;
            case 'registration': return Boolean(onboardingData.fullName && onboardingData.businessName && onboardingData.panNumber);
            case 'kyc': return onboardingData.kycData.isVideoCompleted;
            case 'bank-details': return Boolean(onboardingData.bankDetails.accountNumber && onboardingData.bankDetails.ifscCode);
            case 'review': return onboardingData.agreementAccepted;
            default: return false;
        }
    };

    const handleGoToStep = (stepId: string) => {
        const stepExists = ONBOARDING_STEPS.find(step => step.id === stepId);
        if (stepExists) {
            goToStep(stepId as OnboardingStep);
        } else {
            console.warn(`Step "${stepId}" does not exist`);
        }
    };

    const stepProps: BaseStepProps = {
        data: onboardingData,
        onDataChange: handleDataChange,
        onNext: handleNextStep,
        onPrevious: prevStep,
        onPrev: prevStep,
        onGoToStep: handleGoToStep,
        onSubmit: handleFinalSubmit,
        currentStep: currentStep,
        merchantProfile: merchantProfile,
        isSubmitting: isSubmitting,
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5">
            {currentStep !== 'welcome' && (
                <div className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b">
                    <div className="container max-w-6xl mx-auto px-4 py-4">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h1 className="text-xl font-semibold text-foreground">SabbPe Merchant Onboarding</h1>
                                <p className="text-sm text-muted-foreground">Step {currentStepIndex + 1} of {totalSteps}: {currentStepInfo?.title}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-medium text-foreground">{Math.round(progress)}% Complete</div>
                                <div className="text-xs text-muted-foreground">{currentStepInfo?.description}</div>
                            </div>
                        </div>
                        <div className="mb-4">
                            <Progress value={progress} className="h-2" />
                        </div>
                        <div className="flex justify-between items-center">
                            {ONBOARDING_STEPS.map((step, index) => {
                                const isActive = step.id === currentStep;
                                const isCompleted = isStepCompleted(step.id);
                                const isPast = index < currentStepIndex;

                                return (
                                    <div key={step.id} className="flex flex-col items-center">
                                        <button
                                            onClick={() => handleGoToStep(step.id)}
                                            disabled={!isPast && !isActive}
                                            className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 
                                                ${isActive ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110'
                                                    : isCompleted ? 'bg-green-500 text-white hover:bg-green-600'
                                                        : isPast ? 'bg-muted-foreground/20 text-muted-foreground hover:bg-muted-foreground/30'
                                                            : 'bg-muted text-muted-foreground cursor-not-allowed'}`}
                                        >
                                            {isCompleted && !isActive ? (
                                                <CheckCircle className="w-5 h-5" />
                                            ) : (
                                                <span className="text-sm font-semibold">{index + 1}</span>
                                            )}
                                        </button>
                                        <div className="mt-2 text-center">
                                            <div className={`text-xs font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                                                {step.title}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <div className="container max-w-6xl mx-auto px-4 py-8">
                <CurrentStepComponent {...stepProps} />
            </div>

            <SuccessPopup
                isOpen={showSuccessPopup}
                onClose={() => setShowSuccessPopup(false)}
                onGoToDashboard={() => {
                    setShowSuccessPopup(false);
                    goToStep('dashboard');
                }}
            />

            {process.env.NODE_ENV === 'development' && (
                <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-xs">
                    <div className="font-bold mb-2">Debug Info:</div>
                    <div>Current Step: {currentStep}</div>
                    <div>Progress: {Math.round(progress)}%</div>
                    <div>Is Submitting: {isSubmitting ? 'Yes' : 'No'}</div>
                    <div>Status: {merchantProfile?.onboarding_status || 'N/A'}</div>
                    <div>User ID: {user?.id || 'Not logged in'}</div>
                </div>
            )}
        </div>
    );
};

export default EnhancedOnboardingFlow;