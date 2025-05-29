
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
      <div className="bg-white/90 backdrop-blur-md rounded-2xl p-2 shadow-lg border border-gray-200">
        <div className="flex space-x-1 overflow-x-auto scrollbar-hide">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "ghost"}
              size="sm"
              onClick={() => onCategoryChange(category.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl whitespace-nowrap transition-all duration-200 ${
                selectedCategory === category.id
                  ? 'bg-primary text-white shadow-md scale-105'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-lg">{category.emoji}</span>
              <span className="font-medium">{category.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CategoryFilter;
