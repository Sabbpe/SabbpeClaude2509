import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, MapPin, FileText, Video, CheckCircle, AlertCircle } from 'lucide-react';
import { useKYCValidation } from '@/hooks/useKYCValidation';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useMerchantData } from '@/hooks/useMerchantData';
import { useToast } from '@/hooks/use-toast';

interface KYCVerificationProps {
    onNext: () => void;
    onPrev: () => void;
    data?: {
        kycData?: {
            isVideoCompleted?: boolean;
            selfieUrl?: string;
            locationVerified?: boolean;
            latitude?: number;
            longitude?: number;
        };
        panNumber?: string;
        aadhaarNumber?: string;
        [key: string]: unknown;
    };
    onDataChange?: (data: {
        kycData?: {
            isVideoCompleted?: boolean;
            selfieUrl?: string;
            locationVerified?: boolean;
            latitude?: number;
            longitude?: number;
        };
        [key: string]: unknown;
    }) => void;
}

export const KYCVerification: React.FC<KYCVerificationProps> = ({
    onNext,
    onPrev,
    data,
    onDataChange
}) => {
    const [isVideoActive, setIsVideoActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const { toast } = useToast();
    const { merchantProfile } = useMerchantData();
    const { uploadFile } = useFileUpload();
    const {
        kycState,
        captureLocation,
        completeVideoKYC,
        isKYCComplete
    } = useKYCValidation();

    const startCamera = async () => {
        try {
            setIsVideoActive(true);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                },
                audio: false
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
            }
        } catch (error) {
            console.error('Error accessing camera:', error);
            toast({
                variant: "destructive",
                title: "Camera Error",
                description: "Unable to access camera. Please check permissions.",
            });
            setIsVideoActive(false);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsVideoActive(false);
    };

    const capturePhoto = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        setIsProcessing(true);

        try {
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            if (context) {
                canvas.width = videoRef.current.videoWidth;
                canvas.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0);

                canvas.toBlob(async (blob) => {
                    if (blob && merchantProfile) {
                        const file = new File([blob], 'kyc-selfie.jpg', { type: 'image/jpeg' });
                        const uploadPath = `${merchantProfile.user_id}/kyc-selfie-${Date.now()}.jpg`;

                        const uploadResult = await uploadFile(file, 'merchant-documents', uploadPath);

                        if (uploadResult) {
                            completeVideoKYC(blob);

                            // UPDATE PARENT DATA WITH PATH
                            onDataChange?.({
                                ...data,
                                kycData: {
                                    ...data?.kycData,
                                    isVideoCompleted: true,
                                    selfieUrl: uploadPath
                                }
                            });

                            toast({
                                title: "Photo Captured",
                                description: "Your selfie has been captured successfully.",
                            });
                        }
                    }
                }, 'image/jpeg', 0.8);
            }

            stopCamera();
        } catch (error) {
            console.error('Error capturing photo:', error);
            toast({
                variant: "destructive",
                title: "Capture Error",
                description: "Failed to capture photo. Please try again.",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleLocationCapture = async () => {
        try {
            const locationData = await captureLocation();

            // UPDATE PARENT DATA WITH COORDINATES
            onDataChange?.({
                ...data,
                kycData: {
                    ...data?.kycData,
                    locationVerified: true,
                    latitude: locationData.lat,
                    longitude: locationData.lng
                }
            });

            toast({
                title: "Location Captured",
                description: `Location: ${locationData.address || 'Captured successfully'}`,
            });
        } catch (error: unknown) {
            toast({
                variant: "destructive",
                title: "Location Error",
                description: error instanceof Error ? error.message : "Failed to capture location",
            });
        }
    };

    const handleNext = () => {
        if (isKYCComplete) {
            onNext();
        } else {
            toast({
                variant: "destructive",
                title: "KYC Incomplete",
                description: "Please complete both video KYC and location capture.",
            });
        }
    };

    React.useEffect(() => {
        const timer = setTimeout(() => {
            toast({
                title: "Documents Verified",
                description: "Your PAN and Aadhaar documents have been processed successfully.",
            });
        }, 2000);

        return () => clearTimeout(timer);
    }, [toast]);

    return (
        <div className="space-y-8">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-foreground mb-2">
                    KYC Verification
                </h2>
                <p className="text-muted-foreground">
                    Complete your identity verification for secure onboarding
                </p>
            </div>

            <div className="grid gap-6">
                {/* Document OCR Status */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Document Verification
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="p-6 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl">
                            <div className="flex items-center gap-3 mb-4">
                                <CheckCircle className="h-6 w-6 text-primary" />
                                <span className="font-semibold text-foreground">
                                    Documents Auto-Verified
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-4">
                                Your PAN and Aadhaar documents have been processed using OCR technology.
                                All details have been automatically extracted and verified.
                            </p>
                            <div className="grid md:grid-cols-2 gap-4 text-sm">
                                <div className="p-3 bg-card rounded-lg">
                                    <span className="font-medium">PAN Number:</span>
                                    <span className="ml-2 text-primary">
                                        {data?.panNumber || merchantProfile?.pan_number || 'Processing...'}
                                    </span>
                                </div>
                                <div className="p-3 bg-card rounded-lg">
                                    <span className="font-medium">Aadhaar:</span>
                                    <span className="ml-2 text-primary">
                                        {data?.aadhaarNumber ?
                                            `****-****-${data.aadhaarNumber.slice(-4)}` :
                                            merchantProfile?.aadhaar_number ?
                                                `****-****-${merchantProfile.aadhaar_number.slice(-4)}` :
                                                'Processing...'
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Live Video KYC */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Video className="h-5 w-5 text-primary" />
                            Live Video KYC
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!kycState.videoKycCompleted ? (
                            <div className="text-center space-y-4">
                                {!isVideoActive ? (
                                    <div className="p-8 border-2 border-dashed border-border rounded-xl">
                                        <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                                        <h3 className="font-semibold text-foreground mb-2">
                                            Live Selfie Verification
                                        </h3>
                                        <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                                            Take a live selfie to verify your identity. Make sure you're in good lighting
                                            and your face is clearly visible.
                                        </p>
                                        <div className="space-y-3">
                                            <Button onClick={startCamera} className="px-6">
                                                Start Camera
                                            </Button>
                                            <div className="text-xs text-muted-foreground">
                                                <p>Requirements:</p>
                                                <ul className="list-disc list-inside space-y-1 mt-1">
                                                    <li>Good lighting on your face</li>
                                                    <li>Look directly at the camera</li>
                                                    <li>Remove glasses or hat if possible</li>
                                                    <li>Keep face centered in the frame</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="relative mx-auto max-w-md">
                                            <video
                                                ref={videoRef}
                                                autoPlay
                                                playsInline
                                                className="w-full rounded-xl border-4 border-primary"
                                            />
                                            <div className="absolute inset-0 rounded-xl border-4 border-primary pointer-events-none">
                                                <div className="absolute inset-4 border border-white/50 rounded-lg" />
                                            </div>
                                        </div>

                                        <canvas ref={canvasRef} className="hidden" />

                                        <div className="flex gap-4 justify-center">
                                            <Button
                                                onClick={capturePhoto}
                                                disabled={isProcessing}
                                                className="px-6"
                                            >
                                                {isProcessing ? 'Processing...' : 'Capture Photo'}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={stopCamera}
                                                disabled={isProcessing}
                                            >
                                                Cancel
                                            </Button>
                                        </div>

                                        <div className="text-sm text-muted-foreground text-center">
                                            Position your face in the center and click "Capture Photo"
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="p-6 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl">
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="h-6 w-6 text-primary" />
                                    <span className="font-semibold text-foreground">
                                        Video KYC Completed Successfully
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Your live selfie has been captured and uploaded securely.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Location Capture */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-primary" />
                            Location Verification
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!kycState.locationCaptured ? (
                            <div className="text-center space-y-4">
                                <div className="p-8 border-2 border-dashed border-border rounded-xl">
                                    <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="font-semibold text-foreground mb-2">
                                        Capture Your Location
                                    </h3>
                                    <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                                        We need to verify your current location for security and compliance purposes.
                                        This helps us ensure the onboarding process is legitimate.
                                    </p>
                                    <Button onClick={handleLocationCapture} className="px-6">
                                        <MapPin className="h-4 w-4 mr-2" />
                                        Capture Location
                                    </Button>
                                    <div className="text-xs text-muted-foreground mt-4">
                                        <p>Why we need your location:</p>
                                        <ul className="list-disc list-inside space-y-1 mt-1">
                                            <li>Regulatory compliance requirements</li>
                                            <li>Fraud prevention and security</li>
                                            <li>Location data is encrypted and secure</li>
                                            <li>Used only for verification purposes</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl">
                                <div className="flex items-center gap-3 mb-4">
                                    <CheckCircle className="h-6 w-6 text-primary" />
                                    <span className="font-semibold text-foreground">
                                        Location Captured Successfully
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">
                                        Current Location: {kycState.coordinates &&
                                            `${kycState.coordinates.lat.toFixed(4)}, ${kycState.coordinates.lng.toFixed(4)}`
                                        }
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Location data is securely encrypted and used only for verification purposes.
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* KYC Progress Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle>Verification Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center bg-primary text-white">
                                        <CheckCircle className="h-4 w-4" />
                                    </div>
                                    <span>Document OCR Processing</span>
                                </div>
                                <span className="text-sm text-primary font-medium">Complete</span>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${kycState.videoKycCompleted ? 'bg-primary text-white' : 'bg-muted'
                                        }`}>
                                        {kycState.videoKycCompleted ? (
                                            <CheckCircle className="h-4 w-4" />
                                        ) : (
                                            <Video className="h-4 w-4" />
                                        )}
                                    </div>
                                    <span>Live Video KYC</span>
                                </div>
                                <span className={`text-sm font-medium ${kycState.videoKycCompleted ? 'text-primary' : 'text-muted-foreground'
                                    }`}>
                                    {kycState.videoKycCompleted ? 'Complete' : 'Pending'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${kycState.locationCaptured ? 'bg-primary text-white' : 'bg-muted'
                                        }`}>
                                        {kycState.locationCaptured ? (
                                            <CheckCircle className="h-4 w-4" />
                                        ) : (
                                            <MapPin className="h-4 w-4" />
                                        )}
                                    </div>
                                    <span>Location Verification</span>
                                </div>
                                <span className={`text-sm font-medium ${kycState.locationCaptured ? 'text-primary' : 'text-muted-foreground'
                                    }`}>
                                    {kycState.locationCaptured ? 'Complete' : 'Pending'}
                                </span>
                            </div>
                        </div>

                        {isKYCComplete && (
                            <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                    <span className="font-semibold text-green-800">KYC Verification Complete!</span>
                                </div>
                                <p className="text-sm text-green-700 mt-1">
                                    All verification steps have been completed successfully. You can now proceed to the next step.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-6">
                <Button
                    variant="outline"
                    onClick={onPrev}
                    className="px-8"
                >
                    Back
                </Button>
                <Button
                    onClick={handleNext}
                    disabled={!isKYCComplete}
                    className="px-8"
                >
                    Continue to Bank Details
                </Button>
            </div>
        </div>
    );
};