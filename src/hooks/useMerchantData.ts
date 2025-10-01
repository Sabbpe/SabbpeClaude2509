// src/hooks/useMerchantData.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';

// Types - match your DB schema
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
    entity_type?: string | null;
    onboarding_status: 'approved' | 'verified' | 'submitted' | 'validating' | 'pending_bank_approval' | 'validation_failed' | 'bank_rejected' | 'rejected'| 'in_progress'| 'pending';
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
                setMerchantProfile(profile as MerchantProfile);
                await Promise.all([
                    fetchBankDetails(profile.id, abortController.signal),
                    fetchDocuments(profile.id, abortController.signal),
                    fetchKYCData(profile.id, abortController.signal),
                ]);
            }
        } catch (error) {
            if (error instanceof Error && error.name !== 'AbortError') {
                toast({ variant: 'destructive', title: 'Error fetching profile', description: error.message });
            }
        } finally {
            if (!abortController.signal.aborted) setLoading(false);
        }
        return () => abortController.abort();
    }, [user, toast]);

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
        if (!signal?.aborted) setBankDetails(data);
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
        if (!signal?.aborted) setDocuments(data || []);
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
        if (!signal?.aborted) setKycData(data);
    };

    useEffect(() => {
        let cleanup: (() => void) | undefined;
        if (user) {
            fetchMerchantProfile().then(fn => { cleanup = fn; });
        }
        return () => { if (cleanup) cleanup(); };
    }, [user, fetchMerchantProfile]);

    const updateMerchantProfile = async (updates: Partial<MerchantProfile>) => {
        if (!merchantProfile && !user) return;

        try {
            // Map internal statuses to database-allowed statuses
            const mapStatus = (status?: string): 'approved' | 'verified' | 'submitted' | 'rejected' | 'in_progress' | 'pending' | undefined => {
                if (!status) return undefined;

                const statusMap: Record<string, 'approved' | 'verified' | 'submitted' | 'rejected' | 'in_progress' | 'pending'> = {
                    'validating': 'in_progress',
                    'pending_bank_approval': 'in_progress',
                    'validation_failed': 'rejected',
                    'bank_rejected': 'rejected',
                    'approved': 'approved',
                    'verified': 'verified',
                    'submitted': 'submitted',
                    'rejected': 'rejected',
                    'in_progress': 'in_progress',
                    'pending': 'pending'
                };

                return statusMap[status] || 'pending';
            };

            const payload = {
                user_id: merchantProfile?.user_id || user!.id,
                full_name: updates.full_name || merchantProfile?.full_name || user?.user_metadata?.full_name || 'Unknown',
                email: updates.email || merchantProfile?.email || user?.email || '',
                mobile_number: updates.mobile_number || merchantProfile?.mobile_number || user?.phone || '',
                onboarding_status: mapStatus(updates.onboarding_status),
                pan_number: updates.pan_number,
                aadhaar_number: updates.aadhaar_number,
                business_name: updates.business_name,
                gst_number: updates.gst_number,
                entity_type: updates.entity_type,
                created_at: updates.created_at,
                updated_at: updates.updated_at,
            };

            const { data, error } = await supabase
                .from('merchant_profiles')
                .upsert(payload, { onConflict: 'user_id' })
                .select()
                .single();

            if (error) throw error;
            setMerchantProfile(data as MerchantProfile);
            toast({
                title: 'Profile updated',
                description: 'Your profile has been updated successfully.'
            });
            return data;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update profile';
            toast({
                variant: 'destructive',
                title: 'Error updating profile',
                description: message
            });
            throw error;
        }
    };

    const saveBankDetails = async (details: Omit<BankDetails, 'id' | 'merchant_id'>) => {
        if (!merchantProfile) throw new Error('Merchant profile not found');
        try {
            const payload = { merchant_id: merchantProfile.id, ...details };
            const { data, error } = await supabase
                .from('merchant_bank_details')
                .upsert(payload, { onConflict: 'merchant_id' })
                .select()
                .maybeSingle();
            if (error) throw error;
            setBankDetails(data);
            toast({ title: 'Bank details saved', description: 'Your bank details have been saved successfully.' });
            return data;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save bank details';
            toast({ variant: 'destructive', title: 'Error saving bank details', description: message });
            throw error;
        }
    };

    const uploadDocument = async (file: File, documentType: DocumentUpload['document_type']) => {
        if (!merchantProfile || !user) throw new Error('Merchant not ready');

        try {
            // build a stable path that includes user id for RLS policy & an identifying suffix
            const safeUser = user?.id ? user.id.replace(/\//g, '_') : 'unknown';
            const fileExt = file.name.split('.').pop();
            const fileName = `${safeUser}_${documentType}_${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('merchant-documents')
                .upload(fileName, file, { cacheControl: '3600', upsert: false });

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
                    uploaded_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (error) throw error;

            setDocuments(prev => [...prev, data]);
            toast({ title: 'Document uploaded', description: `${documentType.replace('_', ' ')} uploaded.` });
            return data;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to upload document';
            toast({ variant: 'destructive', title: 'Error uploading document', description: message });
            throw error;
        }
    };

    const updateKYCData = async (updates: Partial<KYCData>) => {
        if (!merchantProfile) throw new Error('Merchant profile not found');
        try {
            const payload = { merchant_id: merchantProfile.id, ...updates };
            const { data, error } = await supabase
                .from('merchant_kyc')
                .upsert(payload, { onConflict: 'merchant_id' })
                .select()
                .single();
            if (error) throw error;
            setKycData(data);
            toast({ title: 'KYC data updated', description: 'Your KYC information has been updated.' });
            return data;
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update KYC data';
            toast({ variant: 'destructive', title: 'Error updating KYC data', description: message });
            throw error;
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
