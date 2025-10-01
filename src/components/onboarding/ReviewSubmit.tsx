import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  User, 
  Building, 
  CreditCard, 
  FileText, 
  CheckCircle, 
  Shield 
} from 'lucide-react';
import { OnboardingData } from '@/pages/EnhancedMerchantOnboarding';

interface ReviewSubmitProps {
  data: OnboardingData;
  onDataChange: (data: Partial<OnboardingData>) => void;
  onSubmit: () => Promise<void>;
  onPrev: () => void;
  isSubmitting?: boolean;
}

export const ReviewSubmit: React.FC<ReviewSubmitProps> = ({
  data,
  onDataChange,
  onSubmit,
  onPrev,
  isSubmitting = false,
}) => {
  const handleAgreementChange = (checked: boolean) => {
    onDataChange({ agreementAccepted: checked });
  };

    const handleSubmit = async () => {
        console.log('Documents state:', data.documents);
        console.log('Has panCard?', !!data.documents?.panCard);
        console.log('Has aadhaarCard?', !!data.documents?.aadhaarCard);
        console.log('Has cancelledCheque?', !!data.documents?.cancelledCheque);

        if (data.agreementAccepted && !isSubmitting) {
            await onSubmit();
        }
    };

  const getUploadedDocumentCount = () => {
    const docs = data.documents;
    return Object.values(docs).filter(doc => doc !== undefined).length;
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-foreground mb-2">
          Review & Submit
        </h2>
        <p className="text-muted-foreground">
          Please review all your information before submitting
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Personal & Business Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Full Name:</span>
              <span className="font-medium">{data.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mobile:</span>
              <span className="font-medium">{data.mobileNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{data.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">PAN:</span>
              <span className="font-medium">{data.panNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Aadhaar:</span>
              <span className="font-medium">
                {data.aadhaarNumber.replace(/(\d{4})(\d{4})(\d{4})/, '****-****-$3')}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Business Name:</span>
              <span className="font-medium">{data.businessName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">GST Number:</span>
              <span className="font-medium">{data.gstNumber}</span>
            </div>
          </CardContent>
        </Card>

        {/* Bank Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Bank Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bank Name:</span>
              <span className="font-medium">{data.bankDetails.bankName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Account Number:</span>
              <span className="font-medium">
                ****{data.bankDetails.accountNumber.slice(-4)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">IFSC Code:</span>
              <span className="font-medium">{data.bankDetails.ifscCode}</span>
            </div>
          </CardContent>
        </Card>

        {/* Verification Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Verification Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">KYC Verification:</span>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span className="text-primary font-medium">Completed</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Video KYC:</span>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span className="text-primary font-medium">Completed</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Location Verified:</span>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span className="text-primary font-medium">Completed</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Documents:</span>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span className="text-primary font-medium">
                  {getUploadedDocumentCount()} Uploaded
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Terms and Conditions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Terms & Conditions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-6 bg-muted/30 rounded-xl mb-4">
            <h4 className="font-semibold text-foreground mb-3">Merchant Agreement Summary</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• I agree to SabbPe's Terms of Service and Privacy Policy</li>
              <li>• I understand the transaction fees and settlement terms</li>
              <li>• I authorize SabbPe to verify my business and bank details</li>
              <li>• I confirm that all provided information is accurate and up-to-date</li>
              <li>• I understand that false information may lead to account suspension</li>
            </ul>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="agreement"
              checked={data.agreementAccepted}
              onCheckedChange={handleAgreementChange}
              className="mt-1"
            />
            <Label 
              htmlFor="agreement" 
              className="text-sm text-foreground cursor-pointer leading-relaxed"
            >
              I have read and agree to all the terms and conditions, privacy policy, and 
              merchant agreement. I confirm that all the information provided is accurate 
              and I understand the responsibilities as a SabbPe merchant partner.
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-6">
        <Button
          variant="outline"
          onClick={onPrev}
          className="px-8"
        >
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!data.agreementAccepted || isSubmitting}
          className="px-8 bg-primary hover:bg-primary/90 text-primary-foreground"
          style={{ background: 'var(--gradient-primary)' }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit for Verification'}
        </Button>
      </div>
    </div>
  );
};