'use client';

import React from 'react';

interface StarLogoProps {
  size?: number;
}

export const StarLogo: React.FC<StarLogoProps> = ({ size = 36 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        animation: 'starWobble 3s ease-in-out infinite',
        filter: 'drop-shadow(0 0 12px rgba(251, 191, 36, 0.6))'
      }}
    >
      <defs>
        <linearGradient id="starGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" /> {/* amber-400 */}
          <stop offset="50%" stopColor="#f59e0b" /> {/* amber-500 */}
          <stop offset="100%" stopColor="#d97706" /> {/* amber-600 */}
        </linearGradient>
      </defs>
      
      {/* Hand-drawn style star path with slightly imperfect edges */}
      <path
        d="M50 5 L58 38 C58.5 40.5 60.5 42 63 42 L96 42 C98 42 99 44 98 46 L72 64 C70 65.5 69 68 70 70 L82 95 C83 97 81 99 79 98 L53 78 C51 76.5 48 76.5 46 78 L20 98 C18 99 16 97 17 95 L29 70 C30 68 29 65.5 27 64 L1 46 C-1 44 0 42 2 42 L35 42 C37.5 42 39.5 40.5 40 38 L48 5 C48.5 3 51.5 3 50 5 Z"
        fill="url(#starGradient)"
        stroke="#fbbf24"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          strokeDasharray: '400',
          strokeDashoffset: '0',
        }}
      />
      
      <style jsx>{`
        @keyframes starWobble {
          0%, 100% {
            transform: rotate(0deg) scale(1);
          }
          25% {
            transform: rotate(-3deg) scale(1.02);
          }
          50% {
            transform: rotate(0deg) scale(1);
          }
          75% {
            transform: rotate(3deg) scale(0.98);
          }
        }
      `}</style>
    </svg>
  );
};

