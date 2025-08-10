import React, { useState } from 'react';
import { useAuth } from '@/store/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RefreshCw, Database, Zap, Crown, CheckCircle, AlertTriangle } from 'lucide-react';

export function PaymentDebugTool() {
  const { user, session, profile } = useAuth();
  const queryClient = useQueryClient();
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const getAuthToken = () => {
    if (session?.access_token) {
      return session.access_token;
    }
    
    // Fallback to localStorage
    const authKeys = Object.keys(localStorage).filter(key => 
      key.includes('supabase') || key.includes('auth')
    );
    
    for (const key of authKeys) {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          const parsed = JSON.parse(value);
          if (parsed.access_token || parsed.session?.access_token) {
            return parsed.access_token || parsed.session.access_token;
          }
        }
      } catch (e) {
        // Continue searching
      }
    }
    return null;
  };

  const testSubscriptionAPI = async () => {
    setLoading('subscription');
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('No auth token found');
        return;
      }

      const response = await fetch('/api/stripe/subscription/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      setDebugData(prev => ({
        ...prev,
        subscription: {
          status: response.status,
          data,
          timestamp: new Date().toISOString()
        }
      }));
      
      console.log('Subscription API Response:', response.status, data);
    } catch (error) {
      console.error('Subscription API Error:', error);
      toast.error('API call failed');
    } finally {
      setLoading(null);
    }
  };

  const testDebugProfile = async () => {
    setLoading('profile');
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('No auth token found');
        return;
      }

      const response = await fetch('/api/stripe/debug/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      setDebugData(prev => ({
        ...prev,
        profile: {
          status: response.status,
          data,
          timestamp: new Date().toISOString()
        }
      }));
      
      console.log('Profile Debug Response:', response.status, data);
    } catch (error) {
      console.error('Profile Debug Error:', error);
      toast.error('Profile debug failed');
    } finally {
      setLoading(null);
    }
  };

  const simulateWebhook = async () => {
    setLoading('webhook');
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('No auth token found');
        return;
      }

      // Simulate a successful payment webhook
      const mockWebhookData = {
        event_type: 'checkout.session.completed',
        event_data: {
          id: 'cs_test_debug_' + Date.now(),
          metadata: {
            user_id: user?.id,
            user_email: user?.email,
            plan: 'pro_monthly'
          },
          subscription: 'sub_debug_' + Date.now(),
          customer: 'cus_debug_' + Date.now()
        }
      };

      const response = await fetch('/api/stripe/debug/test-webhook', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockWebhookData)
      });

      const data = await response.json();
      setDebugData(prev => ({
        ...prev,
        webhook: {
          status: response.status,
          data,
          timestamp: new Date().toISOString()
        }
      }));

      if (response.ok && data.success) {
        toast.success('Webhook simulation successful! 🎉');
        // Invalidate cache to refetch subscription status
        queryClient.invalidateQueries({ queryKey: ['isPro', user?.id] });
      } else {
        toast.error('Webhook simulation failed');
      }
      
      console.log('Webhook Simulation Response:', response.status, data);
    } catch (error) {
      console.error('Webhook Simulation Error:', error);
      toast.error('Webhook simulation failed');
    } finally {
      setLoading(null);
    }
  };

  const forceRefreshCache = () => {
    queryClient.invalidateQueries({ queryKey: ['isPro'] });
    queryClient.refetchQueries({ queryKey: ['isPro', user?.id] });
    toast.info('Cache refreshed');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Payment Debug Tool
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Current State */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2">User Status</h4>
              <div className="space-y-1 text-sm">
                <div>ID: {user?.id?.slice(0, 8)}...</div>
                <div>Email: {user?.email}</div>
                <div className="flex items-center gap-2">
                  Profile: 
                  {profile ? (
                    <Badge variant="outline" className="text-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Loaded
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-red-600">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Missing
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-semibold text-purple-800 mb-2">Current Pro Status</h4>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  Frontend Profile: 
                  <Badge variant={profile?.is_pro ? "default" : "outline"}>
                    {profile?.is_pro ? 'PRO' : 'FREE'}
                  </Badge>
                </div>
                <div>Last API Check: {debugData?.subscription?.timestamp || 'Not checked'}</div>
                <div className="flex items-center gap-2">
                  API Response: 
                  <Badge variant={debugData?.subscription?.data?.is_pro ? "default" : "outline"}>
                    {debugData?.subscription?.data?.is_pro ? 'PRO' : 'FREE'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-2">Auth Status</h4>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  Session: 
                  <Badge variant={session ? "default" : "outline"}>
                    {session ? 'Active' : 'Missing'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  Token: 
                  <Badge variant={getAuthToken() ? "default" : "outline"}>
                    {getAuthToken() ? 'Found' : 'Missing'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button 
              onClick={testSubscriptionAPI}
              disabled={loading === 'subscription'}
              variant="outline"
              className="h-16 flex flex-col items-center gap-1"
            >
              {loading === 'subscription' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              <span className="text-xs">Check API</span>
            </Button>

            <Button 
              onClick={testDebugProfile}
              disabled={loading === 'profile'}
              variant="outline"
              className="h-16 flex flex-col items-center gap-1"
            >
              {loading === 'profile' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              <span className="text-xs">Debug Profile</span>
            </Button>

            <Button 
              onClick={simulateWebhook}
              disabled={loading === 'webhook'}
              className="h-16 flex flex-col items-center gap-1 bg-green-600 hover:bg-green-700"
            >
              {loading === 'webhook' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Crown className="w-4 h-4" />
              )}
              <span className="text-xs">Make Pro</span>
            </Button>

            <Button 
              onClick={forceRefreshCache}
              variant="outline"
              className="h-16 flex flex-col items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="text-xs">Refresh Cache</span>
            </Button>
          </div>

          {/* Debug Output */}
          {debugData && (
            <div className="space-y-4">
              <h4 className="font-semibold">Debug Results:</h4>
              
              {debugData.subscription && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="font-medium mb-2">Subscription API Response:</h5>
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(debugData.subscription, null, 2)}
                  </pre>
                </div>
              )}

              {debugData.profile && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="font-medium mb-2">Profile Debug Response:</h5>
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(debugData.profile, null, 2)}
                  </pre>
                </div>
              )}

              {debugData.webhook && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h5 className="font-medium mb-2">Webhook Simulation Response:</h5>
                  <pre className="text-xs overflow-auto">
                    {JSON.stringify(debugData.webhook, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
            <h4 className="font-semibold text-yellow-800 mb-2">Quick Fix Instructions:</h4>
            <ol className="text-sm text-yellow-700 space-y-1">
              <li>1. Click "Check API" to see current subscription status</li>
              <li>2. Click "Debug Profile" to see what's in the database</li>
              <li>3. Click "Make Pro" to simulate a successful payment webhook</li>
              <li>4. Click "Refresh Cache" to update the frontend</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}