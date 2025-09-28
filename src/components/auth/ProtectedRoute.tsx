// src/components/auth/ProtectedRoute.tsx
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    checkAuthorization();
  }, []);

    const checkAuthorization = async (retryCount = 0) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                setAuthorized(false);
                setLoading(false);
                return;
            }

            const { data: roleData, error } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', session.user.id)
                .maybeSingle();  // Use maybeSingle instead of single

            const userRole = roleData?.role;

            // If no role found and this is a fresh signup, retry once
            if (!userRole && retryCount < 3) {
                console.log('Role not found, retrying...', retryCount + 1);
                setTimeout(() => checkAuthorization(retryCount + 1), 500);
                return;
            }

            if (userRole && allowedRoles.includes(userRole)) {
                setAuthorized(true);
            } else {
                toast({
                    title: "Access Denied",
                    description: "You don't have permission to access this page",
                    variant: "destructive"
                });
                setAuthorized(false);
            }
        } catch (error) {
            console.error('Authorization error:', error);
            setAuthorized(false);
        } finally {
            setLoading(false);
        }
    };
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!authorized) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};