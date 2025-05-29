
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { toast } from 'sonner';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { user, signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  // Login form handlers
  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    
    console.log('Attempting login with email:', email);
    
    try {
      const result = await signIn(email, password);
      console.log('Login result:', result);
      
      if (result.error) {
        setError(result.error.message);
      } else if (result.data?.user) {
        console.log('Login successful, closing modal');
        toast.success('Welcome back!');
        onClose();
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Signup form handlers
  const handleSignupSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const nickname = formData.get('nickname') as string;
    
    console.log('Attempting signup with email:', email, 'nickname:', nickname);
    
    try {
      const result = await signUp(email, password, nickname);
      console.log('Signup result:', result);
      
      if (result.error) {
        setError(result.error.message);
      } else if (result.data?.user) {
        console.log('Signup successful, closing modal');
        toast.success('Account created successfully!');
        onClose();
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: window.location.origin
      });

      if (error) throw error;

      toast.success('Password reset email sent! Check your inbox.');
      setShowPasswordReset(false);
      setResetEmail('');
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>POP IN</CardTitle>
          <CardDescription>Sign in or create an account to continue</CardDescription>
        </CardHeader>
        <CardContent>
          {showPasswordReset ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email Address</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                />
              </div>
              <div className="flex space-x-2">
                <Button 
                  onClick={handlePasswordReset}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'Sending...' : 'Send Reset Email'}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowPasswordReset(false)}
                  className="flex-1"
                >
                  Back
                </Button>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLoginSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" placeholder="your@email.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" name="password" type="password" required />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Logging in...' : 'Login'}
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setShowPasswordReset(true)}
                    className="w-full text-sm"
                  >
                    Forgot Password?
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignupSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="nickname">Nickname</Label>
                    <Input id="nickname" name="nickname" placeholder="How others will see you" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input id="signup-email" name="email" type="email" placeholder="your@email.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input id="signup-password" name="password" type="password" minLength={6} required />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating account...' : 'Sign Up'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
        {error && (
          <CardFooter className="flex justify-center">
            <p className="text-sm text-red-500">{error}</p>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default AuthModal;
