import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
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
  const [phoneNumber, setPhoneNumber] = useState('256');
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

    // Sanitize and validate phone number
    const sanitizedPhone = phoneNumber.replace(/[\s\-\+]/g, '');
    if (!sanitizedPhone.match(/^256\d{9}$/)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid Uganda phone number (e.g., 256712345678)",
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

      console.log('Creating MunoPay payment with:', { items, phone: sanitizedPhone, totalAmount });

      const response = await supabase.functions.invoke('create-munopay-payment', {
        body: {
          items,
          phone: sanitizedPhone,
          customerEmail: currentUser.email || 'customer@example.com',
          customerName: currentUser.user_metadata?.name || 'Customer',
        }
      });

      console.log('MunoPay response:', response);

      if (response.error) {
        console.error('Payment creation error:', response.error);
        throw response.error;
      }

      if (!response.data?.success) {
        const errorCode = response.data?.error?.code;
        const errorMessage = response.data?.error?.message;
        
        // Provide user-friendly error messages
        if (errorCode === 'gateway_unreachable') {
          throw new Error('Payment gateway is temporarily unavailable. Please try again in a few moments.');
        } else if (errorCode === 'invalid_phone') {
          throw new Error('Invalid phone number format. Please use format: 256XXXXXXXXX');
        } else if (errorCode === 'unauthorized') {
          throw new Error('Authentication failed. Please log in again.');
        }
        
        throw new Error(errorMessage || 'Payment failed. Please try again.');
      }

      toast({
        title: "Payment Request Sent",
        description: "Please check your phone to approve the mobile money payment.",
      });
      
      setTimeout(() => {
        onPaymentSuccess();
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Payment error:', error);
      const errorMessage = error instanceof Error ? error.message : "An error occurred during payment.";
      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive"
      });
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-amber-50" aria-describedby="payment-description">
        <DialogHeader>
          <DialogTitle>Mobile Money Payment</DialogTitle>
          <DialogDescription id="payment-description">
            Enter your mobile money number to complete the payment
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-lg font-semibold text-center">
            Total: UGX {totalAmount.toLocaleString()}
          </div>

          <div className="space-y-3">
            <Card className="p-4 border-2 border-primary bg-primary/5">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6">📱</div>
                <div>
                  <div className="font-semibold">Mobile Money</div>
                  <div className="text-sm text-gray-600">MTN, Airtel - Instant payment</div>
                </div>
              </div>
            </Card>

            <div className="space-y-2 p-4 bg-gray-50 rounded-lg">
              <label className="text-sm font-medium">Phone Number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="256771234567"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                maxLength={12}
              />
              <p className="text-xs text-gray-500">Format: 256XXXXXXXXX</p>
            </div>
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