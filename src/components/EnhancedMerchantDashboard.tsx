
import React, { useState, useEffect } from 'react';
import { Store, Image, Calendar, Gift, Users, BarChart3, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import MediaUpload from './MediaUpload';
import OfferManager from './OfferManager';
import MerchantEngagementPanel from './MerchantEngagementPanel';

interface Place {
  id: string;
  name: string;
  description: string;
  type: string;
  latitude: number;
  longitude: number;
  image_urls: string[];
  is_active: boolean;
  address: string;
}

const EnhancedMerchantDashboard = () => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'restaurant',
    address: '',
    latitude: 24.0892,
    longitude: 38.0618,
    image_urls: [] as string[]
  });
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchMerchantPlaces();
    }
  }, [user]);

  const fetchMerchantPlaces = async () => {
    try {
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('merchant_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const placesData = data || [];
      setPlaces(placesData);
      
      if (placesData.length > 0 && !selectedPlace) {
        setSelectedPlace(placesData[0]);
      }
    } catch (error) {
      console.error('Error fetching places:', error);
      toast.error('Failed to load your stores');
    }
  };

  const handleSavePlace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const placeData = {
        ...formData,
        merchant_id: user.id
      };

      if (selectedPlace && isEditing) {
        const { error } = await supabase
          .from('places')
          .update(placeData)
          .eq('id', selectedPlace.id);
        
        if (error) throw error;
        toast.success('Store updated successfully!');
      } else {
        const { error } = await supabase
          .from('places')
          .insert(placeData);
        
        if (error) throw error;
        toast.success('Store created successfully!');
      }

      setIsEditing(false);
      fetchMerchantPlaces();
    } catch (error) {
      console.error('Error saving place:', error);
      toast.error('Failed to save store');
    }
  };

  const startEditing = (place?: Place) => {
    if (place) {
      setSelectedPlace(place);
      setFormData({
        name: place.name,
        description: place.description || '',
        type: place.type,
        address: place.address || '',
        latitude: place.latitude,
        longitude: place.longitude,
        image_urls: place.image_urls || []
      });
    } else {
      setFormData({
        name: '',
        description: '',
        type: 'restaurant',
        address: '',
        latitude: 24.0892,
        longitude: 38.0618,
        image_urls: []
      });
    }
    setIsEditing(true);
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">🏪 Merchant Control Center</h1>
          <p className="text-muted-foreground">Manage your stores, offers, and customer engagement</p>
        </div>

        <Tabs defaultValue="stores" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="stores">
              <Store className="w-4 h-4 mr-2" />
              My Stores
            </TabsTrigger>
            <TabsTrigger value="engagement">
              <Users className="w-4 h-4 mr-2" />
              Customer Engagement
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stores">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Store List */}
              <Card className="bg-card border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center justify-between">
                    <span>Your Stores</span>
                    <Button size="sm" onClick={() => startEditing()}>
                      Add Store
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {places.map((place) => (
                    <div
                      key={place.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedPlace?.id === place.id
                          ? 'bg-primary/10 border border-primary/20'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                      onClick={() => setSelectedPlace(place)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-foreground">{place.name}</h4>
                          <p className="text-sm text-muted-foreground">{place.type}</p>
                        </div>
                        <Badge variant={place.is_active ? "default" : "secondary"}>
                          {place.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {places.length === 0 && (
                    <div className="text-center text-muted-foreground py-4">
                      <Store className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No stores created yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Store Details */}
              <div className="lg:col-span-2 space-y-6">
                {isEditing ? (
                  <Card className="bg-card border">
                    <CardHeader>
                      <CardTitle className="text-foreground">
                        {selectedPlace ? 'Edit Store' : 'Create New Store'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSavePlace} className="space-y-4">
                        <Input
                          placeholder="Store name"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          required
                        />
                        <Textarea
                          placeholder="Store description"
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                        <Input
                          placeholder="Address"
                          value={formData.address}
                          onChange={(e) => setFormData({...formData, address: e.target.value})}
                        />
                        <div className="grid grid-cols-2 gap-4">
                          <Input
                            type="number"
                            step="any"
                            placeholder="Latitude"
                            value={formData.latitude}
                            onChange={(e) => setFormData({...formData, latitude: parseFloat(e.target.value)})}
                            required
                          />
                          <Input
                            type="number"
                            step="any"
                            placeholder="Longitude"
                            value={formData.longitude}
                            onChange={(e) => setFormData({...formData, longitude: parseFloat(e.target.value)})}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Store Images</label>
                          <MediaUpload
                            onUpload={(urls) => setFormData({...formData, image_urls: urls})}
                            existingUrls={formData.image_urls}
                            maxFiles={5}
                            folder="stores"
                          />
                        </div>
                        <div className="flex space-x-2">
                          <Button type="submit">
                            {selectedPlace ? 'Update Store' : 'Create Store'}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  </Card>
                ) : selectedPlace ? (
                  <>
                    <Card className="bg-card border">
                      <CardHeader>
                        <CardTitle className="text-foreground flex items-center justify-between">
                          <span>{selectedPlace.name}</span>
                          <Button onClick={() => startEditing(selectedPlace)}>
                            Edit Store
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {selectedPlace.image_urls && selectedPlace.image_urls.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {selectedPlace.image_urls.map((url, index) => (
                              <img
                                key={index}
                                src={url}
                                alt={`${selectedPlace.name} ${index + 1}`}
                                className="w-full h-24 object-cover rounded"
                              />
                            ))}
                          </div>
                        )}
                        <p className="text-muted-foreground">{selectedPlace.description}</p>
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{selectedPlace.address}</span>
                        </div>
                      </CardContent>
                    </Card>

                    <OfferManager placeId={selectedPlace.id} />
                  </>
                ) : (
                  <Card className="bg-muted/20 border-dashed">
                    <CardContent className="py-12 text-center">
                      <Store className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No store selected</h3>
                      <p className="text-muted-foreground mb-4">Select a store or create a new one to get started</p>
                      <Button onClick={() => startEditing()}>Create Your First Store</Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="engagement">
            <MerchantEngagementPanel />
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-card border">
                <CardHeader>
                  <CardTitle className="text-foreground text-sm">Total Stores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{places.length}</div>
                </CardContent>
              </Card>
              <Card className="bg-card border">
                <CardHeader>
                  <CardTitle className="text-foreground text-sm">Active Stores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {places.filter(p => p.is_active).length}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border">
                <CardHeader>
                  <CardTitle className="text-foreground text-sm">Total Images</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {places.reduce((acc, place) => acc + (place.image_urls?.length || 0), 0)}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default EnhancedMerchantDashboard;
