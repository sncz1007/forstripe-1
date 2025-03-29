import React from 'react';

interface ForumLoaderProps {
  fullScreen?: boolean;
}

const ForumLoader: React.FC<ForumLoaderProps> = ({ fullScreen = true }) => {
  return (
    <div 
      className={`bg-white bg-opacity-90 flex flex-col items-center justify-center ${
        fullScreen ? 'fixed top-0 left-0 right-0 bottom-0 z-50' : 'w-full h-full'
      }`}
    >
      <div className="w-[110px] h-[110px] relative z-10">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          {/* Órbita exterior */}
          <circle 
            id="orbita-ext" 
            cx="50" 
            cy="50" 
            r="45" 
            fill="none" 
            stroke="#009ADE" 
            strokeWidth="2"
            strokeDasharray="30 15"
            className="animate-[spin_1.5s_linear_infinite]"
          />
          
          {/* Órbita interior */}
          <circle 
            id="orbita-int" 
            cx="50" 
            cy="50" 
            r="30" 
            fill="none" 
            stroke="#009ADE" 
            strokeWidth="2"
            strokeDasharray="20 10"
            className="animate-[spin_1.5s_linear_reverse_infinite]"
          />
          
          {/* Punto central */}
          <circle 
            cx="50" 
            cy="50" 
            r="5" 
            fill="#009ADE" 
          />
        </svg>
      </div>
    </div>
  );
};

export default ForumLoader;