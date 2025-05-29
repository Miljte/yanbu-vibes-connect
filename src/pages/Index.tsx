
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
  const { user } = useAuth();
  const { hasPermission } = useRoles();

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
