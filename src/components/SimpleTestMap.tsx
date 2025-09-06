import React from 'react';

const SimpleTestMap: React.FC = () => {
  return (
    <div className="h-full w-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center">
      <div className="text-white text-center">
        <h1 className="text-4xl font-bold mb-4">🗺️ Simple Test Map</h1>
        <p className="text-xl">This is a simple test to verify rendering works</p>
        <div className="mt-8 p-4 bg-white/20 rounded-lg backdrop-blur-sm">
          <p className="text-lg">✅ React component rendering</p>
          <p className="text-lg">✅ CSS styles loading</p>
          <p className="text-lg">✅ No JavaScript errors</p>
        </div>
      </div>
    </div>
  );
};

export default SimpleTestMap;
