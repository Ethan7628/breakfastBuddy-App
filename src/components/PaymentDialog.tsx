import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CreditCard, Smartphone, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: Record<string, number>;
  totalAmount: number;
  onPaymentSuccess: () => void;
}

export const PaymentDialog: React.FC<PaymentDialogProps> = ({
  isOpen,
  onClose,
  cartItems,
  totalAmount,
  onPaymentSuccess
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'mobile_money'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const handlePayment = async () => {
    if (!currentUser) {
      toast({
        title: "Authentication Required",
        description: "Please log in to complete your purchase.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    try {
      // Prepare cart items for the API
      const items = Object.entries(cartItems).map(([itemId, quantity]) => ({
        id: itemId,
        quantity
      }));

      console.log('Creating payment with:', {
        firebaseUserId: currentUser.uid,
        items,
        totalAmount,
        paymentMethod: selectedMethod
      });

      // Create payment intent
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          firebaseUserId: currentUser.uid,
          items,
          totalAmount,
          paymentMethod: selectedMethod
        }
      });

      if (error) {
        console.error('Payment creation error:', error);
        throw new Error(error.message || 'Failed to create payment');
      }

      console.log('Payment intent created:', data);

      // For demo purposes, we'll simulate a successful payment
      // In a real implementation, you would integrate with Stripe Elements or redirect to Stripe Checkout
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Confirm payment
      const { data: confirmData, error: confirmError } = await supabase.functions.invoke('confirm-payment', {
        body: {
          paymentIntentId: data.paymentIntentId,
          orderId: data.orderId
        }
      });

      if (confirmError) {
        console.error('Payment confirmation error:', confirmError);
        throw new Error(confirmError.message || 'Failed to confirm payment');
      }

      console.log('Payment confirmed:', confirmData);

      toast({
        title: "Payment Successful!",
        description: "Your order has been processed successfully.",
      });

      onPaymentSuccess();
      onClose();
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "An error occurred during payment.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md  bg-amber-50">
        <DialogHeader>
          <DialogTitle>Choose Payment Method</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-lg font-semibold text-center">
            Total: UGX {totalAmount.toLocaleString()}
          </div>

          <div className="space-y-3">
            <Card 
              className={`p-4 cursor-pointer border-2 transition-colors ${
                selectedMethod === 'card' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedMethod('card')}
            >
              <div className="flex items-center space-x-3">
                <CreditCard className="w-6 h-6" />
                <div>
                  <div className="font-semibold">Credit/Debit Card</div>
                  <div className="text-sm text-gray-600">Visa, Mastercard, etc.</div>
                </div>
              </div>
            </Card>

            <Card 
              className={`p-4 cursor-pointer border-2 transition-colors ${
                selectedMethod === 'mobile_money' 
                  ? 'border-primary bg-primary/5' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedMethod('mobile_money')}
            >
              <div className="flex items-center space-x-3">
                <Smartphone className="w-6 h-6" />
                <div>
                  <div className="font-semibold">Mobile Money</div>
                  <div className="text-sm text-gray-600">MTN, Airtel Money</div>
                </div>
              </div>
            </Card>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button 
              variant="outline" 
              className="flex-1" 
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1" 
              onClick={handlePayment}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Pay Now'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};