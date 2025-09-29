// testMerchant.ts
import fetch from 'node-fetch'; // If Node 18+, you can use global fetch

interface MerchantData {
    merchantId: string;
    name: string;
    email: string;
}

const url = 'http://localhost:4000/api/merchant/submit';

const data: MerchantData = {
    merchantId: 'M12345',
    name: 'Test Merchant',
    email: 'test@example.com',
};

async function submitMerchant() {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();
        console.log('Response:', result);
    } catch (error) {
        console.error('Error:', error);
    }
}

submitMerchant();
