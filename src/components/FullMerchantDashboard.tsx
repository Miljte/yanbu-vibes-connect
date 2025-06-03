
import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRoles } from '@/hooks/useRoles';
import OptimizedMerchantDashboard from './OptimizedMerchantDashboard';
import { Card, CardContent } from '@/components/ui/card';
import { Shield } from 'lucide-react';

const FullMerchantDashboard = () => {
  const { user, loading } = useAuth();
  const { isMerchant } = useRoles();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
          <div className="text-foreground text-lg">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="bg-card border max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <Shield className="w-16 h-16 mx-auto text-muted-foreground" />
            <h2 className="text-xl font-bold text-foreground">Authentication Required</h2>
            <p className="text-muted-foreground">Please sign in to access the merchant dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isMerchant) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="bg-card border max-w-md">
          <CardContent className="p-6 text-center space-y-4">
            <Shield className="w-16 h-16 mx-auto text-orange-500" />
            <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
            <p className="text-muted-foreground">You need merchant privileges to access this dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <OptimizedMerchantDashboard />;
};

export default FullMerchantDashboard;
