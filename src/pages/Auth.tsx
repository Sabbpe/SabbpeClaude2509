import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Mail, Lock, User, Phone, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Logo } from '@/components/ui/logo';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
    const { user, signIn, signUp, signInWithGoogle, loading } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedRole, setSelectedRole] = useState<'merchant' | 'distributor' | null>(null);

    // Sign in form state
    const [signInData, setSignInData] = useState({
        email: '',
        password: '',
    });

    // Sign up form state
    const [signUpData, setSignUpData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        mobileNumber: '',
    });

    // Check for selected role on mount
    useEffect(() => {
        const role = sessionStorage.getItem('selected_role') as 'merchant' | 'distributor' | null;

        if (!role) {
            // No role selected, redirect to role selection
            navigate('/select-role', { replace: true });
            return;
        }

        setSelectedRole(role);
    }, [navigate]);

    // FIXED: Role-based redirect after authentication
    useEffect(() => {
        const redirectBasedOnRole = async () => {
            if (!loading && user) {
                try {
                    const { data: roleData } = await supabase
                        .from('user_roles')
                        .select('role')
                        .eq('user_id', user.id)
                        .single();

                    if (roleData?.role === 'merchant') {
                        navigate('/merchant-onboarding', { replace: true });
                    } else if (roleData?.role === 'distributor') {
                        navigate('/distributor', { replace: true });
                    } else if (roleData?.role === 'admin') {
                        navigate('/admin', { replace: true });
                    } else {
                        // Fallback: redirect to role selection if no role found
                        navigate('/select-role', { replace: true });
                    }
                } catch (error) {
                    console.error('Error fetching user role:', error);
                    // Fallback on error
                    navigate('/select-role', { replace: true });
                }
            }
        };

        redirectBasedOnRole();
    }, [user, loading, navigate]);

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const { error } = await signIn(signInData.email, signInData.password);

        if (error) {
            // Better error messages
            let errorMessage = error.message;

            if (error.message.includes('Invalid login credentials')) {
                errorMessage = 'No account found with these credentials. Please sign up first.';
            } else if (error.message.includes('Email not confirmed')) {
                errorMessage = 'Please verify your email before signing in.';
            }

            setError(errorMessage);
            toast({
                variant: "destructive",
                title: "Sign in failed",
                description: errorMessage,
            });
        } else {
            toast({
                title: "Welcome back!",
                description: "You have successfully signed in.",
            });
        }

        setIsLoading(false);
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (signUpData.password !== signUpData.confirmPassword) {
            setError("Passwords don't match");
            setIsLoading(false);
            return;
        }

        if (signUpData.password.length < 6) {
            setError("Password must be at least 6 characters");
            setIsLoading(false);
            return;
        }

        if (!selectedRole) {
            setError("Role not selected. Please go back and select your role.");
            setIsLoading(false);
            return;
        }

        const { error } = await signUp(
            signUpData.email,
            signUpData.password,
            signUpData.fullName,
            signUpData.mobileNumber,
            selectedRole  // Pass the selected role
        );

        if (error) {
            setError(error.message);
            toast({
                variant: "destructive",
                title: "Sign up failed",
                description: error.message,
            });
        } else {
            toast({
                title: "Account created!",
                description: "Please check your email to verify your account.",
            });
        }

        setIsLoading(false);
    };

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        const { error } = await signInWithGoogle();

        if (error) {
            setError(error.message);
            toast({
                variant: "destructive",
                title: "Google sign in failed",
                description: error.message,
            });
        }

        setIsLoading(false);
    };

    const handleBackToRoleSelection = () => {
        sessionStorage.removeItem('selected_role');
        navigate('/select-role');
    };

    if (loading || !selectedRole) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5 p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Logo size="md" className="mb-4" />
                    <h1 className="text-2xl font-bold text-foreground mb-2">
                        SabbPe {selectedRole === 'merchant' ? 'Merchant' : 'Distributor'} Portal
                    </h1>
                    <p className="text-muted-foreground">
                        India's Digital Payments Partner
                    </p>
                </div>

                <Card className="shadow-[var(--shadow-elegant)]">
                    <CardHeader>
                        <div className="flex items-center justify-between mb-2">
                            <CardTitle>Get Started</CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleBackToRoleSelection}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <ArrowLeft className="w-4 h-4 mr-1" />
                                Change Role
                            </Button>
                        </div>
                        <CardDescription>
                            Sign in to your account or create a new one as a{' '}
                            <span className="font-semibold text-foreground">
                                {selectedRole === 'merchant' ? 'Merchant' : 'Distributor'}
                            </span>
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="signin" className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="signin">Sign In</TabsTrigger>
                                <TabsTrigger value="signup">Sign Up</TabsTrigger>
                            </TabsList>

                            <TabsContent value="signin" className="space-y-4">
                                <form onSubmit={handleSignIn} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="signin-email">Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="signin-email"
                                                type="email"
                                                placeholder="Enter your email"
                                                className="pl-10"
                                                value={signInData.email}
                                                onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="signin-password">Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="signin-password"
                                                type="password"
                                                placeholder="Enter your password"
                                                className="pl-10"
                                                value={signInData.password}
                                                onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <Alert variant="destructive">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>{error}</AlertDescription>
                                        </Alert>
                                    )}

                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? "Signing in..." : "Sign In"}
                                    </Button>
                                </form>
                            </TabsContent>

                            <TabsContent value="signup" className="space-y-4">
                                <form onSubmit={handleSignUp} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="signup-name">Full Name</Label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="signup-name"
                                                type="text"
                                                placeholder="Enter your full name"
                                                className="pl-10"
                                                value={signUpData.fullName}
                                                onChange={(e) => setSignUpData({ ...signUpData, fullName: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="signup-mobile">Mobile Number</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="signup-mobile"
                                                type="tel"
                                                placeholder="Enter your mobile number"
                                                className="pl-10"
                                                value={signUpData.mobileNumber}
                                                onChange={(e) => setSignUpData({ ...signUpData, mobileNumber: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="signup-email">Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="signup-email"
                                                type="email"
                                                placeholder="Enter your email"
                                                className="pl-10"
                                                value={signUpData.email}
                                                onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="signup-password">Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="signup-password"
                                                type="password"
                                                placeholder="Create a password"
                                                className="pl-10"
                                                value={signUpData.password}
                                                onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="signup-confirm">Confirm Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="signup-confirm"
                                                type="password"
                                                placeholder="Confirm your password"
                                                className="pl-10"
                                                value={signUpData.confirmPassword}
                                                onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <Alert variant="destructive">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>{error}</AlertDescription>
                                        </Alert>
                                    )}

                                    <Button
                                        type="submit"
                                        className="w-full"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? "Creating account..." : "Sign Up"}
                                    </Button>
                                </form>
                            </TabsContent>
                        </Tabs>

                        <div className="mt-6">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                onClick={handleGoogleSignIn}
                                disabled={isLoading}
                                className="w-full mt-4"
                            >
                                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Continue with Google
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Auth;