
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLocalization } from '@/contexts/LocalizationContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Event {
  id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  place_id: string;
  current_attendees: number;
  max_attendees: number;
  organizer_id: string;
  is_active: boolean;
  place?: {
    name: string;
    latitude: number;
    longitude: number;
  };
}

const ModernEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { t, isRTL } = useLocalization();

  useEffect(() => {
    fetchEvents();
    
    const eventsSubscription = supabase
      .channel('events-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'events' }, 
        () => {
          fetchEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(eventsSubscription);
    };
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          places:place_id (
            name,
            latitude,
            longitude
          )
        `)
        .eq('is_active', true)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;

      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const handleRSVP = async (eventId: string) => {
    if (!user) {
      toast.error('Please sign in to RSVP');
      return;
    }

    try {
      const { error } = await supabase
        .from('event_attendees')
        .insert({
          event_id: eventId,
          user_id: user.id,
        });

      if (error) throw error;

      toast.success('RSVP confirmed!');
      fetchEvents(); // Refresh to update attendee count
    } catch (error) {
      console.error('Error RSVPing:', error);
      toast.error('Failed to RSVP');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className={`min-h-screen bg-gray-50 p-4 pb-20 flex items-center justify-center ${isRTL ? 'rtl' : 'ltr'}`}>
        <div className="text-gray-600 text-lg">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gray-50 p-4 pb-20 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('events.title')}</h1>
          <p className="text-gray-600">{t('events.happening')}</p>
        </div>

        {/* Events List */}
        <div className="space-y-6">
          {events.length === 0 ? (
            <Card className="bg-white border-0 shadow-lg rounded-2xl">
              <CardContent className="p-8 text-center">
                <Calendar className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('events.noEvents')}</h3>
                <p className="text-gray-600">Check back later for exciting events!</p>
              </CardContent>
            </Card>
          ) : (
            events.map((event) => (
              <Card key={event.id} className="bg-white border-0 shadow-lg rounded-2xl hover:shadow-xl transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl font-bold text-gray-900 mb-2">
                        {event.title}
                      </CardTitle>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{formatDate(event.start_time)}</span>
                        </div>
                        {event.place && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-4 h-4" />
                            <span>{event.place.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      <Users className="w-3 h-3 mr-1" />
                      {event.current_attendees} {t('events.attendees')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {event.description && (
                    <p className="text-gray-700">{event.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {event.max_attendees && (
                        <span>
                          {event.current_attendees} / {event.max_attendees} {t('events.attendees')}
                        </span>
                      )}
                    </div>
                    <Button
                      onClick={() => handleRSVP(event.id)}
                      disabled={!user || (event.max_attendees && event.current_attendees >= event.max_attendees)}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-6"
                    >
                      {t('events.rsvp')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ModernEvents;
