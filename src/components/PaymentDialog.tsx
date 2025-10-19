import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CreditCard, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PaymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: Record<string, number>;
  menuItems: Array<{ id: string; name: string; price: number }>;
  totalAmount: number;
  onPaymentSuccess: () => void;
}

export const PaymentDialog: React.FC<PaymentDialogProps> = ({
  isOpen,
  onClose,
  cartItems,
  menuItems,
  totalAmount,
  onPaymentSuccess
}) => {
  const [selectedMethod] = useState<'card'>('card');
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
      // Prepare cart items with full details for the API
      const items = Object.entries(cartItems).map(([itemId, quantity]) => {
        const menuItem = menuItems.find(item => item.id === itemId);
        if (!menuItem) {
          throw new Error(`Menu item not found: ${itemId}`);
        }
        return {
          id: itemId,
          name: menuItem.name,
          price: menuItem.price,
          quantity
        };
      });

      console.log('Creating Stripe payment with:', {
        items,
        totalAmount
      });

      // Create payment with Stripe
      const { data, error } = await supabase.functions.invoke('create-stripe-payment', {
        body: {
          items,
          customerEmail: currentUser.email || 'customer@example.com',
          customerName: currentUser.user_metadata?.name || 'Customer',
        }
      });

      if (error) {
        console.error('Payment creation error:', error);
        throw new Error(error.message || 'Failed to create payment');
      }

      console.log('Stripe payment created:', data);

      // Redirect to Stripe Checkout
      if (data.sessionUrl) {
        window.location.href = data.sessionUrl;
      } else {
        throw new Error('No payment URL received');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Failed",
        description: error instanceof Error ? error.message : "An error occurred during payment.",
        variant: "destructive"
      });
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
              className="p-4 border-2 border-primary bg-primary/5"
            >
              <div className="flex items-center space-x-3">
                <CreditCard className="w-6 h-6" />
                <div>
                  <div className="font-semibold">Secure Card Payment</div>
                  <div className="text-sm text-gray-600">Powered by Stripe - Visa, Mastercard, Amex</div>
                </div>
              </div>
            </Card>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button 
              variant="outline" 
              className="flex-1 hover:bg-gray-100 active:scale-95 transition-transform font-semibold" 
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1 bg-primary hover:bg-primary/90 active:scale-95 transition-all shadow-md hover:shadow-lg font-semibold" 
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