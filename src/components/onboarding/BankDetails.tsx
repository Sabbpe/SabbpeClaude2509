// src/components/onboarding/BankDetails.tsx - FIXED VERSION WITH PROPER TYPES
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle, AlertCircle, Loader2, CreditCard, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useBankValidation } from '@/hooks/useBankValidation';
import { useMerchantData } from '@/hooks/useMerchantData';
import { supabase } from '@/lib/supabase';
import { OnboardingData } from '@/pages/EnhancedMerchantOnboarding';

export interface BankDetailsData {
    accountNumber: string;      // Remove '?'
    confirmAccountNumber: string; // Remove '?'
    ifscCode: string;           // Remove '?'
    bankName: string;           // Remove '?'
    accountHolderName: string;
}

interface BankDetailsProps {
    onNext: () => void;
    onPrev: () => void;
    data?: OnboardingData;
    onDataChange?: (data: Partial<OnboardingData>) => void;
}

export const BankDetails: React.FC<BankDetailsProps> = ({
    onNext,
    onPrev,
    data,
    onDataChange
}) => {
    const { toast } = useToast();
    const { saveBankDetails, merchantProfile } = useMerchantData();
    const {
        validateIfscCode,
        validateAccountNumber,
        getIFSCValidationStatus,
        getIFSCMessage,
        getIFSCMessageColor,
        isValidatingIfsc,
        ifscValidation
    } = useBankValidation();

    // Form state - initialize from parent data
    const [formData, setFormData] = useState<BankDetailsData>({
        ifscCode: data?.bankDetails?.ifscCode || '',
        accountNumber: data?.bankDetails?.accountNumber || '',
        confirmAccountNumber: data?.bankDetails?.confirmAccountNumber || '',
        accountHolderName: data?.bankDetails?.accountHolderName || '',
        bankName: data?.bankDetails?.bankName || ''
    });

    const [cancelledCheque, setCancelledCheque] = useState<File | null>(
        data?.documents?.cancelledCheque?.file || null
    );
    const [errors, setErrors] = useState<Partial<Record<keyof BankDetailsData | 'cancelledCheque', string>>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Clear errors when field values change
    const clearError = (field: keyof BankDetailsData | 'cancelledCheque') => {
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    // Handle input changes and update parent immediately
    const handleInputChange = (field: keyof BankDetailsData) => (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const value = e.target.value;
        let processedValue = value;

        // Special handling for IFSC code
        if (field === 'ifscCode') {
            processedValue = value.trim().toUpperCase();
        }

        const newFormData: BankDetailsData = { ...formData, [field]: processedValue };
        setFormData(newFormData);
        clearError(field);

        // ✅ UPDATE PARENT IMMEDIATELY
        if (onDataChange) {
            onDataChange({
                bankDetails: newFormData
            });
        }
    };

    // Auto-validate IFSC when it's complete
    useEffect(() => {
        const ifscCode = formData.ifscCode.trim();

        if (ifscCode.length === 11) {
            const timeoutId = setTimeout(async () => {
                try {
                    const result = await validateIfscCode(ifscCode);
                    if (!result.isValid && result.error) {
                        setErrors(prev => ({ ...prev, ifscCode: result.error }));
                    } else {
                        clearError('ifscCode');
                        // Update bank name from validation
                        if (result.bankName) {
                            const newFormData: BankDetailsData = { ...formData, bankName: result.bankName };
                            setFormData(newFormData);
                            if (onDataChange) {
                                onDataChange({ bankDetails: newFormData });
                            }
                        }
                    }
                } catch (error) {
                    console.error('IFSC validation failed:', error);
                }
            }, 500);

            return () => clearTimeout(timeoutId);
        }
    }, [formData.ifscCode]);

    // ✅ FIXED: Upload file to Supabase AND update parent state
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file
        const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!validTypes.includes(file.type)) {
            toast({
                variant: "destructive",
                title: "Invalid File Type",
                description: "Please upload a JPG, PNG, or PDF file.",
            });
            return;
        }

        if (file.size > maxSize) {
            toast({
                variant: "destructive",
                title: "File Too Large",
                description: "Please upload a file smaller than 5MB.",
            });
            return;
        }

        try {
            // Get user info for folder structure
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                throw new Error("User not authenticated");
            }

            const safePhone = user?.phone?.replace(/\D/g, "") || "unknown";
            const userId = user.id;
            const fileName = `${Date.now()}_${file.name}`;
            const filePath = `${userId}_${safePhone}/cancelled-cheques/${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('merchant-documents')
                .upload(filePath, file);

            if (uploadError) {
                throw new Error('Failed to upload to storage');
            }

            // Update local state
            setCancelledCheque(file);
            clearError('cancelledCheque');

            // ✅ CRITICAL FIX: Update parent state with document info
            if (onDataChange) {
                onDataChange({
                    documents: {
                        ...data?.documents,
                        cancelledCheque: {
                            file: file,
                            path: filePath
                        }
                    }
                });
            }

            toast({
                title: "File Uploaded",
                description: "Cancelled cheque uploaded successfully",
            });

        } catch (error) {
            console.error('Upload error:', error);
            toast({
                variant: "destructive",
                title: "Upload Failed",
                description: error instanceof Error ? error.message : "Failed to upload file",
            });
        }
    };

    // Form validation
    const validateForm = (): boolean => {
        const newErrors: Partial<Record<keyof BankDetailsData | 'cancelledCheque', string>> = {};

        // IFSC validation
        if (!formData.ifscCode.trim()) {
            newErrors.ifscCode = 'IFSC code is required';
        } else if (formData.ifscCode.length !== 11) {
            newErrors.ifscCode = 'IFSC code must be exactly 11 characters';
        } else if (!ifscValidation.isValid) {
            newErrors.ifscCode = ifscValidation.error || 'Invalid IFSC code';
        }

        // Account number validation
        if (!formData.accountNumber.trim()) {
            newErrors.accountNumber = 'Account number is required';
        } else if (!validateAccountNumber(formData.accountNumber)) {
            newErrors.accountNumber = 'Invalid account number (9-18 digits required)';
        }

        // Confirm account number
        if (formData.accountNumber !== formData.confirmAccountNumber) {
            newErrors.confirmAccountNumber = 'Account numbers do not match';
        }

        // Account holder name
        if (!formData.accountHolderName.trim()) {
            newErrors.accountHolderName = 'Account holder name is required';
        }

        // Cancelled cheque - check both local and parent state
        const hasCheque = cancelledCheque || data?.documents?.cancelledCheque?.file;
        if (!hasCheque) {
            newErrors.cancelledCheque = 'Cancelled cheque is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleNext = async () => {
        if (!validateForm()) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "Please fix the errors in the form.",
            });
            return;
        }

        if (!merchantProfile) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Merchant profile not found",
            });
            return;
        }

        setIsSubmitting(true);

        try {
            // Save bank details to database
            await saveBankDetails({
                account_number: formData.accountNumber,
                ifsc_code: formData.ifscCode,
                bank_name: formData.bankName,
                account_holder_name: formData.accountHolderName,
            });

            // Ensure parent has all the latest data before proceeding
            if (onDataChange) {
                onDataChange({
                    bankDetails: {
                        ...formData,
                        bankName: ifscValidation.bankName || formData.bankName
                    }
                });
            }

            toast({
                title: "Bank Details Saved",
                description: "Your bank information has been successfully recorded.",
            });

            onNext();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save';
            toast({
                variant: "destructive",
                title: "Save Failed",
                description: message,
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Get IFSC field display state
    const ifscStatus = getIFSCValidationStatus(formData.ifscCode);
    const ifscMessage = getIFSCMessage(formData.ifscCode);
    const ifscMessageColor = getIFSCMessageColor(formData.ifscCode);
    const showIFSCError = errors.ifscCode && ifscStatus !== 'validating';

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">Bank Account Information</h2>
                <p className="text-gray-600 mt-2">
                    Enter your bank details for payment settlement
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bank Account Information */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            Bank Account Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* IFSC Code */}
                        <div>
                            <Label htmlFor="ifscCode">IFSC Code *</Label>
                            <div className="relative">
                                <Input
                                    id="ifscCode"
                                    value={formData.ifscCode}
                                    onChange={handleInputChange('ifscCode')}
                                    placeholder="e.g., SBIN0003301"
                                    className={`${showIFSCError ? 'border-red-500' :
                                        ifscStatus === 'valid' ? 'border-green-500' : ''} uppercase`}
                                    maxLength={11}
                                />
                                {isValidatingIfsc && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    </div>
                                )}
                                {ifscStatus === 'valid' && !isValidatingIfsc && (
                                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                    </div>
                                )}
                            </div>

                            {showIFSCError ? (
                                <div className="flex items-center gap-1 mt-1">
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                    <p className="text-sm text-red-500">{errors.ifscCode}</p>
                                </div>
                            ) : ifscMessage && (
                                <p className={`text-xs mt-1 ${ifscMessageColor}`}>
                                    {ifscMessage}
                                </p>
                            )}
                        </div>

                        {/* Bank Info Display */}
                        {ifscStatus === 'valid' && ifscValidation.bankName && (
                            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                    <span className="font-semibold text-green-800">Bank Verified</span>
                                </div>
                                <div className="space-y-1 text-sm">
                                    <div>
                                        <span className="text-gray-600">Bank:</span>
                                        <span className="ml-2 font-medium">{ifscValidation.bankName}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-600">Branch:</span>
                                        <span className="ml-2 font-medium">{ifscValidation.branch}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Account Holder Name */}
                        <div>
                            <Label htmlFor="accountHolderName">Account Holder Name *</Label>
                            <Input
                                id="accountHolderName"
                                value={formData.accountHolderName}
                                onChange={handleInputChange('accountHolderName')}
                                placeholder="As per bank records"
                                className={errors.accountHolderName ? 'border-red-500' : ''}
                            />
                            {errors.accountHolderName && (
                                <div className="flex items-center gap-1 mt-1">
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                    <p className="text-sm text-red-500">{errors.accountHolderName}</p>
                                </div>
                            )}
                        </div>

                        {/* Account Number */}
                        <div>
                            <Label htmlFor="accountNumber">Account Number *</Label>
                            <Input
                                id="accountNumber"
                                value={formData.accountNumber}
                                onChange={handleInputChange('accountNumber')}
                                placeholder="Enter account number"
                                className={errors.accountNumber ? 'border-red-500' : ''}
                            />
                            {errors.accountNumber && (
                                <div className="flex items-center gap-1 mt-1">
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                    <p className="text-sm text-red-500">{errors.accountNumber}</p>
                                </div>
                            )}
                        </div>

                        {/* Confirm Account Number */}
                        <div>
                            <Label htmlFor="confirmAccountNumber">Confirm Account Number *</Label>
                            <Input
                                id="confirmAccountNumber"
                                value={formData.confirmAccountNumber}
                                onChange={handleInputChange('confirmAccountNumber')}
                                placeholder="Re-enter account number"
                                className={errors.confirmAccountNumber ? 'border-red-500' : ''}
                            />
                            {errors.confirmAccountNumber && (
                                <div className="flex items-center gap-1 mt-1">
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                    <p className="text-sm text-red-500">{errors.confirmAccountNumber}</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Supporting Documents */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Supporting Documents
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Cancelled Cheque Upload */}
                        <div>
                            <Label htmlFor="cancelledCheque">Upload Cancelled Cheque *</Label>
                            <div className="mt-2">
                                <input
                                    type="file"
                                    id="cancelledCheque"
                                    accept="image/*,.pdf"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                />
                                <label
                                    htmlFor="cancelledCheque"
                                    className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 
                                        ${errors.cancelledCheque ? 'border-red-500' : 'border-gray-300'}`}
                                >
                                    {(cancelledCheque || data?.documents?.cancelledCheque?.file) ? (
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="h-5 w-5 text-green-600" />
                                            <span className="text-sm font-medium">
                                                {(cancelledCheque || data?.documents?.cancelledCheque?.file)?.name}
                                            </span>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="h-8 w-8 text-gray-400" />
                                            <span className="mt-2 text-sm text-gray-600">
                                                Click to upload cancelled cheque
                                            </span>
                                            <span className="text-xs text-gray-400">
                                                JPG, PNG, or PDF (Max 5MB)
                                            </span>
                                        </>
                                    )}
                                </label>
                            </div>
                            {errors.cancelledCheque && (
                                <div className="flex items-center gap-1 mt-1">
                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                    <p className="text-sm text-red-500">{errors.cancelledCheque}</p>
                                </div>
                            )}
                        </div>

                        {/* Requirements */}
                        <div className="p-4 bg-blue-50 rounded-lg">
                            <h4 className="font-semibold text-blue-900 mb-2">Requirements:</h4>
                            <ul className="text-sm text-blue-800 space-y-1">
                                <li>• Cheque should be from the same account</li>
                                <li>• Account number should be clearly visible</li>
                                <li>• IFSC code should be visible</li>
                                <li>• Write "CANCELLED" across the cheque</li>
                                <li>• Image should be clear and readable</li>
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-6">
                <Button
                    variant="outline"
                    onClick={onPrev}
                    disabled={isSubmitting}
                >
                    Back
                </Button>
                <Button
                    onClick={handleNext}
                    disabled={isSubmitting}
                    className="min-w-[120px]"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Saving...
                        </>
                    ) : (
                        'Next: Review'
                    )}
                </Button>
            </div>
        </div>
    );
};