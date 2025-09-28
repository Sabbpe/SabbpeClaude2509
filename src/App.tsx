import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import RoleSelection from "./pages/RoleSelection";
import EnhancedMerchantOnboarding from "./pages/EnhancedMerchantOnboarding";
import AdminDashboard from "./pages/AdminDashboard";
import DistributorDashboard from "./pages/DistributorDashboard";
import MerchantDashboard from "./pages/MerchantDashboard";
import InvitationAccept from "./pages/InvitationAccept";

const queryClient = new QueryClient();

const App = () => (
    <QueryClientProvider client={queryClient}>
        <AuthProvider>
            <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/" element={<Index />} />
                        <Route path="/select-role" element={<RoleSelection />} />
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/invite/:token" element={<InvitationAccept />} />

                        {/* Merchant Routes */}
                        <Route
                            path="/merchant-onboarding"
                            element={
                                <ProtectedRoute allowedRoles={['merchant']}>
                                    <EnhancedMerchantOnboarding />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/merchant-dashboard"
                            element={
                                <ProtectedRoute allowedRoles={['merchant']}>
                                    <MerchantDashboard />
                                </ProtectedRoute>
                            }
                        />

                        {/* Distributor Routes */}
                        <Route
                            path="/distributor"
                            element={
                                <ProtectedRoute allowedRoles={['distributor']}>
                                    <DistributorDashboard />
                                </ProtectedRoute>
                            }
                        />

                        {/* Admin Routes */}
                        <Route
                            path="/admin"
                            element={
                                <ProtectedRoute allowedRoles={['admin']}>
                                    <AdminDashboard />
                                </ProtectedRoute>
                            }
                        />

                        {/* 404 */}
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </BrowserRouter>
            </TooltipProvider>
        </AuthProvider>
    </QueryClientProvider>
);

export default App;