import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

export interface MerchantProfile {
    id: string;
    user_id: string;
    full_name: string;
    mobile_number: string;
    email: string;
    pan_number?: string;
    aadhaar_number?: string;
    business_name?: string;
    gst_number?: string;
    onboarding_status: 'pending' | 'in_progress' | 'verified' | 'rejected';
    created_at: string;
    updated_at: string;
}

export interface BankDetails {
    id?: string;
    merchant_id: string;
    account_number: string;
    ifsc_code: string;
    bank_name: string;
    account_holder_name: string;
}

export interface DocumentUpload {
    id?: string;
    merchant_id: string;
    document_type: 'pan_card' | 'aadhaar_card' | 'business_proof' | 'bank_statement' | 'cancelled_cheque' | 'video_kyc' | 'selfie';
    file_name: string;
    file_path: string;
    file_size?: number;
    mime_type?: string;
    status: 'pending' | 'uploaded' | 'verified' | 'rejected';
    rejection_reason?: string;
}

export interface KYCData {
    id?: string;
    merchant_id: string;
    video_kyc_completed: boolean;
    location_captured: boolean;
    latitude?: number;
    longitude?: number;
    video_kyc_file_path?: string;
    selfie_file_path?: string;
    kyc_status: 'pending' | 'uploaded' | 'verified' | 'rejected';
    rejection_reason?: string;
}

export const useMerchantData = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [merchantProfile, setMerchantProfile] = useState<MerchantProfile | null>(null);
    const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
    const [documents, setDocuments] = useState<DocumentUpload[]>([]);
    const [kycData, setKycData] = useState<KYCData | null>(null);
    const [loading, setLoading] = useState(true);

    // Improved fetchMerchantProfile with abort controller
    const fetchMerchantProfile = useCallback(async () => {
        if (!user) return;

        const abortController = new AbortController();

        try {
            setLoading(true);
            const { data: profile, error } = await supabase
                .from('merchant_profiles')
                .select('*')
                .eq('user_id', user.id)
                .abortSignal(abortController.signal)
                .maybeSingle();

            if (error) throw error;

            if (profile) {
                setMerchantProfile(profile);
                // Fetch related data in parallel
                await Promise.all([
                    fetchBankDetails(profile.id, abortController.signal),
                    fetchDocuments(profile.id, abortController.signal),
                    fetchKYCData(profile.id, abortController.signal),
                ]);
            }
        } catch (error: any) {
            // Don't show error toast if request was aborted (component unmounted)
            if (error.name !== 'AbortError') {
                toast({
                    variant: "destructive",
                    title: "Error fetching profile",
                    description: error.message,
                });
            }
        } finally {
            // Only update loading state if request wasn't aborted
            if (!abortController.signal.aborted) {
                setLoading(false);
            }
        }

        // Return cleanup function
        return () => abortController.abort();
    }, [user, toast]);

    // Updated helper functions to accept abort signal
    const fetchBankDetails = async (merchantId: string, signal?: AbortSignal) => {
        const { data, error } = await supabase
            .from('merchant_bank_details')
            .select('*')
            .eq('merchant_id', merchantId)
            .abortSignal(signal)
            .maybeSingle();

        if (error && error.code !== 'PGRST116' && error.name !== 'AbortError') {
            console.error('Error fetching bank details:', error);
            return;
        }

        // Only update state if request wasn't aborted
        if (!signal?.aborted) {
            setBankDetails(data);
        }
    };

    const fetchDocuments = async (merchantId: string, signal?: AbortSignal) => {
        const { data, error } = await supabase
            .from('merchant_documents')
            .select('*')
            .eq('merchant_id', merchantId)
            .abortSignal(signal);

        if (error && error.name !== 'AbortError') {
            console.error('Error fetching documents:', error);
            return;
        }

        // Only update state if request wasn't aborted
        if (!signal?.aborted) {
            setDocuments(data || []);
        }
    };

    const fetchKYCData = async (merchantId: string, signal?: AbortSignal) => {
        const { data, error } = await supabase
            .from('merchant_kyc')
            .select('*')
            .eq('merchant_id', merchantId)
            .abortSignal(signal)
            .maybeSingle();

        if (error && error.code !== 'PGRST116' && error.name !== 'AbortError') {
            console.error('Error fetching KYC data:', error);
            return;
        }

        // Only update state if request wasn't aborted
        if (!signal?.aborted) {
            setKycData(data);
        }
    };

    // Effect with cleanup
    useEffect(() => {
        let cleanup: (() => void) | undefined;

        if (user) {
            fetchMerchantProfile().then(cleanupFn => {
                cleanup = cleanupFn;
            });
        }

        // Cleanup function to abort requests if component unmounts
        return () => {
            if (cleanup) {
                cleanup();
            }
        };
    }, [user, fetchMerchantProfile]);

    const updateMerchantProfile = async (updates: Partial<MerchantProfile>) => {
        if (!merchantProfile || !user) return;

        try {
            const { data, error } = await supabase
                .from('merchant_profiles')
                .update(updates)
                .eq('id', merchantProfile.id)
                .select()
                .single();

            if (error) throw error;

            setMerchantProfile(data);
            toast({
                title: "Profile updated",
                description: "Your profile has been updated successfully.",
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error updating profile",
                description: error.message,
            });
        }
    };

    const saveBankDetails = async (details: Omit<BankDetails, 'id'>) => {
        if (!merchantProfile) return;

        try {
            const { data, error } = await supabase
                .from('merchant_bank_details')
                .upsert({
                    ...details,
                    merchant_id: merchantProfile.id,
                })
                .select()
                .single();

            if (error) throw error;

            setBankDetails(data);
            toast({
                title: "Bank details saved",
                description: "Your bank details have been saved successfully.",
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error saving bank details",
                description: error.message,
            });
        }
    };

    const uploadDocument = async (file: File, documentType: DocumentUpload['document_type']) => {
        if (!merchantProfile || !user) return;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${documentType}-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('merchant-documents')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data, error } = await supabase
                .from('merchant_documents')
                .insert({
                    merchant_id: merchantProfile.id,
                    document_type: documentType,
                    file_name: file.name,
                    file_path: fileName,
                    file_size: file.size,
                    mime_type: file.type,
                    status: 'uploaded',
                })
                .select()
                .single();

            if (error) throw error;

            setDocuments(prev => [...prev, data]);
            toast({
                title: "Document uploaded",
                description: `${documentType.replace('_', ' ').toUpperCase()} has been uploaded successfully.`,
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error uploading document",
                description: error.message,
            });
        }
    };

    const updateKYCData = async (updates: Partial<KYCData>) => {
        if (!merchantProfile) return;

        try {
            const { data, error } = await supabase
                .from('merchant_kyc')
                .upsert({
                    merchant_id: merchantProfile.id,
                    ...updates,
                })
                .select()
                .single();

            if (error) throw error;

            setKycData(data);
            toast({
                title: "KYC data updated",
                description: "Your KYC information has been updated successfully.",
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error updating KYC data",
                description: error.message,
            });
        }
    };

    return {
        merchantProfile,
        bankDetails,
        documents,
        kycData,
        loading,
        updateMerchantProfile,
        saveBankDetails,
        uploadDocument,
        updateKYCData,
        refetch: fetchMerchantProfile,
    };
};