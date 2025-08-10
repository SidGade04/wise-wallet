import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/store/useAuth";
import { useAuthToken } from "@/hooks/useAuthToken";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/useToast";
import {
  Settings,
  CheckCircle,
  Building2,
  Crown,
  RefreshCw,
  Database,
  Webhook
} from "lucide-react";

interface DebugPanelProps {
  show?: boolean;
}

export const DebugPanel = ({ show = true }: DebugPanelProps) => {
  const { user } = useAuth();
  const { getToken } = useAuthToken();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  if (!show) return null;

  const fixBankConnection = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ has_connected_bank: true })
        .eq('user_id', user?.id);
        
      if (!error) {
        toast({
          title: "✅ Bank connection status updated",
          description: "Profile updated successfully",
        });
        // Don't auto-refresh, let user decide
      } else {
        throw error;
      }
    } catch (error) {
      console.error('Failed to update bank status:', error);
      toast({
        title: "❌ Failed to update bank connection",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const triggerWebhookSimulation = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/stripe/debug/test-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          event_type: 'checkout.session.completed',
          event_data: {
            id: `debug_session_${Date.now()}`,
            metadata: {
              user_id: user?.id,
              user_email: user?.email,
              plan: 'pro_monthly'
            },
            subscription: `debug_sub_${Date.now()}`,
            customer: `debug_customer_${Date.now()}`
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "✅ Webhook simulation completed",
          description: "Check the response in console",
        });
        console.log('Webhook simulation result:', result);
        
        // Refresh subscription status
        queryClient.invalidateQueries({ queryKey: ['isPro'] });
        queryClient.invalidateQueries({ queryKey: ['subscription'] });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Webhook simulation failed:', error);
      toast({
        title: "❌ Webhook simulation failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const checkProfileStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_pro, has_connected_bank, stripe_customer_id, stripe_subscription_id, subscription_status')
        .eq('user_id', user?.id)
        .single();
        
      if (!error && data) {
        console.log('📊 Current Profile Data:', data);
        toast({
          title: "📊 Profile Status",
          description: `Pro: ${data.is_pro}, Bank: ${data.has_connected_bank}, Stripe ID: ${data.stripe_customer_id ? 'Set' : 'None'}`,
        });
      } else {
        throw error;
      }
    } catch (error) {
      console.error('Failed to check profile:', error);
      toast({
        title: "❌ Failed to check profile",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const refreshSubscriptionStatus = async () => {
    try {
      // Force refresh all subscription-related queries
      queryClient.invalidateQueries({ queryKey: ['isPro'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      
      toast({
        title: "🔄 Refreshing subscription status",
        description: "Checking latest status from server",
      });
    } catch (error) {
      console.error('Failed to refresh:', error);
    }
  };

  const checkWebhookEndpoint = async () => {
    try {
      const token = await getToken();
      const response = await fetch('/api/stripe/debug/subscription', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('🔍 Debug subscription endpoint result:', result);
        toast({
          title: "🔍 Debug info retrieved",
          description: "Check console for detailed information",
        });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Debug endpoint failed:', error);
      toast({
        title: "❌ Debug endpoint failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="shadow-card border-yellow-200 bg-yellow-50 mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-yellow-800">
          <Settings className="w-5 h-5" />
          🛠️ Debug Panel - Payment & Connection Issues
        </CardTitle>
        <CardDescription className="text-yellow-700">
          Tools to diagnose and fix subscription and bank connection issues. Use webhook simulation instead of hardcoding Pro status.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Subscription Related */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-yellow-800">Subscription</h4>
            <Button 
              onClick={triggerWebhookSimulation} 
              variant="outline" 
              size="sm" 
              className="w-full border-green-300"
            >
              <Webhook className="w-4 h-4 mr-2" />
              Simulate Webhook
            </Button>
            <Button 
              onClick={refreshSubscriptionStatus} 
              variant="outline" 
              size="sm" 
              className="w-full border-blue-300"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Status
            </Button>
          </div>

          {/* Bank Connection */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-yellow-800">Bank Connection</h4>
            <Button 
              onClick={fixBankConnection} 
              variant="outline" 
              size="sm" 
              className="w-full border-blue-300"
            >
              <Building2 className="w-4 h-4 mr-2" />
              Fix Bank Status
            </Button>
          </div>

          {/* Debug Info */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-yellow-800">Debug Info</h4>
            <Button 
              onClick={checkProfileStatus} 
              variant="outline" 
              size="sm" 
              className="w-full"
            >
              <Database className="w-4 h-4 mr-2" />
              Check Profile
            </Button>
            <Button 
              onClick={checkWebhookEndpoint} 
              variant="outline" 
              size="sm" 
              className="w-full"
            >
              <Settings className="w-4 h-4 mr-2" />
              Debug Endpoint
            </Button>
          </div>
        </div>

        <div className="mt-4 p-3 bg-yellow-100 rounded text-xs text-yellow-700">
          <p className="font-medium mb-1">💡 Recommended Flow:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Click "Check Profile" to see current status</li>
            <li>Click "Simulate Webhook" to properly set Pro status (simulates successful payment)</li>
            <li>Click "Fix Bank Status" if bank connection shows as false</li>
            <li>Click "Refresh Status" to update the UI</li>
          </ol>
          <p className="mt-2 text-yellow-600">
            ⚠️ This component should only be visible in development or for admin debugging.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};