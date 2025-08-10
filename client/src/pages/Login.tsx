import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  PiggyBank,
  Mail,
  Lock,
  User,
  Loader2,
  AlertCircle,
} from "lucide-react";

export default function Login() {
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    setAuthLoading(true);
    // Simulate OAuth login
    setTimeout(() => {
      console.log(`OAuth login with ${provider}`);
      setAuthLoading(false);
    }, 1500);
  };

  const handleEmailLogin = async () => {
    setAuthLoading(true);
    setError(null);

    // Simulate login
    setTimeout(() => {
      console.log("Login attempt");
      setAuthLoading(false);
    }, 1500);
  };

  const handleRegister = async () => {
    setAuthLoading(true);
    setError(null);

    // Simulate registration
    setTimeout(() => {
      console.log("Registration attempt");
      setAuthLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Left Side - Logo & Branding */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800">
        <div className="text-center text-white max-w-md">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl border border-white/30 dark:bg-white/10 dark:border-white/20">
            <PiggyBank className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-4 text-white">
            Wise Wallet
          </h1>
          <p className="text-blue-100 dark:text-gray-300 text-lg leading-relaxed mb-6">
            Take control of your finances with our smart budgeting tools and insights
          </p>
          <div className="space-y-3 text-blue-100 dark:text-gray-300 text-sm">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span>Track expenses automatically</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span>Set and achieve financial goals</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <span>Get personalized insights</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white dark:bg-gray-900">
        <div className="w-full max-w-md">
          <Card className="shadow-xl border-0 dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl dark:text-white">Welcome</CardTitle>
              <CardDescription className="dark:text-gray-300">
                Sign in to your account or create a new one
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 dark:bg-gray-700">
                  <TabsTrigger value="login" className="dark:data-[state=active]:bg-gray-600 dark:text-gray-300">Sign In</TabsTrigger>
                  <TabsTrigger value="register" className="dark:data-[state=active]:bg-gray-600 dark:text-gray-300">Sign Up</TabsTrigger>
                </TabsList>

                {/* OAuth Buttons */}
                <div className="space-y-2 mt-4">
                  <Button
                    variant="outline"
                    className="w-full h-9 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
                    onClick={() => handleOAuthLogin("google")}
                    disabled={authLoading}
                  >
                    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-9 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
                    onClick={() => handleOAuthLogin("apple")}
                    disabled={authLoading}
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      viewBox="0 0 814 1000"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="currentColor"
                    >
                      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/>
                    </svg>
                    Continue with Apple
                  </Button>
                </div>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full dark:bg-gray-600" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">
                      Or continue with email
                    </span>
                  </div>
                </div>

                {/* Sign In Tab */}
                <TabsContent value="login" className="space-y-3 mt-0">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="email" className="text-sm dark:text-gray-200">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="Enter your email"
                          className="pl-10 h-9 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                          disabled={authLoading}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="password" className="text-sm dark:text-gray-200">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          placeholder="Enter your password"
                          className="pl-10 h-9 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                          disabled={authLoading}
                        />
                      </div>
                    </div>
                    <Button onClick={handleEmailLogin} className="w-full h-9" disabled={authLoading}>
                      {authLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Signing in...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </div>
                </TabsContent>

                {/* Sign Up Tab */}
                <TabsContent value="register" className="space-y-3 mt-0">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="name" className="text-sm dark:text-gray-200">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          id="name"
                          name="name"
                          type="text"
                          placeholder="Enter your full name"
                          className="pl-10 h-9 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                          disabled={authLoading}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="reg-email" className="text-sm dark:text-gray-200">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          id="reg-email"
                          name="email"
                          type="email"
                          placeholder="Enter your email"
                          className="pl-10 h-9 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                          disabled={authLoading}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="reg-password" className="text-sm dark:text-gray-200">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          id="reg-password"
                          name="password"
                          type="password"
                          placeholder="Create a password"
                          className="pl-10 h-9 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                          disabled={authLoading}
                        />
                      </div>
                    </div>
                    <Button onClick={handleRegister} className="w-full h-9" disabled={authLoading}>
                      {authLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Creating account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="text-center text-xs text-gray-500 dark:text-gray-400 pt-2">
                Demo: Use any email and password
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}