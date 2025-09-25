// src/pages/EnhancedMerchantOnboarding.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';
import { useOnboardingFlow } from '@/hooks/useOnboardingFlow';
import { useMerchantData } from '@/hooks/useMerchantData';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useToast } from '@/hooks/use-toast';
import { WelcomeScreen } from '@/components/onboarding/WelcomeScreen';
import { MerchantRegistration } from '@/components/onboarding/MerchantRegistration';  // FIXED: Default import
import { KYCVerification } from '@/components/onboarding/KYCVerification';
import { BankDetails } from '@/components/onboarding/BankDetails';
import { ReviewSubmit } from '@/components/onboarding/ReviewSubmit';
import { OnboardingDashboard } from '@/components/onboarding/OnboardingDashboard';

// CRITICAL: Define the OnboardingData interface that ReviewSubmit expects
export interface OnboardingData {
    // Personal Information
    fullName: string;
    mobileNumber: string;
    email: string;
    panNumber: string;
    aadhaarNumber: string;

    // Business Information
    businessName: string;
    gstNumber: string;

    // Bank Details
    bankDetails: {
        accountNumber: string;
        ifscCode: string;
        bankName: string;
        accountHolderName: string;
    };

    // KYC and Documents
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

    // Agreement and Status
    agreementAccepted: boolean;
    currentStep: number;
}

// FIXED: Use any for component typing to avoid prop interface conflicts
interface StepInfo {
    id: string;
    title: string;
    description: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    component: React.ComponentType<any>; // Using any to accommodate different component interfaces
}

const ONBOARDING_STEPS: StepInfo[] = [
    {
        id: 'welcome',
        title: 'Welcome',
        description: 'Introduction to SabbPe',
        component: WelcomeScreen,
    },
    {
        id: 'registration',
        title: 'Registration',
        description: 'Personal & Business Details',
        component: MerchantRegistration,
    },
    {
        id: 'kyc',
        title: 'KYC Verification',
        description: 'Identity Verification',
        component: KYCVerification,
    },
    {
        id: 'bank-details',
        title: 'Bank Details',
        description: 'Payment Settlement Setup',
        component: BankDetails,
    },
    {
        id: 'review',
        title: 'Review & Submit',
        description: 'Final Review',
        component: ReviewSubmit,
    },
];

const SuccessPopup: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    // Generate static application ID that won't change on re-renders
    const [applicationId] = useState(() => `APP${Date.now()}`);

    if (!isOpen) return null;

    const handleGoHome = () => {
        onClose();
        window.location.href = '/';
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
                            <p className="font-medium text-blue-900">
                                Application ID: {applicationId}
                            </p>
                            <p className="text-sm text-blue-700">
                                Please save this ID for your records
                            </p>
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
                        onClick={handleGoHome}
                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Go to Home Page
                    </button>
                </div>
            </div>
        </div>
    );
};

const EnhancedOnboardingFlow: React.FC = () => {
    const { toast } = useToast();
    const [showSuccessPopup, setShowSuccessPopup] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // CRITICAL: State to hold onboarding data across all steps
    const [onboardingData, setOnboardingData] = useState<OnboardingData>({
        // Initialize with empty values
        fullName: '',
        mobileNumber: '',
        email: '',
        panNumber: '',
        aadhaarNumber: '',
        businessName: '',
        gstNumber: '',
        bankDetails: {
            accountNumber: '',
            ifscCode: '',
            bankName: '',
            accountHolderName: '',
        },
        kycData: {
            isVideoCompleted: false,
        },
        documents: {},
        agreementAccepted: false,
        currentStep: 0,
    });

    const {
        currentStep,
        currentStepIndex,
        totalSteps,
        progress,
        nextStep,
        prevStep,
        goToStep
    } = useOnboardingFlow();

    const { merchantProfile, loading: profileLoading } = useMerchantData();

    // FIXED: Define OnboardingStep type to match your hook
    type OnboardingStep = 'welcome' | 'registration' | 'kyc' | 'bank-details' | 'review' | 'dashboard';

    // CRITICAL: Populate onboardingData from Supabase when merchantProfile loads
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
                // You may need to map more fields based on your Supabase schema
            }));
        }
    }, [merchantProfile]);

    // CRITICAL: Function to update onboarding data from individual steps
    const handleDataChange = (newData: Partial<OnboardingData>) => {
        console.log('Updating onboarding data:', newData);
        setOnboardingData(prev => ({
            ...prev,
            ...newData
        }));
    };

    // Auto-save progress to localStorage
    const [, setSavedProgress] = useLocalStorage('onboarding-progress', {
        currentStep,
        completedAt: null,
        lastUpdated: new Date().toISOString(),
    });

    // Update saved progress whenever step changes
    React.useEffect(() => {
        setSavedProgress({
            currentStep,
            completedAt: currentStep === 'dashboard' ? new Date().toISOString() : null,
            lastUpdated: new Date().toISOString(),
        });
    }, [currentStep, setSavedProgress]);

    // Auto-navigate to dashboard if already verified
    React.useEffect(() => {
        if (merchantProfile?.onboarding_status === 'verified') {
            // FIXED: Type-safe step navigation
            const dashboardStep: OnboardingStep = 'dashboard';
            goToStep(dashboardStep);
        }
    }, [merchantProfile, goToStep]);

    // CRITICAL: Final submission handler with Supabase integration
    const handleFinalSubmit = async () => {
        console.log('Starting final submission with data:', onboardingData);
        setIsSubmitting(true);

        try {
            // Show loading toast
            toast({
                title: "Submitting Application",
                description: "Please wait while we process your onboarding details...",
            });

            // Here's where you'd save to Supabase
            // Example API call (replace with your actual Supabase logic):
            /*
            const { error } = await supabase
                .from('merchant_profiles')
                .upsert({
                    full_name: onboardingData.fullName,
                    business_name: onboardingData.businessName,
                    pan_number: onboardingData.panNumber,
                    aadhaar_number: onboardingData.aadhaarNumber,
                    gst_number: onboardingData.gstNumber,
                    bank_account_number: onboardingData.bankDetails.accountNumber,
                    bank_ifsc_code: onboardingData.bankDetails.ifscCode,
                    bank_name: onboardingData.bankDetails.bankName,
                    onboarding_status: 'submitted',
                    // ... other fields
                });
            
            if (error) throw error;
            */

            // Simulate API submission for now
            await new Promise(resolve => {
                setTimeout(() => {
                    console.log('Submission completed successfully');
                    resolve(true);
                }, 2000);
            });

            // Show success popup
            setShowSuccessPopup(true);

            // Success toast
            toast({
                title: "Application Submitted Successfully!",
                description: "Your application has been submitted for review.",
            });

        } catch (error) {
            console.error('Submission failed:', error);
            toast({
                variant: "destructive",
                title: "Submission Failed",
                description: "There was an error submitting your application. Please try again.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Show loading state while fetching profile
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

    // Handle dashboard step separately
    if (currentStep === 'dashboard') {
        return <OnboardingDashboard />;
    }

    const currentStepInfo = ONBOARDING_STEPS.find(step => step.id === currentStep);
    const CurrentStepComponent = currentStepInfo?.component || WelcomeScreen;

    // Check if step is completed
    const isStepCompleted = (stepId: string): boolean => {
        switch (stepId) {
            case 'welcome':
                return true;
            case 'registration':
                return Boolean(onboardingData.fullName && onboardingData.businessName && onboardingData.panNumber);
            case 'kyc':
                return onboardingData.kycData.isVideoCompleted;
            case 'bank-details':
                return Boolean(onboardingData.bankDetails.accountNumber && onboardingData.bankDetails.ifscCode);
            case 'review':
                return onboardingData.agreementAccepted;
            default:
                return false;
        }
    };

    // FIXED: Safe goToStep wrapper that validates step exists
    const handleGoToStep = (stepId: string) => {
        const stepExists = ONBOARDING_STEPS.find(step => step.id === stepId);
        if (stepExists) {
            // Type assertion since we know the stepId exists in our predefined steps
            goToStep(stepId as OnboardingStep);
        } else {
            console.warn(`Step "${stepId}" does not exist in ONBOARDING_STEPS`);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5">
            {/* Progress Header */}
            {currentStep !== 'welcome' && (
                <div className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b">
                    <div className="container max-w-6xl mx-auto px-4 py-4">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h1 className="text-xl font-semibold text-foreground">
                                    SabbPe Merchant Onboarding
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    Step {currentStepIndex + 1} of {totalSteps}: {currentStepInfo?.title}
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-medium text-foreground">
                                    {Math.round(progress)}% Complete
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {currentStepInfo?.description}
                                </div>
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
                                            onClick={() => handleGoToStep(step.id)} // FIXED: Use safe wrapper
                                            disabled={!isPast && !isActive}
                                            className={`
                                                relative flex items-center justify-center w-10 h-10 rounded-full
                                                transition-all duration-200 
                                                ${isActive
                                                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110'
                                                    : isCompleted
                                                        ? 'bg-green-500 text-white hover:bg-green-600'
                                                        : isPast
                                                            ? 'bg-muted-foreground/20 text-muted-foreground hover:bg-muted-foreground/30'
                                                            : 'bg-muted text-muted-foreground cursor-not-allowed'
                                                }
                                            `}
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

            {/* Main Content */}
            <div className="container max-w-6xl mx-auto px-4 py-8">
                <CurrentStepComponent
                    data={onboardingData}              // CRITICAL: Pass the data
                    onDataChange={handleDataChange}    // CRITICAL: Pass the update function
                    onNext={nextStep}
                    onPrevious={prevStep}
                    onPrev={prevStep}                  // Some components might use onPrev instead
                    onGoToStep={handleGoToStep}        // FIXED: Use safe wrapper
                    onSubmit={handleFinalSubmit}
                    currentStep={currentStep}
                    merchantProfile={merchantProfile}
                    isSubmitting={isSubmitting}
                />
            </div>

            {/* Success Popup */}
            <SuccessPopup
                isOpen={showSuccessPopup}
                onClose={() => setShowSuccessPopup(false)}
            />

            {/* Debug Panel */}
            {process.env.NODE_ENV === 'development' && (
                <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-xs">
                    <div className="font-bold mb-2">Debug Info:</div>
                    <div>Current Step: {currentStep}</div>
                    <div>Progress: {Math.round(progress)}%</div>
                    <div>Is Submitting: {isSubmitting ? 'Yes' : 'No'}</div>
                    <div>Show Success: {showSuccessPopup ? 'Yes' : 'No'}</div>
                    <div>Full Name: {onboardingData.fullName}</div>
                    <div>Email: {onboardingData.email}</div>
                    <div>Agreement: {onboardingData.agreementAccepted ? 'Yes' : 'No'}</div>
                </div>
            )}
        </div>
    );
};

export default EnhancedOnboardingFlow;