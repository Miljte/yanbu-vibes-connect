
import React, { useState } from 'react';
import { Upload, X, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MediaUploadProps {
  onUpload: (urls: string[]) => void;
  maxFiles?: number;
  existingUrls?: string[];
  bucketName?: string;
  folder?: string;
}

const MediaUpload: React.FC<MediaUploadProps> = ({
  onUpload,
  maxFiles = 5,
  existingUrls = [],
  bucketName = 'media',
  folder = 'uploads'
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>(existingUrls);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (uploadedUrls.length + files.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setUploading(true);
    const newUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${folder}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);

        newUrls.push(publicUrl);
      }

      const allUrls = [...uploadedUrls, ...newUrls];
      setUploadedUrls(allUrls);
      onUpload(allUrls);
      toast.success('Images uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (urlToRemove: string) => {
    const updatedUrls = uploadedUrls.filter(url => url !== urlToRemove);
    setUploadedUrls(updatedUrls);
    onUpload(updatedUrls);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {uploadedUrls.map((url, index) => (
          <Card key={index} className="relative">
            <CardContent className="p-2">
              <img
                src={url}
                alt={`Upload ${index + 1}`}
                className="w-full h-24 object-cover rounded"
              />
              <Button
                size="sm"
                variant="destructive"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                onClick={() => removeImage(url)}
              >
                <X className="w-3 h-3" />
              </Button>
            </CardContent>
          </Card>
        ))}
        
        {uploadedUrls.length < maxFiles && (
          <Card className="border-dashed border-2 border-muted-foreground/25">
            <CardContent className="p-2 h-24 flex items-center justify-center">
              <label className="cursor-pointer flex flex-col items-center space-y-2">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
                {uploading ? (
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Upload</span>
                  </>
                )}
              </label>
            </CardContent>
          </Card>
        )}
      </div>
      
      <p className="text-sm text-muted-foreground">
        {uploadedUrls.length}/{maxFiles} images uploaded
      </p>
    </div>
  );
};

export default MediaUpload;
