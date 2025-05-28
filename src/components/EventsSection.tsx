
import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Users, Heart, Share2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  date: Date;
  time: string;
  type: 'music' | 'sports' | 'cultural' | 'food' | 'tech';
  attendees: number;
  maxAttendees?: number;
  price: number;
  organizer: string;
  image: string;
  isAttending: boolean;
}

const EventsSection = () => {
  const [events, setEvents] = useState<Event[]>([
    {
      id: '1',
      title: 'Yanbu Food Festival',
      description: 'Taste the best local and international cuisines at Yanbu\'s biggest food festival',
      location: 'Yanbu Corniche',
      date: new Date('2024-06-15'),
      time: '6:00 PM - 11:00 PM',
      type: 'food',
      attendees: 245,
      maxAttendees: 500,
      price: 0,
      organizer: 'Yanbu Municipality',
      image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400',
      isAttending: false
    },
    {
      id: '2',
      title: 'Beach Volleyball Tournament',
      description: 'Join the annual beach volleyball championship with prizes for winners',
      location: 'Al Fanateer Beach',
      date: new Date('2024-06-18'),
      time: '9:00 AM - 5:00 PM',
      type: 'sports',
      attendees: 64,
      maxAttendees: 128,
      price: 50,
      organizer: 'Yanbu Sports Club',
      image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400',
      isAttending: true
    },
    {
      id: '3',
      title: 'Tech Meetup: AI in Business',
      description: 'Networking event for tech professionals and entrepreneurs',
      location: 'Radisson Blu Hotel',
      date: new Date('2024-06-20'),
      time: '7:00 PM - 10:00 PM',
      type: 'tech',
      attendees: 42,
      maxAttendees: 80,
      price: 25,
      organizer: 'Yanbu Tech Community',
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400',
      isAttending: false
    },
    {
      id: '4',
      title: 'Traditional Music Night',
      description: 'Experience authentic Saudi traditional music and dance performances',
      location: 'Cultural Center',
      date: new Date('2024-06-22'),
      time: '8:00 PM - 11:00 PM',
      type: 'cultural',
      attendees: 156,
      maxAttendees: 200,
      price: 30,
      organizer: 'Yanbu Cultural Society',
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400',
      isAttending: false
    }
  ]);

  const [activeTab, setActiveTab] = useState('all');

  const toggleAttendance = (eventId: string) => {
    setEvents(events.map(event => 
      event.id === eventId 
        ? { ...event, isAttending: !event.isAttending, attendees: event.isAttending ? event.attendees - 1 : event.attendees + 1 }
        : event
    ));
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'music': return 'bg-purple-600';
      case 'sports': return 'bg-green-600';
      case 'cultural': return 'bg-orange-600';
      case 'food': return 'bg-red-600';
      case 'tech': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  const getEventTypeEmoji = (type: string) => {
    switch (type) {
      case 'music': return '🎵';
      case 'sports': return '⚽';
      case 'cultural': return '🎭';
      case 'food': return '🍽️';
      case 'tech': return '💻';
      default: return '📅';
    }
  };

  const filterEvents = (filter: string) => {
    if (filter === 'all') return events;
    if (filter === 'attending') return events.filter(event => event.isAttending);
    return events.filter(event => event.type === filter);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div id="events" className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">What's Happening?</h2>
          <p className="text-slate-300">Discover and join exciting events in Yanbu</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="all" className="data-[state=active]:bg-cyan-600">All Events</TabsTrigger>
            <TabsTrigger value="attending" className="data-[state=active]:bg-cyan-600">Attending</TabsTrigger>
            <TabsTrigger value="food" className="data-[state=active]:bg-cyan-600">Food</TabsTrigger>
            <TabsTrigger value="sports" className="data-[state=active]:bg-cyan-600">Sports</TabsTrigger>
            <TabsTrigger value="cultural" className="data-[state=active]:bg-cyan-600">Cultural</TabsTrigger>
            <TabsTrigger value="tech" className="data-[state=active]:bg-cyan-600">Tech</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filterEvents(activeTab).map((event) => (
                <Card key={event.id} className="bg-slate-800/50 border-slate-700 backdrop-blur-sm overflow-hidden hover:border-cyan-500/50 transition-all">
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={event.image} 
                      alt={event.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3">
                      <Badge className={`${getEventTypeColor(event.type)} text-white`}>
                        {getEventTypeEmoji(event.type)} {event.type}
                      </Badge>
                    </div>
                    <div className="absolute top-3 right-3">
                      {event.price === 0 ? (
                        <Badge variant="secondary" className="bg-green-600 text-white">Free</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-slate-900 text-white">{event.price} SAR</Badge>
                      )}
                    </div>
                  </div>

                  <CardHeader>
                    <CardTitle className="text-white text-lg">{event.title}</CardTitle>
                    <p className="text-slate-300 text-sm">{event.description}</p>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-slate-300 text-sm">
                        <Calendar className="w-4 h-4 text-cyan-500" />
                        <span>{formatDate(event.date)}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-slate-300 text-sm">
                        <Clock className="w-4 h-4 text-cyan-500" />
                        <span>{event.time}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-slate-300 text-sm">
                        <MapPin className="w-4 h-4 text-cyan-500" />
                        <span>{event.location}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-slate-300 text-sm">
                        <Users className="w-4 h-4 text-cyan-500" />
                        <span>
                          {event.attendees} attending
                          {event.maxAttendees && ` • ${event.maxAttendees - event.attendees} spots left`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-slate-300 hover:text-white p-2"
                        >
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <Button
                        onClick={() => toggleAttendance(event.id)}
                        className={`${
                          event.isAttending 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : 'bg-cyan-600 hover:bg-cyan-700'
                        } text-white`}
                      >
                        <Heart className={`w-4 h-4 mr-2 ${event.isAttending ? 'fill-current' : ''}`} />
                        {event.isAttending ? 'Attending' : 'Join Event'}
                      </Button>
                    </div>

                    <div className="text-xs text-slate-500">
                      Organized by {event.organizer}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Create Event Button */}
        <div className="text-center mt-8">
          <Button className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3">
            Create New Event
          </Button>
          <p className="text-slate-400 text-sm mt-2">
            Share your events with the Yanbu community
          </p>
        </div>
      </div>
    </div>
  );
};

export default EventsSection;
