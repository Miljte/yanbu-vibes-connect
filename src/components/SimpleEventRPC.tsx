
import { supabase } from '@/integrations/supabase/client';

// Simple RPC functions to handle event responses until types are updated
export const addEventResponse = async (eventId: string, userId: string, responseType: 'interested' | 'rsvp') => {
  try {
    // Use raw SQL insert to avoid type issues
    const { error } = await supabase
      .rpc('execute_sql', {
        sql: `
          INSERT INTO public.event_responses (event_id, user_id, response_type)
          VALUES ($1, $2, $3)
          ON CONFLICT (event_id, user_id, response_type) DO NOTHING
        `,
        params: [eventId, userId, responseType]
      });
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error adding event response:', error);
    throw error;
  }
};

export const removeEventResponse = async (eventId: string, userId: string, responseType: 'interested' | 'rsvp') => {
  try {
    const { error } = await supabase
      .rpc('execute_sql', {
        sql: `
          DELETE FROM public.event_responses 
          WHERE event_id = $1 AND user_id = $2 AND response_type = $3
        `,
        params: [eventId, userId, responseType]
      });
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error removing event response:', error);
    throw error;
  }
};

export const getUserEventResponses = async (userId: string, responseType: 'interested' | 'rsvp') => {
  try {
    const { data, error } = await supabase
      .rpc('execute_sql', {
        sql: `
          SELECT event_id FROM public.event_responses 
          WHERE user_id = $1 AND response_type = $2
        `,
        params: [userId, responseType]
      });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting user event responses:', error);
    return [];
  }
};
