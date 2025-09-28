// src/pages/DistributorDashboard.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Send, Users, CheckCircle, XCircle, Clock, Search } from 'lucide-react';

interface MerchantData {
    id: string;
    full_name: string;
    mobile_number: string;
    entity_type: string;
    onboarding_status: string;
    created_at: string;
    rejection_reason?: string;
}

interface StatsData {
    total_merchants: number;
    pending_merchants: number;
    approved_merchants: number;
    rejected_merchants: number;
    total_invitations: number;
    pending_invitations: number;
}

export default function DistributorDashboard() {
    const [merchants, setMerchants] = useState<MerchantData[]>([]);
    const [stats, setStats] = useState<StatsData | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [loading, setLoading] = useState(true);
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [inviteData, setInviteData] = useState({ name: '', mobile: '' });
    const [sending, setSending] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: statsData } = await supabase
                .from('distributor_dashboard_stats')
                .select('*')
                .eq('distributor_id', user.id)
                .single();

            setStats(statsData);

            const { data: merchantsData } = await supabase
                .from('merchant_profiles')
                .select('id, full_name, mobile_number, entity_type, onboarding_status, created_at, rejection_reason')
                .eq('distributor_id', user.id)
                .order('created_at', { ascending: false });

            setMerchants(merchantsData || []);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            toast({
                title: "Error",
                description: "Failed to load dashboard data",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const sendWhatsAppInvite = async () => {
        setSending(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const token = crypto.randomUUID();

            const { error } = await supabase
                .from('merchant_invitations')
                .insert({
                    distributor_id: user.id,
                    merchant_name: inviteData.name,
                    merchant_mobile: inviteData.mobile,
                    invitation_token: token,
                    status: 'sent',
                    sent_via: 'whatsapp'
                });

            if (error) throw error;

            const inviteUrl = `${window.location.origin}/invite/${token}`;
            const message = encodeURIComponent(
                `Hi ${inviteData.name}! You're invited to join our merchant platform. Complete your onboarding here: ${inviteUrl}`
            );
            const whatsappUrl = `https://wa.me/${inviteData.mobile.replace(/[^0-9]/g, '')}?text=${message}`;

            window.open(whatsappUrl, '_blank');

            toast({
                title: "Invitation Sent!",
                description: "WhatsApp invitation has been sent to the merchant"
            });

            setInviteDialogOpen(false);
            setInviteData({ name: '', mobile: '' });
            fetchDashboardData();
        } catch (error) {
            console.error('Error sending invite:', error);
            toast({
                title: "Error",
                description: "Failed to send invitation",
                variant: "destructive"
            });
        } finally {
            setSending(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, { color: string; icon: React.ReactNode }> = {
            'pending': { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-3 h-3" /> },
            'submitted': { color: 'bg-blue-100 text-blue-800', icon: <Clock className="w-3 h-3" /> },
            'approved': { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
            'rejected': { color: 'bg-red-100 text-red-800', icon: <XCircle className="w-3 h-3" /> }
        };

        const variant = variants[status] || variants['pending'];

        return (
            <Badge className={`${variant.color} flex items-center gap-1`}>
                {variant.icon}
                {status}
            </Badge>
        );
    };

    const filteredMerchants = merchants.filter(merchant => {
        const matchesSearch = merchant.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            merchant.mobile_number.includes(searchTerm);
        const matchesFilter = filterStatus === 'all' || merchant.onboarding_status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold">Distributor Dashboard</h1>
                    <p className="text-muted-foreground">Manage your merchant network</p>
                </div>
                <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Send className="w-4 h-4 mr-2" />
                            Invite Merchant
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Invite New Merchant via WhatsApp</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            <div>
                                <Label htmlFor="name">Merchant Name</Label>
                                <Input
                                    id="name"
                                    value={inviteData.name}
                                    onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                                    placeholder="Enter merchant name"
                                />
                            </div>
                            <div>
                                <Label htmlFor="mobile">Mobile Number</Label>
                                <Input
                                    id="mobile"
                                    value={inviteData.mobile}
                                    onChange={(e) => setInviteData({ ...inviteData, mobile: e.target.value })}
                                    placeholder="+91 98765 43210"
                                />
                            </div>
                            <Button
                                onClick={sendWhatsAppInvite}
                                disabled={sending || !inviteData.name || !inviteData.mobile}
                                className="w-full"
                            >
                                {sending ? 'Sending...' : 'Send WhatsApp Invite'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Merchants</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.total_merchants || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Pending</CardTitle>
                        <Clock className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.pending_merchants || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Approved</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.approved_merchants || 0}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                        <XCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.rejected_merchants || 0}</div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search merchants..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border rounded-md"
                >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="submitted">Submitted</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                </select>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Merchant Applications</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {filteredMerchants.length === 0 ? (
                            <p className="text-center text-muted-foreground py-8">No merchants found</p>
                        ) : (
                            filteredMerchants.map((merchant) => (
                                <div key={merchant.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                                    <div className="flex-1">
                                        <h3 className="font-semibold">{merchant.full_name}</h3>
                                        <p className="text-sm text-muted-foreground">{merchant.mobile_number}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {merchant.entity_type} • {new Date(merchant.created_at).toLocaleDateString()}
                                        </p>
                                        {merchant.rejection_reason && (
                                            <p className="text-xs text-red-600 mt-1">
                                                Reason: {merchant.rejection_reason}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {getStatusBadge(merchant.onboarding_status)}
                                        <Button variant="outline" size="sm">View Details</Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}