
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export const useDeleteMerchants = () => {
  const { user, userRole } = useAuth();

  const deleteMerchants = async () => {
    if (!user || userRole !== 'admin') {
      toast.error('Only admins can delete merchants');
      return;
    }

    try {
      console.log('🗑️ Starting merchant deletion process...');
      
      // First, delete all places associated with merchants
      const { error: placesError } = await supabase
        .from('places')
        .delete()
        .neq('merchant_id', null);

      if (placesError) {
        console.error('❌ Error deleting places:', placesError);
        throw placesError;
      }

      // Delete all merchant subscriptions
      const { error: subscriptionsError } = await supabase
        .from('merchant_subscriptions')
        .delete()
        .neq('merchant_id', null);

      if (subscriptionsError) {
        console.error('❌ Error deleting subscriptions:', subscriptionsError);
        throw subscriptionsError;
      }

      // Delete all offers
      const { error: offersError } = await supabase
        .from('offers')
        .delete()
        .neq('merchant_id', null);

      if (offersError) {
        console.error('❌ Error deleting offers:', offersError);
        throw offersError;
      }

      // Remove merchant roles
      const { error: rolesError } = await supabase
        .from('user_roles')
        .delete()
        .eq('role', 'merchant');

      if (rolesError) {
        console.error('❌ Error deleting merchant roles:', rolesError);
        throw rolesError;
      }

      console.log('✅ All merchants and related data deleted successfully');
      toast.success('All merchants have been deleted from the database');
      
    } catch (error) {
      console.error('❌ Error during merchant deletion:', error);
      toast.error('Failed to delete merchants');
    }
  };

  return { deleteMerchants };
};
