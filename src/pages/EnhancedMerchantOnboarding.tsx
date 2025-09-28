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
    bankDetails: {
        accountNumber: string;
        ifscCode: string;
        bankName: string;
        accountHolderName: string;
    };
    kycData: {
        isVideoCompleted: boolean;
        selfieUrl?: string;
        locationVerified?: boolean;
    };
    documents: {
        panCard?: File;
        aadhaarCard?: File;
        gstCertificate?: File;
        cancelledCheque?: File;
        [key: string]: File | undefined;
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
                                <li>• Review within 24-48 hours</li>
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
        fullName: '', mobileNumber: '', email: '', panNumber: '', aadhaarNumber: '',
        businessName: '', gstNumber: '',
        bankDetails: { accountNumber: '', ifscCode: '', bankName: '', accountHolderName: '' },
        kycData: { isVideoCompleted: false },
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
        setOnboardingData(prev => ({ ...prev, ...newData }));
    };

    // Save registration data to Supabase after registration step
    const saveRegistrationData = async () => {
        if (!user?.id) {
            console.error('No user ID found');
            return false;
        }

        try {
            console.log('Saving registration data to Supabase:', onboardingData);

            const { error } = await supabase
                .from('merchant_profiles')
                .update({
                    full_name: onboardingData.fullName,
                    mobile_number: onboardingData.mobileNumber,
                    email: onboardingData.email,
                    pan_number: onboardingData.panNumber,
                    aadhaar_number: onboardingData.aadhaarNumber,
                    business_name: onboardingData.businessName,
                    gst_number: onboardingData.gstNumber,
                    updated_at: new Date().toISOString(),
                })
                .eq('user_id', user.id);

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

    // Custom next step handler that saves data first
    const handleNextStep = async () => {
        // Save data when leaving registration step
        if (currentStep === 'registration') {
            const saved = await saveRegistrationData();
            if (!saved) {
                return; // Don't proceed if save failed
            }
        }
        nextStep();
    };

    const [, setSavedProgress] = useLocalStorage('onboarding-progress', {
        currentStep, completedAt: null, lastUpdated: new Date().toISOString(),
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

        // If application is verified or approved - show dashboard
        if (merchantProfile.onboarding_status === 'verified' ||
            merchantProfile.onboarding_status === 'approved') {
            goToStep('dashboard');
        } else {
            // Still in progress - restore to appropriate step
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
        setIsSubmitting(true);

        try {
            toast({
                title: "Submitting Application",
                description: "Please wait while we process your onboarding details...",
            });

            if (!user?.id) {
                throw new Error('User not authenticated');
            }

            // 1. Update merchant profile status to 'submitted'
            const { data: merchantData, error: merchantError } = await supabase
                .from('merchant_profiles')
                .update({
                    onboarding_status: 'submitted',
                    full_name: onboardingData.fullName,
                    business_name: onboardingData.businessName,
                    pan_number: onboardingData.panNumber,
                    aadhaar_number: onboardingData.aadhaarNumber,
                    gst_number: onboardingData.gstNumber,
                    email: onboardingData.email,
                    mobile_number: onboardingData.mobileNumber,
                })
                .eq('user_id', user.id)
                .select()
                .single();

            if (merchantError) {
                throw new Error(`Merchant update failed: ${merchantError.message}`);
            }

            console.log('Merchant status updated:', merchantData);

            // 2. Update or insert bank details
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
                throw new Error(`Bank details update failed: ${bankError.message}`);
            }

            console.log('Bank details saved');

            // 3. Update KYC data if needed
            const { error: kycError } = await supabase
                .from('merchant_kyc')
                .upsert({
                    merchant_id: merchantData.id,
                    is_video_completed: onboardingData.kycData.isVideoCompleted,
                    selfie_url: onboardingData.kycData.selfieUrl,
                    location_verified: onboardingData.kycData.locationVerified,
                    kyc_status: 'pending',
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'merchant_id'
                });

            if (kycError) {
                throw new Error(`KYC update failed: ${kycError.message}`);
            }

            console.log('KYC data saved');

            // 4. Upload documents if any
            if (onboardingData.documents.panCard) {
                const fileName = `${merchantData.id}/pan_card_${Date.now()}.pdf`;
                const { error: uploadError } = await supabase.storage
                    .from('merchant-documents')
                    .upload(fileName, onboardingData.documents.panCard);

                if (!uploadError) {
                    await supabase.from('merchant_documents').insert({
                        merchant_id: merchantData.id,
                        document_type: 'pan_card',
                        file_name: onboardingData.documents.panCard.name,
                        file_path: fileName,
                        file_size: onboardingData.documents.panCard.size,
                        uploaded_at: new Date().toISOString(),
                    });
                }
            }

            // Repeat for other documents as needed...

            // 5. Update local state
            setOnboardingData(prev => ({ ...prev, agreementAccepted: true }));

            // 6. Show success popup
            setShowSuccessPopup(true);

            toast({
                title: "Application Submitted Successfully!",
                description: "Your application has been submitted for review.",
            });

        } catch (error) {
            console.error('Submission failed:', error);
            toast({
                variant: "destructive",
                title: "Submission Failed",
                description: error instanceof Error ? error.message : "There was an error submitting your application. Please try again.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

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
            console.warn(`Step "${stepId}" does not exist in ONBOARDING_STEPS`);
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
                    <div>Full Name: {onboardingData.fullName}</div>
                    <div>Email: {onboardingData.email}</div>
                    <div>User ID: {user?.id || 'Not logged in'}</div>
                </div>
            )}
        </div>
    );
};

export default EnhancedOnboardingFlow;