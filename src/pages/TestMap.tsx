import React from 'react';
import RealWorldMap from '@/components/RealWorldMap';

const TestMapPage = () => {
  return (
    <div className="h-screen w-screen">
      <h1 className="text-2xl font-bold p-4 bg-gray-100">Map Test Page</h1>
      <div className="h-[calc(100vh-80px)]">
        <RealWorldMap />
      </div>
    </div>
  );
};

export default TestMapPage;
