import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, CheckCircle2, Smartphone } from 'lucide-react';
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
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'pending' | 'success' | 'error'>('idle');
  const [orderDetails, setOrderDetails] = useState<any>(null);
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

    // Check if session is still valid
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      toast({
        title: "Session Expired",
        description: "Please log in again to complete your purchase.",
        variant: "destructive"
      });
      return;
    }

    // Sanitize and validate phone number
    let sanitizedPhone = phoneNumber.replace(/[\s\-\+]/g, '');
    
    // If phone starts with 0, replace with 256 (Uganda format)
    if (sanitizedPhone.startsWith('0') && sanitizedPhone.length === 10) {
      sanitizedPhone = '256' + sanitizedPhone.substring(1);
    }
    // If phone doesn't start with 256, add it (assuming Uganda number)
    else if (!sanitizedPhone.startsWith('256') && sanitizedPhone.length === 9) {
      sanitizedPhone = '256' + sanitizedPhone;
    }
    
    if (!sanitizedPhone.match(/^256\d{9}$/)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid Uganda phone number (e.g., 0712345678 or 712345678)",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('processing');

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

      // Validate items
      if (items.length === 0) {
        toast({
          title: "Empty Cart",
          description: "Your cart is empty. Please add items before checkout.",
          variant: "destructive"
        });
        setIsProcessing(false);
        setPaymentStatus('idle');
        return;
      }

      // Calculate total from items
      const calculatedTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      if (calculatedTotal <= 0) {
        toast({
          title: "Invalid Order",
          description: "Order total must be greater than 0.",
          variant: "destructive"
        });
        setIsProcessing(false);
        setPaymentStatus('idle');
        return;
      }

      console.log('=== DEBUG: Preparing payment request ===');
      console.log('Calculated total:', calculatedTotal);
      console.log('Phone:', sanitizedPhone);
      console.log('Items count:', items.length);
      console.log('Customer email:', currentUser.email);
      console.log('=== END DEBUG ===');

      // Prepare request body
      const requestBody = {
        items,
        phone: sanitizedPhone,
        totalAmount: calculatedTotal,
        customerEmail: currentUser.email || 'customer@example.com',
        customerName: currentUser.user_metadata?.name || 'Customer',
      };

      console.log('Creating payment with:', requestBody);

      // Get the access token for authorization header
      const accessToken = session.access_token;
      console.log('Access token available:', !!accessToken);

      const response = await supabase.functions.invoke('create-munopay-payment', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: requestBody
      });

      console.log('Payment response:', response);
      console.log('Response data:', response.data);
      console.log('Response error:', response.error);

      if (response.error) {
        console.error('Payment error:', response.error);
        throw response.error;
      }

      // Parse the response data if it's a string
      let responseData = response.data;
      if (typeof responseData === 'string') {
        try {
          responseData = JSON.parse(responseData);
        } catch (e) {
          console.error('Failed to parse response data:', e);
          throw new Error('Invalid response from server');
        }
      }

      // Check if successful
      if (responseData?.success) {
        // Store order details
        setOrderDetails(responseData.data);
        
        // Determine the correct status based on response
        if (responseData.data.paymentStatus === 'pending' && responseData.data.transactionId) {
          // Payment was initiated and is PENDING user approval
          setPaymentStatus('pending');
          
          toast({
            title: "Payment Initiated!",
            description: "Check your phone to approve the mobile money payment.",
            duration: 8000,
          });
        } else if (responseData.data.status === 'gateway_error') {
          // Payment gateway not configured
          setPaymentStatus('error');
          
          toast({
            title: "Payment Gateway Error",
            description: "Order saved but payment gateway not configured. Contact support.",
            variant: "destructive",
            duration: 8000,
          });
        } else {
          // Generic success (should not happen with updated Edge Function)
          setPaymentStatus('success');
          
          toast({
            title: "Success!",
            description: `Order #${responseData.data.orderId?.substring(0, 8)} processed.`,
            duration: 5000,
          });
          
          // Auto-close after 3 seconds
          setTimeout(() => {
            onPaymentSuccess();
            onClose();
            setIsProcessing(false);
            setPaymentStatus('idle');
            setOrderDetails(null);
          }, 3000);
        }
        
      } else {
        // Handle API error
        const errorMessage = responseData?.error?.message || 'Payment failed. Please try again.';
        throw new Error(errorMessage);
      }

    } catch (error) {
      console.error('Payment error:', error);
      const errorMessage = error instanceof Error ? error.message : "An error occurred during payment.";
      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive"
      });
      setIsProcessing(false);
      setPaymentStatus('error');
    }
  };

  // Helper function to validate phone as user types
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow only numbers and + at the beginning
    const numericValue = value.replace(/[^\d+]/g, '');
    
    // If starts with +, keep it
    if (numericValue.startsWith('+')) {
      setPhoneNumber(numericValue);
    } else {
      // Otherwise, ensure it starts with 256
      const cleanValue = numericValue.replace(/^\+/, '');
      if (cleanValue.startsWith('256')) {
        setPhoneNumber(cleanValue);
      } else {
        // Auto-format: if user types 0, show 256...
        if (cleanValue.startsWith('0') && cleanValue.length <= 10) {
          setPhoneNumber('256' + cleanValue.substring(1));
        } else if (cleanValue.length <= 9) {
          setPhoneNumber('256' + cleanValue);
        } else {
          setPhoneNumber(cleanValue);
        }
      }
    }
  };

  // Format display phone number
  const displayPhone = phoneNumber.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');

  // Reset dialog when closed
  const handleClose = () => {
    if (isProcessing) {
      toast({
        title: "Payment Cancelled",
        description: "Payment process was cancelled.",
      });
    }
    setIsProcessing(false);
    setPaymentStatus('idle');
    setOrderDetails(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md bg-amber-50" aria-describedby="payment-description">
        <DialogHeader>
          <DialogTitle>
            {paymentStatus === 'success' ? 'Payment Successful!' : 
             paymentStatus === 'pending' ? 'Payment Initiated!' : 
             'Mobile Money Payment'}
          </DialogTitle>
          <DialogDescription id="payment-description">
            {paymentStatus === 'success' ? 'Your order has been processed successfully' : 
             paymentStatus === 'pending' ? 'Please approve the payment on your phone' : 
             'Enter your mobile money number to complete the payment'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {paymentStatus === 'pending' ? (
            // PAYMENT PENDING SCREEN - User needs to approve on phone
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Smartphone className="w-10 h-10 text-blue-600" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold">Approve Payment on Your Phone</h3>
                <p className="text-gray-600 mt-1">
                  Order #{orderDetails?.orderId?.substring(0, 8) || 'N/A'}
                </p>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center justify-center space-x-2 mb-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <p className="text-sm font-medium text-blue-800">
                    Waiting for your approval...
                  </p>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-mono text-blue-700">
                      {orderDetails?.transactionId?.substring(0, 12)}...
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-semibold">UGX {orderDetails?.amount?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span>{orderDetails?.phone || displayPhone}</span>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-xs text-yellow-800 font-medium">
                    ⚠️ Important: Check your phone now!
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    A mobile money prompt has been sent to {orderDetails?.phone || displayPhone}. 
                    Enter your PIN to complete the payment.
                  </p>
                </div>
              </div>
              
              <div className="pt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleClose}
                >
                  I've Approved the Payment
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  If you don't see the prompt, check your messages or try again in 30 seconds.
                </p>
              </div>
            </div>
          ) : paymentStatus === 'success' ? (
            // PAYMENT SUCCESS SCREEN (Only when payment is actually completed)
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold">Payment Successful!</h3>
                <p className="text-gray-600 mt-1">
                  Order #{orderDetails?.orderId?.substring(0, 8) || 'N/A'}
                </p>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount Paid:</span>
                    <span className="font-semibold text-green-700">
                      UGX {orderDetails?.amount?.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transaction ID:</span>
                    <span className="font-mono text-green-700">
                      {orderDetails?.transactionId?.substring(0, 12)}...
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium text-green-600">✓ Completed</span>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-gray-500 animate-pulse">
                Closing in 3 seconds...
              </p>
            </div>
          ) : (
            // PAYMENT FORM SCREEN (Default state)
            <>
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
                  <div className="flex items-center border border-gray-300 rounded-md overflow-hidden bg-white">
                    <span className="px-3 py-2 bg-gray-100 border-r text-sm">+256</span>
                    <input
                      type="tel"
                      value={phoneNumber.replace('256', '')}
                      onChange={handlePhoneChange}
                      placeholder="771234567"
                      className="flex-1 px-3 py-2 focus:outline-none"
                      maxLength={10}
                      disabled={isProcessing}
                    />
                  </div>
                  <div className="flex justify-between">
                    <p className="text-xs text-gray-500">Example: 771234567</p>
                    <p className="text-xs text-gray-500">
                      Full: <span className="font-mono">{displayPhone}</span>
                    </p>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="p-4 bg-white border rounded-lg">
                  <h3 className="font-semibold mb-2">Order Summary</h3>
                  <div className="space-y-1 text-sm">
                    {Object.entries(cartItems).map(([itemId, quantity]) => {
                      const menuItem = menuItems.find(item => item.id === itemId);
                      if (!menuItem) return null;
                      return (
                        <div key={itemId} className="flex justify-between">
                          <span>{menuItem.name} × {quantity}</span>
                          <span>UGX {(menuItem.price * quantity).toLocaleString()}</span>
                        </div>
                      );
                    })}
                    <div className="border-t pt-1 mt-1 font-semibold flex justify-between">
                      <span>Total</span>
                      <span>UGX {totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1 hover:bg-gray-100 active:scale-95 transition-transform font-semibold" 
                  onClick={handleClose}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-primary hover:bg-primary/90 active:scale-95 transition-all shadow-md hover:shadow-lg font-semibold" 
                  onClick={handlePayment}
                  disabled={isProcessing || !phoneNumber.match(/^256\d{9}$/)}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    `Pay UGX ${totalAmount.toLocaleString()}`
                  )}
                </Button>
              </div>

              {isProcessing && (
                <div className="text-center text-sm text-gray-500">
                  <p>Please wait while we process your payment...</p>
                  <p className="text-xs mt-1">Do not close this window</p>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};