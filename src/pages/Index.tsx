
import Header from "@/components/Header";
import InteractiveMap from "@/components/InteractiveMap";
import LocationChat from "@/components/LocationChat";
import EventsSection from "@/components/EventsSection";
import UserProfile from "@/components/UserProfile";
import AdminDashboard from "@/components/AdminDashboard";
import MerchantDashboard from "@/components/MerchantDashboard";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";

const Index = () => {
  const { user, loading } = useAuth();
  const { hasPermission } = useRoles();

  console.log('Index page - user:', user?.id, 'loading:', loading);
  console.log('Index page - hasPermission admin_dashboard:', hasPermission('admin_dashboard'));
  console.log('Index page - hasPermission merchant_dashboard:', hasPermission('merchant_dashboard'));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading POP IN...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      
      {/* Map Section */}
      <InteractiveMap />
      
      {/* Chat Section */}
      <LocationChat />
      
      {/* Events Section */}
      <EventsSection />
      
      {/* Profile Section */}
      {user && <UserProfile />}
      
      {/* Merchant Dashboard */}
      {hasPermission('merchant_dashboard') && (
        <div id="merchant">
          <MerchantDashboard />
        </div>
      )}
      
      {/* Admin Dashboard */}
      {hasPermission('admin_dashboard') && (
        <div id="admin">
          <AdminDashboard />
        </div>
      )}
    </div>
  );
};

export default Index;
