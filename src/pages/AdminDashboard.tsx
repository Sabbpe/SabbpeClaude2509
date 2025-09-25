import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Building, 
  FileText, 
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  ArrowLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Logo } from '@/components/ui/logo';

interface MerchantData {
  id: string;
  full_name: string;
  email: string;
  mobile_number: string;
  business_name?: string;
  onboarding_status: 'pending' | 'in_progress' | 'verified' | 'rejected';
  created_at: string;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [merchants, setMerchants] = useState<MerchantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate('/');
      return;
    }

    if (isAdmin) {
      fetchMerchants();
    }
  }, [isAdmin, roleLoading, navigate]);

  const fetchMerchants = async () => {
    try {
      const { data, error } = await supabase
        .from('merchant_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching merchants:', error);
      } else {
        setMerchants(data || []);
      }
    } catch (error) {
      console.error('Error fetching merchants:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
      case 'in_progress':
        return <Badge variant="default" className="gap-1"><Clock className="h-3 w-3" />In Progress</Badge>;
      case 'verified':
        return <Badge variant="default" className="gap-1 bg-green-500"><CheckCircle className="h-3 w-3" />Verified</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredMerchants = merchants.filter(merchant =>
    merchant.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    merchant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    merchant.business_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: merchants.length,
    pending: merchants.filter(m => m.onboarding_status === 'pending').length,
    inProgress: merchants.filter(m => m.onboarding_status === 'in_progress').length,
    verified: merchants.filter(m => m.onboarding_status === 'verified').length,
    rejected: merchants.filter(m => m.onboarding_status === 'rejected').length,
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // This should not render due to the navigate in useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5">
      <div className="container max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
            <Logo size="sm" />
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground">
                Manage merchant onboarding and verification
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Merchants</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Verified</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Merchant Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search merchants by name, email, or business..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Merchants Table */}
            <div className="border rounded-lg">
              <div className="grid grid-cols-6 gap-4 p-4 bg-muted/30 font-medium text-sm">
                <div>Merchant</div>
                <div>Business</div>
                <div>Contact</div>
                <div>Status</div>
                <div>Applied</div>
                <div>Actions</div>
              </div>
              
              {filteredMerchants.map((merchant) => (
                <div key={merchant.id} className="grid grid-cols-6 gap-4 p-4 border-t items-center">
                  <div>
                    <div className="font-medium">{merchant.full_name}</div>
                    <div className="text-sm text-muted-foreground">ID: {merchant.id.slice(-6)}</div>
                  </div>
                  
                  <div>
                    <div className="font-medium">{merchant.business_name || 'N/A'}</div>
                  </div>
                  
                  <div>
                    <div className="text-sm">{merchant.email}</div>
                    <div className="text-sm text-muted-foreground">{merchant.mobile_number}</div>
                  </div>
                  
                  <div>
                    {getStatusBadge(merchant.onboarding_status)}
                  </div>
                  
                  <div className="text-sm">
                    {new Date(merchant.created_at).toLocaleDateString()}
                  </div>
                  
                  <div>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Eye className="h-3 w-3" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
              
              {filteredMerchants.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  {searchTerm ? 'No merchants found matching your search.' : 'No merchants found.'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;