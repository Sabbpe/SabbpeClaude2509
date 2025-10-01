import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMerchantData } from '@/hooks/useMerchantData';
import { supabase } from '@/lib/supabase';
import {
    CreditCard,
    QrCode,
    Volume2,
    Globe,
    Building2,
    CheckCircle,
    Loader2,
    Check
} from 'lucide-react';

interface ProductSelectionProps {
    onNext: () => void;
    onPrev: () => void;
    data?: {
        selectedProducts?: string[];
        settlementType?: 'same_day' | 'next_day';
        [key: string]: unknown;
    };
    onDataChange?: (data: {
        selectedProducts?: string[];
        settlementType?: 'same_day' | 'next_day';
        [key: string]: unknown;
    }) => void;
}

type ProductType = 'upi_qr' | 'upi_qr_soundbox' | 'pos' | 'payment_gateway' | 'current_account';
type SettlementType = 'same_day' | 'next_day';

interface Product {
    id: ProductType;
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    features: string[];
}

const products: Product[] = [
    {
        id: 'upi_qr',
        name: 'UPI QR',
        icon: QrCode,
        description: 'Accept payments via UPI QR code',
        features: ['Instant payment collection', 'No hardware required', 'Low transaction fees']
    },
    {
        id: 'upi_qr_soundbox',
        name: 'UPI QR + Soundbox',
        icon: Volume2,
        description: 'QR with audio payment confirmation',
        features: ['Audio payment alerts', 'No phone needed', 'Battery powered']
    },
    {
        id: 'pos',
        name: 'POS Terminal',
        icon: CreditCard,
        description: 'Accept card payments with POS machine',
        features: ['Card payments', 'EMI options', 'Receipt printer']
    },
    {
        id: 'payment_gateway',
        name: 'Payment Gateway',
        icon: Globe,
        description: 'Online payment integration',
        features: ['Multiple payment modes', 'API integration', 'Checkout page']
    },
    {
        id: 'current_account',
        name: 'Current Account',
        icon: Building2,
        description: 'Business banking account',
        features: ['No balance limit', 'Free transactions', 'Overdraft facility']
    }
];

export const ProductSelection: React.FC<ProductSelectionProps> = ({
    onNext,
    onPrev,
    data,
    onDataChange
}) => {
    const { toast } = useToast();
    const { merchantProfile } = useMerchantData();

    const [selectedProducts, setSelectedProducts] = useState < Set < ProductType >> (
        new Set(data?.selectedProducts || [])
    );
    const [settlementType, setSettlementType] = useState < SettlementType > (
        data?.settlementType || 'next_day'
    );
    const [saveStatus, setSaveStatus] = useState < 'idle' | 'saving' | 'saved' > ('idle');

    // Auto-save with debounce
    useEffect(() => {
        if (!merchantProfile || selectedProducts.size === 0) return;

        const timeoutId = setTimeout(async () => {
            await saveToDatabase();
        }, 1000);

        return () => clearTimeout(timeoutId);
    }, [selectedProducts, settlementType, merchantProfile]);

    const saveToDatabase = async () => {
        if (!merchantProfile || selectedProducts.size === 0) return;

        setSaveStatus('saving');

        try {
            const productRecords = Array.from(selectedProducts).map(productType => ({
                merchant_id: merchantProfile.id,
                product_type: productType,
                settlement_type: settlementType,
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }));

            // Delete existing products
            await supabase
                .from('merchant_products')
                .delete()
                .eq('merchant_id', merchantProfile.id);

            // Insert new selections
            const { error } = await supabase
                .from('merchant_products')
                .insert(productRecords);

            if (error) throw error;

            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);

        } catch (error) {
            console.error('Auto-save error:', error);
            setSaveStatus('idle');
        }
    };

    const handleProductToggle = (productId: ProductType) => {
        const newSelected = new Set(selectedProducts);
        if (newSelected.has(productId)) {
            newSelected.delete(productId);
        } else {
            newSelected.add(productId);
        }
        setSelectedProducts(newSelected);

        onDataChange?.({
            ...data,
            selectedProducts: Array.from(newSelected),
            settlementType
        });
    };

    const handleSettlementChange = (value: SettlementType) => {
        setSettlementType(value);

        onDataChange?.({
            ...data,
            selectedProducts: Array.from(selectedProducts),
            settlementType: value
        });
    };

    const handleNext = () => {
        if (selectedProducts.size === 0) {
            toast({
                variant: "destructive",
                title: "No Products Selected",
                description: "Please select at least one product",
            });
            return;
        }

        onNext();
    };

    return (
        <div className="space-y-8">
            {/* Auto-save indicator */}
            <div className="fixed top-4 right-4 z-50">
                {saveStatus === 'saving' && (
                    <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-lg shadow-lg">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm font-medium">Saving...</span>
                    </div>
                )}
                {saveStatus === 'saved' && (
                    <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg shadow-lg">
                        <Check className="h-4 w-4" />
                        <span className="text-sm font-medium">Saved</span>
                    </div>
                )}
            </div>

            <div className="text-center">
                <h2 className="text-3xl font-bold text-foreground mb-2">
                    Select Products & Services
                </h2>
                <p className="text-muted-foreground">
                    Choose the payment solutions you need for your business
                </p>
            </div>

            {/* Products Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => {
                    const Icon = product.icon;
                    const isSelected = selectedProducts.has(product.id);

                    return (
                        <Card
                            key={product.id}
                            className={`cursor-pointer transition-all ${isSelected
                                    ? 'border-primary border-2 bg-primary/5'
                                    : 'hover:border-primary/50'
                                }`}
                            onClick={() => handleProductToggle(product.id)}
                        >
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-3 rounded-lg ${isSelected ? 'bg-primary text-white' : 'bg-muted'
                                            }`}>
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <CardTitle className="text-lg">{product.name}</CardTitle>
                                    </div>
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={() => handleProductToggle(product.id)}
                                        className="mt-1"
                                    />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground mb-4">
                                    {product.description}
                                </p>
                                <ul className="space-y-2">
                                    {product.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-center gap-2 text-sm">
                                            <CheckCircle className="h-4 w-4 text-primary" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Settlement Type */}
            <Card>
                <CardHeader>
                    <CardTitle>Settlement Preference</CardTitle>
                </CardHeader>
                <CardContent>
                    <RadioGroup value={settlementType} onValueChange={handleSettlementChange}>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2 p-4 border rounded-lg flex-1">
                                <RadioGroupItem value="same_day" id="same_day" />
                                <Label htmlFor="same_day" className="cursor-pointer flex-1">
                                    <div>
                                        <div className="font-semibold">Same Day Settlement</div>
                                        <div className="text-sm text-muted-foreground">
                                            Funds credited on the same day (T+0)
                                        </div>
                                    </div>
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2 p-4 border rounded-lg flex-1">
                                <RadioGroupItem value="next_day" id="next_day" />
                                <Label htmlFor="next_day" className="cursor-pointer flex-1">
                                    <div>
                                        <div className="font-semibold">Next Day Settlement</div>
                                        <div className="text-sm text-muted-foreground">
                                            Funds credited next business day (T+1)
                                        </div>
                                    </div>
                                </Label>
                            </div>
                        </div>
                    </RadioGroup>
                </CardContent>
            </Card>

            {/* Summary */}
            {selectedProducts.size > 0 && (
                <Card className="bg-primary/5 border-primary">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-4">
                            <CheckCircle className="h-5 w-5 text-primary" />
                            <span className="font-semibold">Selected Products:</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {Array.from(selectedProducts).map((productId) => {
                                const product = products.find(p => p.id === productId);
                                return (
                                    <div
                                        key={productId}
                                        className="bg-white px-4 py-2 rounded-full border border-primary text-sm"
                                    >
                                        {product?.name}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-3 text-sm text-muted-foreground">
                            Settlement: <span className="font-medium text-foreground">
                                {settlementType.replace('_', ' ').toUpperCase()}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-6">
                <Button variant="outline" onClick={onPrev}>
                    Back
                </Button>
                <Button
                    onClick={handleNext}
                    disabled={selectedProducts.size === 0}
                >
                    Continue to Bank Details
                </Button>
            </div>
        </div>
    );
};