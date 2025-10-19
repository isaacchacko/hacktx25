'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import EncryptButton from './EncryptButton';

interface BouncyCardsProps {
  isLoggedIn: boolean;
}

const BounceCard = ({ 
  className, 
  children, 
  href 
}: { 
  className?: string; 
  children: React.ReactNode;
  href: string;
}) => {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <motion.div
        whileHover={{ scale: 0.95, rotate: "-1deg" }}
        className={`group relative min-h-[450px] cursor-pointer overflow-hidden rounded-2xl p-8 ${className}`}
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
        }}
      >
        {children}
      </motion.div>
    </Link>
  );
};

const CardTitle = ({ children }: { children: React.ReactNode }) => {
  return (
    <h3 className="mx-auto text-center text-3xl font-semibold text-white">
      {children}
    </h3>
  );
};

export default function BouncyCards({ isLoggedIn }: BouncyCardsProps) {
  return (
    <div className="mx-auto max-w-4xl">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Purple Card - Launch Presentation */}
        <BounceCard href={isLoggedIn ? "/upload" : "/login"}>
          <CardTitle>
            <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>🚀</span>
            {isLoggedIn ? 'Launch Presentation' : 'Get Started'}
          </CardTitle>
          
          {/* Upload Icon and Text - Positioned above the purple card */}
          <div 
            className="absolute left-0 right-0 flex flex-col items-center justify-center"
            style={{
              top: '290px',
              zIndex: 5
            }}
          >
            {/* Upload Icon */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{
                marginBottom: '12px'
              }}
            >
              <svg 
                width="48" 
                height="48" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                style={{
                  filter: 'drop-shadow(0 0 12px rgba(255, 255, 255, 0.8))'
                }}
              >
                {/* Folder */}
                <path 
                  d="M3 7C3 5.89543 3.89543 5 5 5H9L11 7H19C20.1046 7 21 7.89543 21 9V18C21 19.1046 20.1046 20 19 20H5C3.89543 20 3 19.1046 3 18V7Z" 
                  stroke="rgba(255, 255, 255, 0.9)" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  fill="rgba(255, 255, 255, 0.2)"
                />
                {/* Arrow pointing up into folder */}
                <path 
                  d="M12 16V10M12 10L9 13M12 10L15 13" 
                  stroke="rgba(255, 255, 255, 0.9)" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </motion.div>
            
            {/* Drag & Drop Text */}
            <p className="text-white/70 text-sm font-medium">
              Drag & Drop your PDF
            </p>
          </div>
          
          <div 
            className="absolute bottom-0 left-4 right-4 top-32 translate-y-8 rounded-t-2xl p-4 transition-transform duration-[250ms] group-hover:translate-y-4 group-hover:rotate-[2deg]"
            style={{
              background: 'linear-gradient(to bottom right, #a78bfa, #818cf8)'
            }}
          >
            <span className="block text-center font-semibold text-indigo-50">
              Upload your slides and start presenting
            </span>
          </div>
        </BounceCard>

        {/* Green Card - Join Session */}
        <BounceCard href="/start-presenting">
          <CardTitle>
            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Astronaut Body */}
                <circle cx="32" cy="24" r="8" fill="white" stroke="rgba(255,255,255,0.3)" strokeWidth="1"/>
                <ellipse cx="32" cy="35" rx="6" ry="8" fill="white"/>
                
                {/* Helmet Visor */}
                <ellipse cx="32" cy="24" rx="5" ry="4" fill="rgba(100, 200, 255, 0.4)"/>
                
                {/* Arms */}
                <line x1="26" y1="32" x2="20" y2="36" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <line x1="38" y1="32" x2="46" y2="36" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                
                {/* Legs */}
                <line x1="29" y1="42" x2="27" y2="50" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <line x1="35" y1="42" x2="37" y2="50" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                
                {/* Flag Pole */}
                <line x1="46" y1="36" x2="46" y2="16" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5"/>
                
                {/* Animated Waving Flag - Red and Longer */}
                <motion.path
                  d="M 46 16 Q 52 17 58 16 L 58 28 Q 52 29 46 28 Z"
                  fill="rgba(239, 68, 68, 0.8)"
                  stroke="rgba(220, 38, 38, 1)"
                  strokeWidth="0.5"
                  animate={{
                    d: [
                      "M 46 16 Q 52 17 58 16 L 58 28 Q 52 29 46 28 Z",
                      "M 46 16 Q 53 15 58 17 L 58 28 Q 53 27 46 28 Z",
                      "M 46 16 Q 52 18 58 16 L 58 28 Q 52 30 46 28 Z",
                      "M 46 16 Q 53 15 58 17 L 58 28 Q 53 27 46 28 Z",
                      "M 46 16 Q 52 17 58 16 L 58 28 Q 52 29 46 28 Z"
                    ]
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                
                {/* Stars around astronaut */}
                <motion.circle
                  cx="14" cy="20" r="1.5" fill="white"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0 }}
                />
                <motion.circle
                  cx="50" cy="44" r="1.5" fill="white"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.7 }}
                />
                <motion.circle
                  cx="18" cy="50" r="1.5" fill="white"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1.4 }}
                />
              </svg>
            </div>
            Join Session
          </CardTitle>
          <div 
            className="absolute bottom-0 left-4 right-4 top-32 translate-y-8 rounded-t-2xl transition-transform duration-[250ms] group-hover:translate-y-4 group-hover:rotate-[2deg] flex items-center justify-center"
            style={{
              background: 'linear-gradient(to bottom right, #4ade80, #34d399)'
            }}
          >
            <EncryptButton />
          </div>
        </BounceCard>
      </div>
    </div>
  );
}

