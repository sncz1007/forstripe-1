import React from 'react';

interface CircleLoaderProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  fullScreen?: boolean;
}

/**
 * Componente de carga circular basado en las imágenes de referencia.
 * Este componente muestra un círculo de carga simple animado con CSS.
 */
const CircleLoader: React.FC<CircleLoaderProps> = ({
  size = 60,
  color = '#009ADE',
  strokeWidth = 2,
  fullScreen = true
}) => {
  return (
    <div className={`
      flex items-center justify-center
      ${fullScreen ? 'fixed inset-0 bg-white z-50' : ''}
    `}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg 
          viewBox="0 0 100 100"
          width={size} 
          height={size}
          className="animate-spin"
          style={{ animationDuration: '1s' }}
        >
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray="180 270" // Esto crea el hueco en el círculo
            transform="rotate(-90 50 50)" // Rotamos para que el hueco quede en la posición adecuada
          />
        </svg>
      </div>
    </div>
  );
};

export default CircleLoader;