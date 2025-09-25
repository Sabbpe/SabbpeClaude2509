import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signUp: (email: string, password: string, fullName: string, mobileNumber: string) => Promise<{ error: any }>;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
    signInWithGoogle: () => Promise<{ error: any }>;
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
        // Set up auth state listener FIRST
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Auth state changed:', event, session?.user?.email);
                setSession(session);
                setUser(session?.user ?? null);

                // Create merchant profile if user just signed up and doesn't have one
                if (event === 'SIGNED_IN' && session?.user) {
                    setTimeout(async () => {
                        try {
                            const { data: profile, error: profileError } = await supabase
                                .from('merchant_profiles')
                                .select('id')
                                .eq('user_id', session.user.id)
                                .maybeSingle();

                            if (profileError) {
                                console.error('Error checking merchant profile:', profileError);
                                return;
                            }

                            if (!profile && session.user.user_metadata) {
                                console.log('Creating merchant profile for:', session.user.email);
                                const { error: insertError } = await supabase.from('merchant_profiles').insert({
                                    user_id: session.user.id,
                                    full_name: session.user.user_metadata.full_name || '',
                                    mobile_number: session.user.user_metadata.mobile_number || '',
                                    email: session.user.email || '',
                                });

                                if (insertError) {
                                    console.error('Error creating merchant profile:', insertError);
                                } else {
                                    console.log('Merchant profile created successfully');
                                }
                            }
                        } catch (error) {
                            console.error('Error in profile creation:', error);
                        }
                    }, 0);
                }

                setLoading(false);
            }
        );

        // THEN check for existing session
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                console.error('Error getting session:', error);
            }
            console.log('Initial session:', session?.user?.email || 'No session');
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signUp = async (email: string, password: string, fullName: string, mobileNumber: string) => {
        try {
            console.log('Attempting signup for:', email);

            // Validate inputs
            if (!email || !password || !fullName) {
                const error = new Error('Please fill in all required fields');
                console.error('Validation error:', error.message);
                return { error };
            }

            if (password.length < 6) {
                const error = new Error('Password must be at least 6 characters long');
                console.error('Validation error:', error.message);
                return { error };
            }

            const redirectUrl = `${window.location.origin}/`;
            console.log('Using redirect URL:', redirectUrl);

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: redirectUrl,
                    data: {
                        full_name: fullName,
                        mobile_number: mobileNumber,
                    }
                }
            });

            if (error) {
                console.error('Supabase signup error:', error);
                return { error };
            }

            console.log('Signup successful:', data.user?.email);

            // Check if email confirmation is required
            if (data.user && !data.session) {
                console.log('Email confirmation required');
                return {
                    error: null,
                    message: 'Please check your email for verification link'
                };
            }

            return { error: null };

        } catch (error) {
            console.error('Unexpected signup error:', error);
            return {
                error: {
                    message: error instanceof Error ? error.message : 'An unexpected error occurred'
                }
            };
        }
    };

    const signIn = async (email: string, password: string) => {
        try {
            console.log('Attempting signin for:', email);

            if (!email || !password) {
                const error = new Error('Email and password are required');
                console.error('Validation error:', error.message);
                return { error };
            }

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                console.error('Supabase signin error:', error);
                return { error };
            }

            console.log('Signin successful:', data.user?.email);
            return { error: null };

        } catch (error) {
            console.error('Unexpected signin error:', error);
            return {
                error: {
                    message: error instanceof Error ? error.message : 'An unexpected error occurred'
                }
            };
        }
    };

    const signOut = async () => {
        try {
            console.log('Signing out user:', user?.email);
            const { error } = await supabase.auth.signOut();
            if (error) {
                console.error('Signout error:', error);
            } else {
                console.log('Signout successful');
            }
        } catch (error) {
            console.error('Unexpected signout error:', error);
        }
    };

    const signInWithGoogle = async () => {
        try {
            console.log('Attempting Google signin');

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/`
                }
            });

            if (error) {
                console.error('Google signin error:', error);
                return { error };
            }

            console.log('Google signin initiated');
            return { error: null };

        } catch (error) {
            console.error('Unexpected Google signin error:', error);
            return {
                error: {
                    message: error instanceof Error ? error.message : 'Google signin failed'
                }
            };
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