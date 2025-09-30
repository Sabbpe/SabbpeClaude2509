import { supabase } from './supabase';
import { MerchantFormData } from '@/schemas/merchantValidation';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

class ApiClient {
    private async getAuthHeader(): Promise<HeadersInit> {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.access_token) {
            throw new Error('Not authenticated. Please log in.');
        }

        return {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
        };
    }

    async submitMerchantApplication(data: MerchantFormData) {
        const headers = await this.getAuthHeader();

        const response = await fetch(`${API_BASE_URL}/api/merchant/submit`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error?.message || 'Failed to submit application');
        }

        return result;
    }

    async getMerchantProfile() {
        const headers = await this.getAuthHeader();

        const response = await fetch(`${API_BASE_URL}/api/merchant/profile`, {
            method: 'GET',
            headers
        });

        if (response.status === 404) {
            return { success: true, data: null };
        }

        if (!response.ok) {
            throw new Error('Failed to fetch merchant profile');
        }

        return response.json();
    }

    async getMerchantStatus() {
        const headers = await this.getAuthHeader();

        const response = await fetch(`${API_BASE_URL}/api/merchant/status`, {
            method: 'GET',
            headers
        });

        if (response.status === 404) {
            return { success: true, data: null };
        }

        if (!response.ok) {
            throw new Error('Failed to fetch merchant status');
        }

        return response.json();
    }

    async getStatusHistory() {
        const headers = await this.getAuthHeader();

        const response = await fetch(`${API_BASE_URL}/api/merchant/status-history`, {
            method: 'GET',
            headers
        });

        if (!response.ok) {
            throw new Error('Failed to fetch status history');
        }

        return response.json();
    }
}

export const apiClient = new ApiClient();