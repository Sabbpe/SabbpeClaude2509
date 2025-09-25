// hooks/useFileUpload.ts
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface UploadProgress {
    progress: number;
    uploading: boolean;
    error: string | null;
}

export const useFileUpload = () => {
    const [uploads, setUploads] = useState<Record<string, UploadProgress>>({});
    const { toast } = useToast();

    const validateFile = useCallback((file: File, maxSizeMB = 5) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        const maxSize = maxSizeMB * 1024 * 1024;

        if (!allowedTypes.includes(file.type)) {
            return { valid: false, error: 'Only JPEG, PNG, and PDF files are allowed' };
        }

        if (file.size > maxSize) {
            return { valid: false, error: `File size must be less than ${maxSizeMB}MB` };
        }

        if (file.size === 0) {
            return { valid: false, error: 'File cannot be empty' };
        }

        return { valid: true, error: null };
    }, []);

    const uploadFile = useCallback(async (
        file: File,
        bucket: string,
        path: string,
        onProgress?: (progress: number) => void
    ) => {
        const uploadId = `${bucket}-${path}`;

        // Validate file
        const validation = validateFile(file);
        if (!validation.valid) {
            toast({
                variant: "destructive",
                title: "Upload failed",
                description: validation.error,
            });
            return null;
        }

        setUploads(prev => ({
            ...prev,
            [uploadId]: { progress: 0, uploading: true, error: null }
        }));

        try {
            const { data, error } = await supabase.storage
                .from(bucket)
                .upload(path, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            setUploads(prev => ({
                ...prev,
                [uploadId]: { progress: 100, uploading: false, error: null }
            }));

            toast({
                title: "Upload successful",
                description: `${file.name} has been uploaded successfully.`,
            });

            return data;
        } catch (error: any) {
            setUploads(prev => ({
                ...prev,
                [uploadId]: { progress: 0, uploading: false, error: error.message }
            }));

            toast({
                variant: "destructive",
                title: "Upload failed",
                description: error.message,
            });

            return null;
        }
    }, [validateFile, toast]);

    const getUploadStatus = useCallback((uploadId: string) => {
        return uploads[uploadId] || { progress: 0, uploading: false, error: null };
    }, [uploads]);

    const clearUpload = useCallback((uploadId: string) => {
        setUploads(prev => {
            const { [uploadId]: _, ...rest } = prev;
            return rest;
        });
    }, []);

    return {
        uploadFile,
        getUploadStatus,
        clearUpload,
        validateFile,
    };
};
