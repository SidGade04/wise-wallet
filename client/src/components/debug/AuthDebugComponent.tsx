import { useAuth } from '@/store/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function AuthDebugComponent() {
  const { user, session, profile } = useAuth();
  const [localStorageData, setLocalStorageData] = useState<any>(null);

  const analyzeLocalStorage = () => {
    const authKeys = Object.keys(localStorage).filter(key => 
      key.includes('supabase') || 
      key.includes('auth') ||
      key.startsWith('sb-')
    );
    
    const data: any = {};
    authKeys.forEach(key => {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          data[key] = JSON.parse(value);
        }
      } catch (e) {
        data[key] = `Parse error: ${e}`;
      }
    });
    
    setLocalStorageData(data);
  };

  const testSubscriptionAPI = async () => {
    let token = null;
    
    // Try to get token from session
    if (session?.access_token) {
      token = session.access_token;
      console.log('Using session token');
    } else {
      // Search localStorage
      const authKeys = Object.keys(localStorage).filter(key => 
        key.includes('supabase') || key.includes('auth')
      );
      
      for (const key of authKeys) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const parsed = JSON.parse(value);
            if (parsed.access_token || parsed.session?.access_token) {
              token = parsed.access_token || parsed.session.access_token;
              console.log(`Found token in ${key}`);
              break;
            }
          }
        } catch (e) {
          // Continue
        }
      }
    }
    
    if (!token) {
      console.error('No token found');
      return;
    }
    
    try {
      const response = await fetch('/api/stripe/subscription/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      console.log('API Response:', response.status, data);
    } catch (error) {
      console.error('API Error:', error);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Auth Debug Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* User Info */}
        <div>
          <h4 className="font-semibold mb-2">User:</h4>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify({
              id: user?.id,
              email: user?.email,
              created_at: user?.created_at
            }, null, 2)}
          </pre>
        </div>

        {/* Session Info */}
        <div>
          <h4 className="font-semibold mb-2">Session:</h4>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify({
              access_token: session?.access_token ? 'EXISTS' : 'MISSING',
              refresh_token: session?.refresh_token ? 'EXISTS' : 'MISSING',
              expires_at: session?.expires_at,
              expires_in: session?.expires_in
            }, null, 2)}
          </pre>
        </div>

        {/* Profile Info */}
        <div>
          <h4 className="font-semibold mb-2">Profile:</h4>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(profile, null, 2)}
          </pre>
        </div>

        {/* LocalStorage Analysis */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold">LocalStorage Auth Keys:</h4>
            <Button size="sm" onClick={analyzeLocalStorage}>
              Analyze
            </Button>
          </div>
          {localStorageData && (
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(localStorageData, null, 2)}
            </pre>
          )}
        </div>

        {/* API Test */}
        <div>
          <Button onClick={testSubscriptionAPI} className="w-full">
            Test Subscription API Call
          </Button>
          <p className="text-xs text-gray-600 mt-1">
            Check browser console for results
          </p>
        </div>

      </CardContent>
    </Card>
  );
}