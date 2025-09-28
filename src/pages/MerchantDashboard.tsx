// src/pages/MerchantDashboard.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, FileText, Gift, CheckCircle, Clock, XCircle } from 'lucide-react';

interface MerchantProfile {
    id: string;
    user_id: string;
    full_name: string;
    mobile_number: string;
    email: string;
    business_name: string;
    entity_type?: string | null;  // Make it nullable since DB might not have it
    onboarding_status: string;
    gst_number?: string;
    pan_number?: string;
    aadhaar_number?: string;
    rejection_reason?: string;  // Add this missing field
    created_at: string;
    updated_at: string;
}

export default function MerchantDashboard() {
    const [profile, setProfile] = useState<MerchantProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('merchant_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

        setProfile(data);
        setLoading(false);
    };

    const getStatusBadge = (status: string) => {
        const config: Record<string, { color: string; icon: React.ElementType }> = {
            pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
            submitted: { color: 'bg-blue-100 text-blue-800', icon: Clock },
            approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
            rejected: { color: 'bg-red-100 text-red-800', icon: XCircle }
        };
        const { color, icon: Icon } = config[status] || config.pending;
        return (
            <Badge className={`${color} flex items-center gap-1`}>
                <Icon className="w-3 h-3" />
                {status}
            </Badge>
        );
    };

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>;
    }

    if (profile?.onboarding_status === 'approved') {
        return (
            <div className="container mx-auto p-6">
                <h1 className="text-3xl font-bold mb-6">Merchant Dashboard</h1>

                <div className="grid md:grid-cols-3 gap-4">
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard className="w-5 h-5" />
                                Transactions
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">View and manage transactions</p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5" />
                                Lending Services
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Apply for business loans</p>
                        </CardContent>
                    </Card>

                    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Gift className="w-5 h-5" />
                                Gift Vouchers
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Purchase and manage vouchers</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <Card>
                <CardHeader>
                    <CardTitle>Application Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span>Status:</span>
                        {getStatusBadge(profile?.onboarding_status)}
                    </div>

                    {profile?.onboarding_status === 'rejected' && profile?.rejection_reason && (
                        <Alert variant="destructive">
                            <AlertDescription>
                                <strong>Rejection Reason:</strong> {profile.rejection_reason}
                            </AlertDescription>
                        </Alert>
                    )}

                    {profile?.onboarding_status === 'submitted' && (
                        <Alert>
                            <AlertDescription>
                                Your application is under review. You'll be notified once it's processed.
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}