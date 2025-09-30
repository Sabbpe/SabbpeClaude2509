// src/types/merchant.ts

export type OnboardingStatus =
    | 'draft'
    | 'submitted'
    | 'validating'
    | 'pending_bank_approval'
    | 'approved'
    | 'rejected';

export interface MerchantDocument {
    type: 'business_license' | 'tax_certificate' | 'id_proof' | 'bank_statement' | 'other';
    url: string;
    filename: string;
    uploadedAt: string;
    verified?: boolean;
}

export interface MerchantSubmission {
    businessName: string;
    businessType: string;
    registrationNumber: string;
    taxId: string;
    email: string;
    phone: string;
    website?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    documents: MerchantDocument[];
    metadata?: Record<string, string | number | boolean | null>;
}

export interface BankResponseData {
    success: boolean;
    applicationId?: string;
    message?: string;
    estimatedProcessingTime?: string;
    additionalData?: Record<string, string | number | boolean>;
}

export interface MerchantProfile extends MerchantSubmission {
    id: string;
    userId: string;
    onboardingStatus: OnboardingStatus;
    bankApplicationId?: string;
    bankResponse?: BankResponseData;
    rejectionReason?: string;
    submittedAt?: string;
    validatedAt?: string;
    bankSubmittedAt?: string;
    decisionAt?: string;
    createdAt: string;
    updatedAt: string;
}

export interface StatusUpdate {
    merchantId: string;
    fromStatus: OnboardingStatus;
    toStatus: OnboardingStatus;
    reason?: string;
    metadata?: Record<string, string | number | boolean | null>;
}