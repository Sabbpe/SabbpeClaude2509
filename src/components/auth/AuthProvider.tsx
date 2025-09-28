import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthError {
    message: string;
    status?: number;
}

interface AuthResponse {
    error: AuthError | null;
    message?: string;
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signUp: (email: string, password: string, fullName: string, mobileNumber: string, role: 'merchant' | 'distributor') => Promise<AuthResponse>;
    signIn: (email: string, password: string) => Promise<AuthResponse>;
    signOut: () => Promise<void>;
    signInWithGoogle: () => Promise<AuthResponse>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Auth state changed:', event, session?.user?.email);
                setSession(session);
                setUser(session?.user ?? null);

                // Create profile based on role ONLY for NEW users
                if (event === 'SIGNED_IN' && session?.user) {
                    setTimeout(async () => {
                        try {
                            // STEP 1: Check if user already has a role (existing user)
                            const { data: existingRole, error: roleCheckError } = await supabase
                                .from('user_roles')
                                .select('role')
                                .eq('user_id', session.user.id)
                                .maybeSingle();

                            // Log any query errors
                            if (roleCheckError) {
                                console.error('Error checking role:', roleCheckError);
                            }

                            if (existingRole?.role) {
                                // User already has a role - this is an EXISTING user signing in
                                console.log('Existing user signing in:', session.user.email, 'Role:', existingRole.role);
                                return;
                            }

                            // STEP 2: No role exists - this is a NEW user from signup
                            console.log('New user detected, creating profile for:', session.user.email);

                            // Get role from user_metadata (signup) or sessionStorage (OAuth)
                            const userRole = session.user.user_metadata?.role ||
                                sessionStorage.getItem('selected_role') ||
                                'merchant';

                            console.log('Selected role:', userRole);

                            // STEP 3: Create role entry
                            const { error: roleError } = await supabase
                                .from('user_roles')
                                .insert({
                                    user_id: session.user.id,
                                    role: userRole
                                });

                            if (roleError) {
                                console.error('Error creating role:', roleError.message, roleError);
                                return;
                            }

                            console.log('Role created successfully:', userRole);

                            // STEP 4: Create appropriate profile based on role
                            if (userRole === 'merchant') {
                                const { error: profileError } = await supabase
                                    .from('merchant_profiles')
                                    .insert({
                                        user_id: session.user.id,
                                        full_name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || '',
                                        mobile_number: session.user.user_metadata.mobile_number || '',
                                        email: session.user.email || '',
                                        onboarding_status: 'pending'
                                    });

                                if (profileError) {
                                    console.error('Error creating merchant profile:', profileError.message, profileError);
                                } else {
                                    console.log('Merchant profile created successfully');
                                }
                            } else if (userRole === 'distributor') {
                                const { error: profileError } = await supabase
                                    .from('distributor_profiles')
                                    .insert({
                                        user_id: session.user.id,
                                        company_name: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || '',
                                        contact_person: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || '',
                                        mobile_number: session.user.user_metadata.mobile_number || '',
                                        email: session.user.email || '',
                                        is_active: true
                                    });

                                if (profileError) {
                                    console.error('Error creating distributor profile:', profileError.message, profileError);
                                } else {
                                    console.log('Distributor profile created successfully');
                                }
                            }

                            // STEP 5: Clear sessionStorage role after processing
                            sessionStorage.removeItem('selected_role');
                        } catch (error) {
                            console.error('Error in profile creation:', error);
                        }
                    }, 0);
                }

                setLoading(false);
            }
        );

        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                console.error('Error getting session:', error);
            }
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signUp = async (
        email: string,
        password: string,
        fullName: string,
        mobileNumber: string,
        role: 'merchant' | 'distributor'
    ): Promise<AuthResponse> => {
        try {
            console.log('Attempting signup for:', email, 'as', role);

            if (!email || !password || !fullName) {
                return { error: { message: 'Please fill in all required fields' } };
            }

            if (password.length < 6) {
                return { error: { message: 'Password must be at least 6 characters long' } };
            }

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/`,
                    data: {
                        full_name: fullName,
                        mobile_number: mobileNumber,
                        role: role
                    }
                }
            });

            if (error) {
                console.error('Supabase signup error:', error);
                return { error: { message: error.message } };
            }

            console.log('Signup successful:', data.user?.email);

            if (data.user && !data.session) {
                return {
                    error: null,
                    message: 'Please check your email for verification link'
                };
            }

            return { error: null };

        } catch (error) {
            console.error('Unexpected signup error:', error);
            const message = error instanceof Error ? error.message : 'An unexpected error occurred';
            return { error: { message } };
        }
    };

    const signIn = async (email: string, password: string): Promise<AuthResponse> => {
        try {
            console.log('Attempting signin for:', email);

            if (!email || !password) {
                return { error: { message: 'Email and password are required' } };
            }

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                console.error('Supabase signin error:', error);

                // Better error messages
                if (error.message.includes('Invalid login credentials')) {
                    return { error: { message: 'Invalid email or password. Please check your credentials.' } };
                }
                if (error.message.includes('Email not confirmed')) {
                    return { error: { message: 'Please verify your email before signing in.' } };
                }

                return { error: { message: error.message } };
            }

            console.log('Signin successful:', data.user?.email);
            return { error: null };

        } catch (error) {
            console.error('Unexpected signin error:', error);
            const message = error instanceof Error ? error.message : 'An unexpected error occurred';
            return { error: { message } };
        }
    };

    const signOut = async () => {
        try {
            console.log('Signing out user:', user?.email);
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Signout error:', error);
            }
        } catch (error) {
            console.error('Unexpected signout error:', error);
        }
    };

    const signInWithGoogle = async (): Promise<AuthResponse> => {
        try {
            console.log('Attempting Google signin');

            // Role is already stored in sessionStorage from role selection page
            // It will be read in the auth state change handler
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/`,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    }
                }
            });

            if (error) {
                console.error('Google signin error:', error);
                return { error: { message: error.message } };
            }

            return { error: null };

        } catch (error) {
            console.error('Unexpected Google signin error:', error);
            const message = error instanceof Error ? error.message : 'Google signin failed';
            return { error: { message } };
        }
    };

    const value = {
        user,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        signInWithGoogle,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};