
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ selectedCategory, onCategoryChange }) => {
  const categories = [
    { id: 'all', label: 'All', emoji: '🌟' },
    { id: 'cafe', label: 'Cafes', emoji: '☕' },
    { id: 'restaurant', label: 'Restaurants', emoji: '🍽️' },
    { id: 'shop', label: 'Shops', emoji: '🛍️' },
    { id: 'event', label: 'Events', emoji: '🎉' }
  ];

  return (
    <Card className="absolute top-4 left-4 right-4 z-10 bg-background/95 backdrop-blur-md border-0 shadow-lg">
      <div className="p-3">
        <div className="flex space-x-2 overflow-x-auto">
          {categories.map(category => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => onCategoryChange(category.id)}
              className="flex-shrink-0 text-sm"
            >
              <span className="mr-1">{category.emoji}</span>
              {category.label}
            </Button>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default CategoryFilter;
