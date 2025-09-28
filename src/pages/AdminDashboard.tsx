// Fixed AdminDashboard.tsx - Critical Type Fixes

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    CheckCircle,
    XCircle,
    Clock,
    Search,
    Filter,
    Download,
    Eye,
    AlertCircle
} from 'lucide-react';

// FIXED: Updated type to include entity_type and proper status values
interface MerchantApplication {
    id: string;
    full_name: string;
    email: string;
    mobile_number: string;
    business_name: string;
    gst_number: string;
    aadhaar_number: string;
    onboarding_status: 'pending' | 'in_progress' | 'verified' | 'rejected' | 'approved'; // FIXED: Added 'approved'
    entity_type: string; // FIXED: Added entity_type
    created_at: string;
    updated_at: string;
    merchant_bank_details: {
        bank_name: string;
        account_number: string;
        ifsc_code: string;
    };
}

export default function AdminDashboard() {
    const [applications, setApplications] = useState<MerchantApplication[]>([]);
    const [filteredApps, setFilteredApps] = useState<MerchantApplication[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedApp, setSelectedApp] = useState<MerchantApplication | null>(null);

    useEffect(() => {
        fetchApplications();
    }, []);

    useEffect(() => {
        filterApplications();
    }, [searchTerm, statusFilter, applications]);

    const fetchApplications = async () => {
        try {
            setLoading(true);

            // FIXED: Added entity_type to the select query
            const { data, error } = await supabase
                .from('merchant_profiles')
                .select(`
          *,
          merchant_bank_details (
            bank_name,
            account_number,
            ifsc_code
          )
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // FIXED: Properly map the data with entity_type
            const mappedData = data?.map(item => ({
                ...item,
                entity_type: item.entity_type || 'individual', // Provide default if missing
                merchant_bank_details: Array.isArray(item.merchant_bank_details)
                    ? item.merchant_bank_details[0]
                    : item.merchant_bank_details
            })) as MerchantApplication[];

            setApplications(mappedData || []);
        } catch (error) {
            console.error('Error fetching applications:', error);
        } finally {
            setLoading(false);
        }
    };

    const filterApplications = () => {
        let filtered = applications;

        if (searchTerm) {
            filtered = filtered.filter(app =>
                app.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                app.business_name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(app => app.onboarding_status === statusFilter);
        }

        setFilteredApps(filtered);
    };

    const updateApplicationStatus = async (
        appId: string,
        newStatus: 'approved' | 'rejected' | 'verified' | 'pending' | 'in_progress' // FIXED: Proper type
    ) => {
        try {
            const { error } = await supabase
                .from('merchant_profiles')
                .update({ onboarding_status: newStatus })
                .eq('id', appId);

            if (error) throw error;

            // Send notification to merchant
            await supabase
                .from('notifications')
                .insert({
                    user_id: appId,
                    type: 'status_update',
                    title: 'Application Status Updated',
                    message: `Your merchant application has been ${newStatus}`,
                    action_url: '/merchant/dashboard',
                    action_label: 'View Dashboard',
                    read: false
                });

            // Also create audit log for tracking
            await supabase
                .from('onboarding_audit_log')
                .insert({
                    merchant_id: appId,
                    action: 'status_update',
                    performed_by: null, // Replace with actual admin ID from auth when available
                    previous_status: applications.find(app => app.id === appId)?.onboarding_status,
                    new_status: newStatus,
                    notes: `Status updated to ${newStatus}`
                });

            // Refresh data
            fetchApplications();

            alert(`Application ${newStatus} successfully!`);
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update application status');
        }
    };

    // FIXED: Replaced 'any' with proper type
    const getStatusBadge = (status: MerchantApplication['onboarding_status']) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-800',
            in_progress: 'bg-blue-100 text-blue-800',
            verified: 'bg-green-100 text-green-800',
            approved: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800'
        };

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
                {status.replace('_', ' ').toUpperCase()}
            </span>
        );
    };

    const exportToCSV = () => {
        const headers = ['Name', 'Email', 'Mobile', 'Business', 'Status', 'Created Date'];
        const rows = filteredApps.map(app => [
            app.full_name,
            app.email,
            app.mobile_number,
            app.business_name,
            app.onboarding_status,
            new Date(app.created_at).toLocaleDateString()
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'merchant_applications.csv';
        a.click();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Merchant Applications</h1>
                    <p className="text-gray-600">Review and manage merchant onboarding applications</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title="Total Applications"
                        value={applications.length}
                        icon={<AlertCircle className="w-6 h-6" />}
                        color="blue"
                    />
                    <StatCard
                        title="Pending"
                        value={applications.filter(a => a.onboarding_status === 'pending').length}
                        icon={<Clock className="w-6 h-6" />}
                        color="yellow"
                    />
                    <StatCard
                        title="Approved"
                        value={applications.filter(a => a.onboarding_status === 'approved' || a.onboarding_status === 'verified').length}
                        icon={<CheckCircle className="w-6 h-6" />}
                        color="green"
                    />
                    <StatCard
                        title="Rejected"
                        value={applications.filter(a => a.onboarding_status === 'rejected').length}
                        icon={<XCircle className="w-6 h-6" />}
                        color="red"
                    />
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search by name, email, or business..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="verified">Verified</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>

                        <button
                            onClick={exportToCSV}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Download className="w-5 h-5" />
                            Export CSV
                        </button>
                    </div>
                </div>

                {/* Applications Table */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Merchant Details
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Business Info
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Applied On
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredApps.map((app) => (
                                    <tr key={app.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="font-medium text-gray-900">{app.full_name}</div>
                                                <div className="text-sm text-gray-500">{app.email}</div>
                                                <div className="text-sm text-gray-500">{app.mobile_number}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="font-medium text-gray-900">{app.business_name}</div>
                                                <div className="text-sm text-gray-500">GST: {app.gst_number || 'N/A'}</div>
                                                <div className="text-sm text-gray-500">Type: {app.entity_type}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {getStatusBadge(app.onboarding_status)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(app.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => setSelectedApp(app)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                                {app.onboarding_status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => updateApplicationStatus(app.id, 'approved')}
                                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                            title="Approve"
                                                        >
                                                            <CheckCircle className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => updateApplicationStatus(app.id, 'rejected')}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Reject"
                                                        >
                                                            <XCircle className="w-5 h-5" />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Detail Modal */}
                {selectedApp && (
                    <ApplicationDetailModal
                        application={selectedApp}
                        onClose={() => setSelectedApp(null)}
                        onUpdateStatus={updateApplicationStatus}
                    />
                )}
            </div>
        </div>
    );
}

// FIXED: Replaced 'any' with specific type
interface StatCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    color: 'blue' | 'yellow' | 'green' | 'red';
}

function StatCard({ title, value, icon, color }: StatCardProps) {
    const colorClasses = {
        blue: 'bg-blue-100 text-blue-600',
        yellow: 'bg-yellow-100 text-yellow-600',
        green: 'bg-green-100 text-green-600',
        red: 'bg-red-100 text-red-600'
    };

    return (
        <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-600 mb-1">{title}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                </div>
                <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

interface ApplicationDetailModalProps {
    application: MerchantApplication;
    onClose: () => void;
    onUpdateStatus: (id: string, status: 'approved' | 'rejected' | 'verified' | 'pending' | 'in_progress') => void;
}

function ApplicationDetailModal({ application, onClose, onUpdateStatus }: ApplicationDetailModalProps) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-2xl font-bold text-gray-900">Application Details</h2>
                </div>

                <div className="p-6 space-y-6">
                    <DetailSection title="Personal Information">
                        <DetailItem label="Full Name" value={application.full_name} />
                        <DetailItem label="Email" value={application.email} />
                        <DetailItem label="Mobile" value={application.mobile_number} />
                        <DetailItem label="Aadhaar" value={application.aadhaar_number} />
                    </DetailSection>

                    <DetailSection title="Business Information">
                        <DetailItem label="Business Name" value={application.business_name} />
                        <DetailItem label="Entity Type" value={application.entity_type} />
                        <DetailItem label="GST Number" value={application.gst_number || 'N/A'} />
                    </DetailSection>

                    <DetailSection title="Banking Details">
                        <DetailItem label="Bank Name" value={application.merchant_bank_details?.bank_name || 'N/A'} />
                        <DetailItem label="Account Number" value={application.merchant_bank_details?.account_number || 'N/A'} />
                        <DetailItem label="IFSC Code" value={application.merchant_bank_details?.ifsc_code || 'N/A'} />
                    </DetailSection>
                </div>

                <div className="p-6 border-t border-gray-200 flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Close
                    </button>
                    {application.onboarding_status === 'pending' && (
                        <>
                            <button
                                onClick={() => {
                                    onUpdateStatus(application.id, 'approved');
                                    onClose();
                                }}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                Approve
                            </button>
                            <button
                                onClick={() => {
                                    onUpdateStatus(application.id, 'rejected');
                                    onClose();
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Reject
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {children}
            </div>
        </div>
    );
}

function DetailItem({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-sm text-gray-600 mb-1">{label}</p>
            <p className="font-medium text-gray-900">{value}</p>
        </div>
    );
}