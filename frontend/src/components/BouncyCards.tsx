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
            <span style={{ fontSize: '32px', display: 'block', marginBottom: '8px' }}>🌙</span>
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

