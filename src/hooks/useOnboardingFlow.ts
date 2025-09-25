// hooks/useOnboardingFlow.ts
import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

type OnboardingStep = 'welcome' | 'registration' | 'kyc' | 'bank-details' | 'review' | 'dashboard';

export const useOnboardingFlow = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Initialize step from URL or default to welcome
    const getInitialStep = (): OnboardingStep => {
        const searchParams = new URLSearchParams(location.search);
        const stepParam = searchParams.get('step') as OnboardingStep;
        const validSteps = ['welcome', 'registration', 'kyc', 'bank-details', 'review', 'dashboard'];
        return validSteps.includes(stepParam) ? stepParam : 'welcome';
    };

    const [currentStep, setCurrentStep] = useState<OnboardingStep>(getInitialStep);

    const steps: OnboardingStep[] = ['welcome', 'registration', 'kyc', 'bank-details', 'review'];
    const currentStepIndex = steps.indexOf(currentStep);
    const totalSteps = steps.length;
    const progress = ((currentStepIndex + 1) / totalSteps) * 100;

    // Update step from URL changes
    useEffect(() => {
        const newStep = getInitialStep();
        if (newStep !== currentStep) {
            setCurrentStep(newStep);
        }
    }, [location.search]);

    const goToStep = useCallback((step: OnboardingStep) => {
        console.log(`Navigating to step: ${step}`);
        setCurrentStep(step);

        // Use replace to avoid navigation issues
        navigate(`/merchant-onboarding?step=${step}`, { replace: true });
    }, [navigate]);

    const nextStep = useCallback(() => {
        const nextIndex = currentStepIndex + 1;
        if (nextIndex < steps.length) {
            goToStep(steps[nextIndex]);
        }
    }, [currentStepIndex, goToStep, steps]);

    const prevStep = useCallback(() => {
        const prevIndex = currentStepIndex - 1;
        if (prevIndex >= 0) {
            goToStep(steps[prevIndex]);
        }
    }, [currentStepIndex, goToStep, steps]);

    const canGoNext = currentStepIndex < steps.length - 1;
    const canGoPrev = currentStepIndex > 0;

    return {
        currentStep,
        currentStepIndex,
        totalSteps,
        progress,
        goToStep,
        nextStep,
        prevStep,
        canGoNext,
        canGoPrev,
    };
};