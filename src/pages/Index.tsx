import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Building, CreditCard, Shield, LogOut, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { useUserRole } from "@/hooks/useUserRole";
import { Logo } from "@/components/ui/logo";

const Index = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5">
      {/* Header */}
      <header className="bg-card/50 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Logo size="md" className="flex-shrink-0" />
            <span className="text-xl font-bold text-foreground">SabbPe</span>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>{user.email}</span>
                </div>
                {isAdmin && (
                  <Link to="/admin">
                    <Button variant="default" size="sm">
                      Admin Dashboard
                    </Button>
                  </Link>
                )}
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 bg-[var(--gradient-primary)] bg-clip-text text-transparent">
            Payments Simplified. Business Amplified.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            India's Digital Payments Partner. Complete your merchant onboarding and start accepting digital payments with our secure, integrated platform.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center hover:shadow-[var(--shadow-elegant)] transition-all duration-300">
            <CardHeader>
              <Building className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Business Registration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Complete business verification with document upload and GST integration
              </p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-[var(--shadow-elegant)] transition-all duration-300">
            <CardHeader>
              <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>KYC Verification</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Live video KYC with OCR document reading and geo-location verification
              </p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-[var(--shadow-elegant)] transition-all duration-300">
            <CardHeader>
              <CreditCard className="h-12 w-12 text-primary mx-auto mb-4" />
              <CardTitle>Bank Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Secure bank account linking with automated settlement configuration
              </p>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center">
          {user ? (
            <Link to="/merchant-onboarding">
              <Button size="lg" className="px-8 py-6 text-lg font-semibold rounded-xl shadow-[var(--shadow-elegant)]">
                Continue Onboarding
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/auth">
                <Button size="lg" className="px-8 py-6 text-lg font-semibold rounded-xl shadow-[var(--shadow-elegant)]">
                  Get Started Today
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="px-8 py-6 text-lg font-semibold rounded-xl">
                Explore Solutions
              </Button>
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-4">
            Trusted by 1000+ merchants across India
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
