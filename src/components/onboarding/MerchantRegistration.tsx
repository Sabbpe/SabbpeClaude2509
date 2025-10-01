// components/onboarding/MerchantRegistration.tsx - COMPLETE CODE
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
    Upload,
    FileText,
    User,
    Building,
    CheckCircle,
    RefreshCw,
    Sparkles,
    CreditCard,
    Camera,
    AlertTriangle,
    Settings
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ExtractedData {
    panNumber?: string;
    aadhaarNumber?: string;
    extractedName?: string;
    dateOfBirth?: string;
    confidence: number;
}

interface DocumentUploadCardProps {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    file: File | null;
    uploadStatus: 'idle' | 'uploading' | 'success' | 'failed';
    ocrStatus: 'idle' | 'processing' | 'success' | 'failed';
    ocrProgress?: number;
    onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    description: string;
    uploadError?: string;
    ocrError?: string;
}

interface AutoFillInputProps {
    label: string;
    field: keyof FormData;
    placeholder: string;
    type?: string;
    maxLength?: number;
    required?: boolean;
}

interface FormData {
    fullName: string;
    panNumber: string;
    aadhaarNumber: string;
    mobileNumber: string;
    email: string;
    businessName: string;
    gstNumber: string;
    hasGST: boolean;
}

interface MerchantRegistrationProps {
    onNext?: () => void;
    onPrev?: () => void;
    data?: {
        fullName?: string;
        panNumber?: string;
        aadhaarNumber?: string;
        mobileNumber?: string;
        email?: string;
        businessName?: string;
        gstNumber?: string;
        hasGST?: boolean;
        documents?: {
            panCard?: { file: File; path: string };
            aadhaarCard?: { file: File; path: string };
            businessProof?: { file: File; path: string };
            cancelledCheque?: { file: File; path: string };
        };
    };
    onDataChange?: (data: {
        fullName?: string;
        panNumber?: string;
        aadhaarNumber?: string;
        mobileNumber?: string;
        email?: string;
        businessName?: string;
        gstNumber?: string;
        hasGST?: boolean;
        documents?: {
            panCard?: { file: File; path: string };
            aadhaarCard?: { file: File; path: string };
            businessProof?: { file: File; path: string };
            cancelledCheque?: { file: File; path: string };
        };
    }) => void;
}

interface DocumentState {
    file: File | null;
    uploadStatus: 'idle' | 'uploading' | 'success' | 'failed';
    ocrStatus: 'idle' | 'processing' | 'success' | 'failed';
    ocrProgress: number;
    uploadPath?: string;
    uploadError?: string;
    ocrError?: string;
}

// Real OCR Service using OCR.space
class RealOCRService {
    private apiKey = 'K88739396488957';

    private async preprocessImage(file: File): Promise<Blob> {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }

            img.onload = function () {
                console.log(`Original image size: ${img.width}x${img.height}`);

                let scaleFactor = 1;
                const maxWidth = 2048;

                if (img.width > maxWidth) {
                    scaleFactor = maxWidth / img.width;
                }

                canvas.width = img.width * scaleFactor;
                canvas.height = img.height * scaleFactor;

                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

                    let enhanced = ((gray - 128) * 1.15) + 128;
                    enhanced += 5;
                    enhanced = Math.max(0, Math.min(255, enhanced));

                    data[i] = data[i + 1] = data[i + 2] = enhanced;
                }

                ctx.putImageData(imageData, 0, 0);

                console.log(`Resized to: ${canvas.width}x${canvas.height} (${scaleFactor.toFixed(2)}x)`);

                canvas.toBlob((blob) => {
                    if (blob) {
                        console.log(`Final image size: ${(blob.size / 1024).toFixed(1)} KB`);
                        resolve(blob);
                    } else {
                        reject(new Error('Failed to create image blob'));
                    }
                }, 'image/jpeg', 0.6);
            };

            img.onerror = () => reject(new Error('Failed to load image'));

            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result;
                if (typeof result === 'string') {
                    img.src = result;
                } else {
                    reject(new Error('Failed to read file'));
                }
            };
            reader.readAsDataURL(file);
        });
    }

    private detectDocumentType(text: string): 'pan_card' | 'aadhaar_card' | 'unknown' {
        const cleanText = text.toUpperCase().replace(/[^A-Z0-9\s]/g, ' ');

        const panPatterns = [
            /INCOME\s*TAX\s*DEPARTMENT/,
            /PERMANENT\s*ACCOUNT\s*NUMBER/,
            /GOVT?\s*OF\s*INDIA/,
            /PAN/
        ];

        const aadhaarPatterns = [
            /UNIQUE\s*IDENTIFICATION\s*AUTHORITY/,
            /GOVERNMENT\s*OF\s*INDIA/,
            /AADHAAR/,
            /\bUID\b/
        ];

        const panMatches = panPatterns.filter(pattern => pattern.test(cleanText)).length;
        const aadhaarMatches = aadhaarPatterns.filter(pattern => pattern.test(cleanText)).length;

        const panNumberPattern = /[A-Z]{5}[0-9]{4}[A-Z]{1}/;
        const aadhaarNumberPattern = /[2-9]{1}[0-9]{3}[\s-]?[0-9]{4}[\s-]?[0-9]{4}/;

        const hasPanNumber = panNumberPattern.test(cleanText);
        const hasAadhaarNumber = aadhaarNumberPattern.test(cleanText);

        if ((panMatches >= 1 || hasPanNumber) && panMatches >= aadhaarMatches) {
            return 'pan_card';
        } else if ((aadhaarMatches >= 1 || hasAadhaarNumber) && aadhaarMatches >= panMatches) {
            return 'aadhaar_card';
        } else {
            return 'unknown';
        }
    }

    private extractPANData(text: string): ExtractedData {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        const cleanText = text.replace(/[^\w\s/-]/g, ' ').replace(/\s+/g, ' ');

        const panMatch = cleanText.match(/[A-Z]{5}[0-9]{4}[A-Z]{1}/);
        const panNumber = panMatch ? panMatch[0] : undefined;

        const dobPatterns = [
            /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/,
            /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})/
        ];

        let dateOfBirth;
        for (const pattern of dobPatterns) {
            const dobMatch = cleanText.match(pattern);
            if (dobMatch) {
                dateOfBirth = dobMatch[0];
                break;
            }
        }

        const excludeWords = ['INCOME', 'TAX', 'DEPARTMENT', 'GOVT', 'GOVERNMENT', 'INDIA', 'PERMANENT', 'ACCOUNT', 'NUMBER', 'SIGNATURE', 'PAN'];
        let extractedName;
        let maxScore = 0;

        for (const line of lines) {
            const words = line.toUpperCase().split(/\s+/);
            const hasExcluded = words.some(word => excludeWords.some(exc => word.includes(exc)));
            const isAllCaps = line === line.toUpperCase();
            const hasLetters = /[A-Z]/.test(line);
            const hasNumbers = /[0-9]/.test(line);

            if (!hasExcluded && isAllCaps && hasLetters && !hasNumbers && line.length > 3) {
                const score = line.length + (words.length * 2);
                if (score > maxScore) {
                    maxScore = score;
                    extractedName = line.trim();
                }
            }
        }

        return {
            panNumber,
            extractedName,
            dateOfBirth,
            confidence: panNumber ? 85 : 40
        };
    }

    private extractAadhaarData(text: string): ExtractedData {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        const cleanText = text.replace(/[^\w\s/-]/g, ' ').replace(/\s+/g, ' ');

        const aadhaarPatterns = [
            /[2-9]{1}[0-9]{3}[\s-]?[0-9]{4}[\s-]?[0-9]{4}/,
            /[2-9][0-9]{11}/
        ];

        let aadhaarNumber;
        for (const pattern of aadhaarPatterns) {
            const match = cleanText.match(pattern);
            if (match) {
                const rawNumber = match[0].replace(/[\s-]/g, '');
                aadhaarNumber = rawNumber.replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3');
                break;
            }
        }

        const dobPatterns = [
            /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/,
            /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})/
        ];

        let dateOfBirth;
        for (const pattern of dobPatterns) {
            const dobMatch = cleanText.match(pattern);
            if (dobMatch) {
                dateOfBirth = dobMatch[0];
                break;
            }
        }

        const excludeWords = ['UNIQUE', 'IDENTIFICATION', 'AUTHORITY', 'GOVERNMENT', 'INDIA', 'AADHAAR', 'MALE', 'FEMALE', 'DOB', 'VID'];
        let extractedName;
        let maxScore = 0;

        for (const line of lines) {
            const words = line.toUpperCase().split(/\s+/);
            const hasExcluded = words.some(word => excludeWords.some(exc => word.includes(exc)));
            const isAllCaps = line === line.toUpperCase();
            const hasLetters = /[A-Z]/.test(line);
            const hasNumbers = /[0-9]/.test(line);

            if (!hasExcluded && isAllCaps && hasLetters && !hasNumbers && line.length > 3) {
                const score = line.length + (words.length * 2);
                if (score > maxScore) {
                    maxScore = score;
                    extractedName = line.trim();
                }
            }
        }

        return {
            aadhaarNumber,
            extractedName,
            dateOfBirth,
            confidence: aadhaarNumber ? 85 : 40
        };
    }

    async processDocument(
        file: File,
        onProgress?: (progress: number) => void
    ): Promise<ExtractedData> {
        console.log('Starting OCR processing:', file.name);

        try {
            onProgress?.(10);

            const processedImage = await this.preprocessImage(file);
            onProgress?.(30);

            const formData = new FormData();
            formData.append('file', processedImage, 'document.png');
            formData.append('apikey', this.apiKey);
            formData.append('language', 'eng');
            formData.append('isOverlayRequired', 'false');
            formData.append('detectOrientation', 'true');
            formData.append('scale', 'true');
            formData.append('OCREngine', '2');

            onProgress?.(50);

            const response = await fetch('https://api.ocr.space/parse/image', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            onProgress?.(80);

            if (result.OCRExitCode === 1 && result.ParsedResults?.length > 0) {
                const extractedText = result.ParsedResults[0].ParsedText;
                console.log('OCR Text:', extractedText);

                const docType = this.detectDocumentType(extractedText);
                console.log('Document type detected:', docType);

                onProgress?.(100);

                if (docType === 'pan_card') {
                    return this.extractPANData(extractedText);
                } else if (docType === 'aadhaar_card') {
                    return this.extractAadhaarData(extractedText);
                } else {
                    throw new Error('Document type not recognized');
                }
            } else {
                throw new Error('OCR processing failed: ' + (result.ErrorMessage || 'Unknown error'));
            }

        } catch (error) {
            console.error('OCR processing error:', error);
            throw error;
        }
    }
}

const ocrService = new RealOCRService();

const MerchantRegistration: React.FC<MerchantRegistrationProps> = ({
    onNext,
    onPrev,
    data,
    onDataChange
}) => {
    const { toast } = useToast();

    const [formData, setFormData] = useState<FormData>({
        fullName: data?.fullName || '',
        panNumber: data?.panNumber || '',
        aadhaarNumber: data?.aadhaarNumber || '',
        mobileNumber: data?.mobileNumber || '',
        email: data?.email || '',
        businessName: data?.businessName || '',
        gstNumber: data?.gstNumber || '',
        hasGST: data?.hasGST ?? true
    });

    const [panDocument, setPanDocument] = useState<DocumentState>({
        file: null,
        uploadStatus: 'idle',
        ocrStatus: 'idle',
        ocrProgress: 0
    });

    const [aadhaarDocument, setAadhaarDocument] = useState<DocumentState>({
        file: null,
        uploadStatus: 'idle',
        ocrStatus: 'idle',
        ocrProgress: 0
    });

    const [businessProof, setBusinessProof] = useState<File | null>(null);
    const [bankStatement, setBankStatement] = useState<File | null>(null);
    const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());

    // Upload to Supabase
    const uploadToSupabase = async (file: File, folder: string): Promise<string> => {
        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
            throw new Error("User not authenticated");
        }
        const safePhone = user?.phone
            ? user.phone.replace(/\D/g, "")
            : "unknown";
        const userId = user.id;
        const fileName = `${Date.now()}_${file.name}`;
        const filePath = `${userId}_${safePhone}/${folder}/${fileName}`;

        const { data: uploadData, error } = await supabase.storage
            .from('merchant-documents')
            .upload(filePath, file);

        if (error) {
            console.error('Supabase upload error:', error);
            throw new Error('Failed to upload to storage');
        }

        return filePath;
    };

    // Apply OCR results to form
    const applyOCRResults = useCallback((result: ExtractedData, docType: 'pan' | 'aadhaar') => {
        const updates: Partial<FormData> = {};
        const newAutoFilled = new Set(autoFilledFields);

        if (docType === 'pan' && result.panNumber) {
            updates.panNumber = result.panNumber;
            newAutoFilled.add('panNumber');
        }

        if (docType === 'aadhaar' && result.aadhaarNumber) {
            updates.aadhaarNumber = result.aadhaarNumber;
            newAutoFilled.add('aadhaarNumber');
        }

        if (result.extractedName && !formData.fullName) {
            updates.fullName = result.extractedName;
            newAutoFilled.add('fullName');
        }

        if (Object.keys(updates).length > 0) {
            setFormData(prevFormData => {
                const newData = { ...prevFormData, ...updates };
                // Delay parent update to avoid setState during render
                setTimeout(() => {
                    onDataChange?.({ ...data, ...newData });
                }, 0);
                return newData;
            });
            setAutoFilledFields(newAutoFilled);
        }
    }, [formData.fullName, autoFilledFields, data, onDataChange]);

    // Handle PAN upload and OCR
    const handlePanUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setPanDocument({
            file,
            uploadStatus: 'uploading',
            ocrStatus: 'processing',
            ocrProgress: 0
        });

        const uploadPromise = uploadToSupabase(file, 'pan-cards');
        const ocrPromise = ocrService.processDocument(file, (progress) => {
            setPanDocument(prev => ({ ...prev, ocrProgress: progress }));
        });

        try {
            const results = await Promise.allSettled([uploadPromise, ocrPromise]);
            const uploadResult = results[0];
            const ocrResult = results[1];

            const finalState: DocumentState = {
                file,
                uploadStatus: uploadResult.status === 'fulfilled' ? 'success' : 'failed',
                ocrStatus: ocrResult.status === 'fulfilled' ? 'success' : 'failed',
                ocrProgress: 100
            };

            if (uploadResult.status === 'fulfilled') {
                finalState.uploadPath = uploadResult.value;

                onDataChange?.({
                    ...data,
                    documents: {
                        ...data?.documents,
                        panCard: { file, path: uploadResult.value }
                    }
                });
            } else {
                finalState.uploadError = 'Upload failed';
                console.error('Upload failed:', uploadResult.reason);
            }

            if (ocrResult.status === 'fulfilled') {
                applyOCRResults(ocrResult.value, 'pan');

                if (uploadResult.status === 'fulfilled') {
                    toast({
                        title: "PAN Card Processed Successfully",
                        description: `File uploaded and data extracted (${ocrResult.value.confidence}% confidence)`,
                    });
                } else {
                    toast({
                        title: "OCR Completed",
                        description: "Data extracted but upload failed. Please try uploading again.",
                        variant: "destructive"
                    });
                }
            } else {
                finalState.ocrError = ocrResult.reason instanceof Error ? ocrResult.reason.message : 'OCR failed';
                console.error('OCR failed:', ocrResult.reason);

                if (uploadResult.status === 'fulfilled') {
                    toast({
                        title: "File Uploaded Successfully",
                        description: "PAN card uploaded but OCR failed. Please enter details manually.",
                        variant: "default"
                    });
                } else {
                    toast({
                        title: "Processing Failed",
                        description: "Both upload and OCR failed. Please try again.",
                        variant: "destructive"
                    });
                }
            }

            setPanDocument(finalState);

        } catch (error) {
            console.error('Unexpected error:', error);
            setPanDocument({
                file,
                uploadStatus: 'failed',
                ocrStatus: 'failed',
                ocrProgress: 0,
                uploadError: 'Unexpected error occurred'
            });
            toast({
                variant: "destructive",
                title: "Processing Failed",
                description: "An unexpected error occurred. Please try again.",
            });
        }
    }, [applyOCRResults, toast, data, onDataChange]);

    // Handle Aadhaar upload and OCR
    const handleAadhaarUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setAadhaarDocument({
            file,
            uploadStatus: 'uploading',
            ocrStatus: 'processing',
            ocrProgress: 0
        });

        const uploadPromise = uploadToSupabase(file, 'aadhaar-cards');
        const ocrPromise = ocrService.processDocument(file, (progress) => {
            setAadhaarDocument(prev => ({ ...prev, ocrProgress: progress }));
        });

        try {
            const results = await Promise.allSettled([uploadPromise, ocrPromise]);
            const uploadResult = results[0];
            const ocrResult = results[1];

            const finalState: DocumentState = {
                file,
                uploadStatus: uploadResult.status === 'fulfilled' ? 'success' : 'failed',
                ocrStatus: ocrResult.status === 'fulfilled' ? 'success' : 'failed',
                ocrProgress: 100
            };

            if (uploadResult.status === 'fulfilled') {
                finalState.uploadPath = uploadResult.value;

                onDataChange?.({
                    ...data,
                    documents: {
                        ...data?.documents,
                        aadhaarCard: { file, path: uploadResult.value }
                    }
                });
            } else {
                finalState.uploadError = 'Upload failed';
                console.error('Upload failed:', uploadResult.reason);
            }

            if (ocrResult.status === 'fulfilled') {
                applyOCRResults(ocrResult.value, 'aadhaar');

                if (uploadResult.status === 'fulfilled') {
                    toast({
                        title: "Aadhaar Card Processed Successfully",
                        description: `File uploaded and data extracted (${ocrResult.value.confidence}% confidence)`,
                    });
                } else {
                    toast({
                        title: "OCR Completed",
                        description: "Data extracted but upload failed. Please try uploading again.",
                        variant: "destructive"
                    });
                }
            } else {
                finalState.ocrError = ocrResult.reason instanceof Error ? ocrResult.reason.message : 'OCR failed';
                console.error('OCR failed:', ocrResult.reason);

                if (uploadResult.status === 'fulfilled') {
                    toast({
                        title: "File Uploaded Successfully",
                        description: "Aadhaar card uploaded but OCR failed. Please enter details manually.",
                        variant: "default"
                    });
                } else {
                    toast({
                        title: "Processing Failed",
                        description: "Both upload and OCR failed. Please try again.",
                        variant: "destructive"
                    });
                }
            }

            setAadhaarDocument(finalState);

        } catch (error) {
            console.error('Unexpected error:', error);
            setAadhaarDocument({
                file,
                uploadStatus: 'failed',
                ocrStatus: 'failed',
                ocrProgress: 0,
                uploadError: 'Unexpected error occurred'
            });
            toast({
                variant: "destructive",
                title: "Processing Failed",
                description: "An unexpected error occurred. Please try again.",
            });
        }
    }, [applyOCRResults, toast, data, onDataChange]);

    // Handle other document uploads
    const handleDocUpload = useCallback((docType: 'business' | 'bank') => async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const folder = docType === 'business' ? 'business-proofs' : 'bank-statements';
            const uploadPath = await uploadToSupabase(file, folder);
            console.log(`${docType} document uploaded to:`, uploadPath);

            const docKey = docType === 'business' ? 'businessProof' : 'bankStatement';
            onDataChange?.({
                ...data,
                documents: {
                    ...data?.documents,
                    [docKey]: { file, path: uploadPath }
                }
            });

            if (docType === 'business') {
                setBusinessProof(file);
            } else {
                setBankStatement(file);
            }

            toast({
                title: "Document Uploaded",
                description: `${docType === 'business' ? 'Business proof' : 'Bank statement'} uploaded successfully`,
            });

        } catch (error) {
            toast({
                variant: "destructive",
                title: "Upload Failed",
                description: "Failed to upload document",
            });
        }
    }, [toast, data, onDataChange]);

    // Handle form input changes
    const handleInputChange = useCallback((field: keyof FormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
        const newData = { ...formData, [field]: event.target.value };
        setFormData(newData);
        onDataChange?.({ ...data, ...newData });
        setAutoFilledFields(prev => {
            const updated = new Set(prev);
            updated.delete(field);
            return updated;
        });
    }, [formData, onDataChange, data]);

    // Handle GST toggle
    const handleGSTToggle = useCallback((checked: boolean) => {
        const newData = { ...formData, hasGST: checked, gstNumber: checked ? formData.gstNumber : '' };
        setFormData(newData);
        onDataChange?.({ ...data, ...newData, hasGST: checked });
    }, [formData, onDataChange, data]);

    // Document upload component
    const DocumentUploadCard = ({
        title,
        icon: Icon,
        file,
        uploadStatus,
        ocrStatus,
        ocrProgress = 0,
        onUpload,
        description,
        uploadError,
        ocrError
    }: DocumentUploadCardProps) => {
        const fileInputRef = React.useRef<HTMLInputElement>(null);
        const isProcessing = uploadStatus === 'uploading' || ocrStatus === 'processing';

        const handleAreaClick = () => {
            if (isProcessing) return;
            fileInputRef.current?.click();
        };

        const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            onUpload(e);
        };

        const getStatusIcon = () => {
            if (uploadStatus === 'failed' || ocrError) {
                return <AlertTriangle className="h-4 w-4 text-red-500 ml-auto" />;
            }
            if (isProcessing) {
                return <RefreshCw className="h-4 w-4 animate-spin text-blue-500 ml-auto" />;
            }
            if (uploadStatus === 'success') {
                return <CheckCircle className="h-4 w-4 text-green-500 ml-auto" />;
            }
            return null;
        };

        const getStatusColor = () => {
            if (uploadStatus === 'failed' || ocrError) return 'border-red-300';
            if (isProcessing) return 'border-blue-300';
            if (uploadStatus === 'success') return 'border-green-300';
            return 'border-gray-300';
        };

        const getBackgroundColor = () => {
            if (uploadStatus === 'failed' || ocrError) return 'bg-red-50';
            if (isProcessing) return 'bg-blue-50';
            if (uploadStatus === 'success') return 'bg-green-50';
            return 'hover:bg-gray-50';
        };

        return (
            <Card className={`relative ${getStatusColor()}`}>
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Icon className="h-5 w-5 text-primary" />
                        {title}
                        {getStatusIcon()}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                        disabled={isProcessing}
                    />

                    <div
                        onClick={handleAreaClick}
                        className={`
                            flex flex-col items-center justify-center w-full h-32 
                            border-2 border-dashed rounded-lg transition-colors
                            ${isProcessing ? 'cursor-not-allowed' : 'cursor-pointer'}
                            ${getStatusColor()} ${getBackgroundColor()}
                        `}
                    >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            {isProcessing ? (
                                <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mb-2" />
                            ) : uploadStatus === 'success' ? (
                                <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                            ) : (uploadStatus === 'failed' || ocrError) ? (<AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
                            ) : (
                                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                            )}

                            <p className="mb-2 text-sm text-gray-500">
                                {isProcessing ? (
                                    <span className="font-semibold">Processing... {Math.round(ocrProgress)}%</span>
                                ) : uploadStatus === 'success' && !ocrError ? (
                                    <span className="font-semibold text-green-600">✓ {file?.name}</span>
                                ) : uploadStatus === 'success' && ocrError ? (
                                    <span className="font-semibold text-orange-600">⚠ Uploaded (OCR failed)</span>
                                ) : (uploadStatus === 'failed') ? (
                                    <span className="font-semibold text-red-600">Upload failed</span>
                                ) : (
                                    <span className="font-semibold">{description}</span>
                                )}
                            </p>
                        </div>
                    </div>

                    {(ocrStatus === 'processing' || uploadStatus === 'uploading') && (
                        <div className="mt-3">
                            <Progress value={ocrProgress} className="w-full h-2" />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Upload: {uploadStatus === 'success' ? '✓' : uploadStatus}</span>
                                <span>OCR: {ocrProgress}%</span>
                            </div>
                        </div>
                    )}

                    {(uploadError || ocrError) && (
                        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            {uploadError && <div>Upload: {uploadError}</div>}
                            {ocrError && <div>OCR: {ocrError}</div>}
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    };

    // Auto-filled input component
    const AutoFillInput = ({ label, field, placeholder, type = "text", maxLength, required = false }: AutoFillInputProps) => {
        const isAutoFilled = autoFilledFields.has(field);
        const fieldValue = formData[field];
        const inputValue = typeof fieldValue === 'boolean' ? fieldValue.toString() : fieldValue;

        return (
            <div>
                <Label className="flex items-center gap-2 mb-2">
                    {label} {required && <span className="text-red-500">*</span>}
                    {isAutoFilled && (
                        <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                            <Sparkles className="h-3 w-3" />
                            Auto-filled
                        </span>
                    )}
                </Label>
                <Input
                    type={type}
                    value={inputValue}
                    onChange={handleInputChange(field)}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    className={isAutoFilled ? 'border-green-300 bg-green-50' : ''}
                />
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8">
            <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Merchant Registration</h1>
                <p className="text-gray-600">Upload your documents for automatic data extraction</p>
            </div>

            {/* GST Toggle */}
            <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Settings className="h-5 w-5 text-blue-600" />
                            <div>
                                <h4 className="font-semibold text-blue-900">Business Registration Type</h4>
                                <p className="text-sm text-blue-700">Choose your business registration status</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Label className={`text-sm ${!formData.hasGST ? 'font-semibold' : ''}`}>
                                Without GST
                            </Label>
                            <Switch
                                checked={formData.hasGST}
                                onCheckedChange={handleGSTToggle}
                            />
                            <Label className={`text-sm ${formData.hasGST ? 'font-semibold' : ''}`}>
                                With GST
                            </Label>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Document Uploads */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <Camera className="h-5 w-5 text-primary" />
                    Upload Identity Documents
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                    <DocumentUploadCard
                        title="PAN Card"
                        icon={CreditCard}
                        file={panDocument.file}
                        uploadStatus={panDocument.uploadStatus}
                        ocrStatus={panDocument.ocrStatus}
                        ocrProgress={panDocument.ocrProgress}
                        onUpload={handlePanUpload}
                        description="Upload PAN Card for auto-fill"
                        uploadError={panDocument.uploadError}
                        ocrError={panDocument.ocrError}
                    />

                    <DocumentUploadCard
                        title="Aadhaar Card"
                        icon={CreditCard}
                        file={aadhaarDocument.file}
                        uploadStatus={aadhaarDocument.uploadStatus}
                        ocrStatus={aadhaarDocument.ocrStatus}
                        ocrProgress={aadhaarDocument.ocrProgress}
                        onUpload={handleAadhaarUpload}
                        description="Upload Aadhaar Card for auto-fill"
                        uploadError={aadhaarDocument.uploadError}
                        ocrError={aadhaarDocument.ocrError}
                    />
                </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Personal & Business Information
                </h2>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AutoFillInput
                        label="Full Name"
                        field="fullName"
                        placeholder="Enter your full name"
                        required={true}
                    />

                    <AutoFillInput
                        label="PAN Number"
                        field="panNumber"
                        placeholder="ABCDE1234F"
                        maxLength={10}
                        required={true}
                    />

                    <AutoFillInput
                        label="Aadhaar Number"
                        field="aadhaarNumber"
                        placeholder="1234 5678 9012"
                        maxLength={14}
                        required={true}
                    />

                    <AutoFillInput
                        label="Mobile Number"
                        field="mobileNumber"
                        placeholder="+91 9876543210"
                        maxLength={10}
                        required={true}
                    />

                    <AutoFillInput
                        label="Email Address"
                        field="email"
                        type="email"
                        placeholder="merchant@example.com"
                        required={true}
                    />

                    <AutoFillInput
                        label="Business Name"
                        field="businessName"
                        placeholder="Enter business name"
                        required={true}
                    />

                    {formData.hasGST && (
                        <div>
                            <AutoFillInput
                                label="GST Number"
                                field="gstNumber"
                                placeholder="22AAAAA0000A1Z5"
                                maxLength={15}
                                required={true}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Supporting Documents */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Supporting Documents
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                    <DocumentUploadCard
                        title="Business Proof"
                        icon={Building}
                        file={businessProof}
                        uploadStatus={businessProof ? 'success' : 'idle'}
                        ocrStatus="idle"
                        onUpload={handleDocUpload('business')}
                        description="Business registration certificate"
                    />

                    <DocumentUploadCard
                        title="Bank Statement"
                        icon={FileText}
                        file={bankStatement}
                        uploadStatus={bankStatement ? 'success' : 'idle'}
                        ocrStatus="idle"
                        onUpload={handleDocUpload('bank')}
                        description="Recent bank statement"
                    />
                </div>
            </div>

            {/* Processing Status Messages */}
            {(panDocument.ocrStatus === 'processing' || aadhaarDocument.ocrStatus === 'processing') && (
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                            <span className="text-blue-800 font-medium">
                                Processing documents with OCR.space API...
                            </span>
                        </div>
                        <p className="text-blue-700 text-sm">
                            Files are uploaded to secure storage while OCR extracts data. Form fields will be auto-filled when complete.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Success Message */}
            {(autoFilledFields.size > 0) && panDocument.ocrStatus !== 'processing' && aadhaarDocument.ocrStatus !== 'processing' && (
                <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="text-green-800 font-medium">
                                Success! {autoFilledFields.size} field(s) have been auto-filled from your documents.
                            </span>
                        </div>
                        <p className="text-green-700 text-sm mt-1">
                            Please review the auto-filled information and make any necessary corrections.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
                <Button variant="outline" className="px-8" onClick={onPrev}>
                    Back
                </Button>
                <Button
                    className="px-8"
                    onClick={onNext}
                    disabled={
                        !formData.fullName ||
                        !formData.panNumber ||
                        !formData.aadhaarNumber ||
                        !formData.mobileNumber ||
                        !formData.email ||
                        !formData.businessName ||
                        (formData.hasGST && !formData.gstNumber) ||
                        panDocument.uploadStatus !== 'success' ||
                        aadhaarDocument.uploadStatus !== 'success' ||
                        !businessProof ||
                        !bankStatement  // Changed from cancelledCheque
                    }
                >
                    Continue to KYC
                </Button>
            </div>
        </div>
    );
};

export { MerchantRegistration };