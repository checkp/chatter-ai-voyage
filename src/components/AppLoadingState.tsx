
import React from 'react';

const AppLoadingState = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
      <p>Loading...</p>
    </div>
  );
};

export default AppLoadingState;
