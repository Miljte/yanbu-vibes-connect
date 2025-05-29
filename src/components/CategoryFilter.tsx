
import React from 'react';
import { Button } from '@/components/ui/button';
import { useLocalization } from '@/contexts/LocalizationContext';

interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const CategoryFilter = ({ selectedCategory, onCategoryChange }: CategoryFilterProps) => {
  const { t, isRTL } = useLocalization();

  const categories = [
    { id: 'all', label: t('categories.all'), emoji: '🏪' },
    { id: 'cafe', label: t('categories.cafes'), emoji: '☕' },
    { id: 'restaurant', label: t('categories.restaurants'), emoji: '🍽️' },
    { id: 'shop', label: t('categories.shops'), emoji: '🛍️' },
    { id: 'event', label: t('categories.events'), emoji: '🎉' },
  ];

  return (
    <div className={`absolute top-4 left-4 right-4 z-10 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className="bg-background/95 backdrop-blur-md rounded-2xl p-3 shadow-lg border border-border">
        <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "ghost"}
              size="sm"
              onClick={() => onCategoryChange(category.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all duration-200 min-w-fit ${
                selectedCategory === category.id
                  ? 'bg-primary text-primary-foreground shadow-md scale-105 font-semibold'
                  : 'text-foreground hover:bg-muted/50 hover:scale-102'
              }`}
            >
              <span className="text-lg">{category.emoji}</span>
              <span className="font-medium text-sm">{category.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryFilter;
