// hooks/useKYCValidation.ts
import { useState, useCallback } from 'react';

interface KYCState {
    videoKycCompleted: boolean;
    locationCaptured: boolean;
    selfieUrl: string | null;
    coordinates: { lat: number; lng: number } | null;
}

export const useKYCValidation = () => {
    const [kycState, setKycState] = useState<KYCState>({
        videoKycCompleted: false,
        locationCaptured: false,
        selfieUrl: null,
        coordinates: null,
    });

    const captureLocation = useCallback(() => {
        return new Promise<{ lat: number; lng: number; address: string }>((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;

                    // You could add reverse geocoding here if needed
                    const address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

                    setKycState(prev => ({
                        ...prev,
                        locationCaptured: true,
                        coordinates: { lat: latitude, lng: longitude }
                    }));

                    resolve({ lat: latitude, lng: longitude, address });
                },
                (error) => {
                    reject(new Error(`Location error: ${error.message}`));
                },
                { timeout: 10000, enableHighAccuracy: true }
            );
        });
    }, []);

    const completeVideoKYC = useCallback((selfieBlob: Blob) => {
        const selfieUrl = URL.createObjectURL(selfieBlob);
        setKycState(prev => ({
            ...prev,
            videoKycCompleted: true,
            selfieUrl
        }));

        return selfieUrl;
    }, []);

    const resetKYC = useCallback(() => {
        if (kycState.selfieUrl) {
            URL.revokeObjectURL(kycState.selfieUrl);
        }

        setKycState({
            videoKycCompleted: false,
            locationCaptured: false,
            selfieUrl: null,
            coordinates: null,
        });
    }, [kycState.selfieUrl]);

    const isKYCComplete = kycState.videoKycCompleted && kycState.locationCaptured;

    return {
        kycState,
        captureLocation,
        completeVideoKYC,
        resetKYC,
        isKYCComplete,
    };
};
