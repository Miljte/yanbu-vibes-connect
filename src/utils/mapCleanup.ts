
import { supabase } from '@/integrations/supabase/client';

export const cleanupMapData = async () => {
  try {
    console.log('🧹 Starting map cleanup - removing test/hardcoded stores...');

    // Get all places that don't have a valid merchant_id or are not associated with merchant users
    const { data: invalidPlaces, error: fetchError } = await supabase
      .from('places')
      .select(`
        id,
        name,
        merchant_id,
        user_roles(role, user_id)
      `)
      .or('merchant_id.is.null,user_roles.role.neq.merchant');

    if (fetchError) {
      console.error('❌ Error fetching invalid places:', fetchError);
      return { success: false, error: fetchError.message };
    }

    const placesToDelete = invalidPlaces?.filter(place => 
      !place.merchant_id || 
      !place.user_roles || 
      place.user_roles.length === 0 ||
      (Array.isArray(place.user_roles) && !place.user_roles.some((role: any) => role.role === 'merchant'))
    ) || [];

    console.log(`🗑️ Found ${placesToDelete.length} invalid places to remove`);

    if (placesToDelete.length > 0) {
      const idsToDelete = placesToDelete.map(place => place.id);
      
      // Delete invalid places
      const { error: deleteError } = await supabase
        .from('places')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        console.error('❌ Error deleting invalid places:', deleteError);
        return { success: false, error: deleteError.message };
      }

      console.log(`✅ Successfully removed ${placesToDelete.length} invalid places`);
    }

    // Verify cleanup - count remaining valid places
    const { data: validPlaces, error: countError } = await supabase
      .from('places')
      .select('id, user_roles!inner(role)', { count: 'exact' })
      .eq('is_active', true)
      .eq('user_roles.role', 'merchant')
      .not('merchant_id', 'is', null);

    if (countError) {
      console.error('❌ Error counting valid places:', countError);
    } else {
      console.log(`✅ Map cleanup complete! ${validPlaces?.length || 0} verified merchant places remaining`);
    }

    return { 
      success: true, 
      removed: placesToDelete.length, 
      remaining: validPlaces?.length || 0 
    };

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    return { success: false, error: 'Cleanup operation failed' };
  }
};

export const verifyMerchantPlaces = async () => {
  try {
    // Get all places with merchant verification
    const { data: places, error } = await supabase
      .from('places')
      .select(`
        id,
        name,
        merchant_id,
        is_active,
        user_roles!inner(role, user_id)
      `)
      .eq('is_active', true)
      .eq('user_roles.role', 'merchant')
      .not('merchant_id', 'is', null);

    if (error) {
      console.error('❌ Error verifying merchant places:', error);
      return [];
    }

    console.log(`✅ Verified ${places?.length || 0} legitimate merchant places`);
    return places || [];

  } catch (error) {
    console.error('❌ Verification failed:', error);
    return [];
  }
};
