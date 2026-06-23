'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Toaster } from 'react-hot-toast';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-primary text-text-primary">
      <Toaster position="top-center" />
      {/* Decorative left panel */}
      <div className="hidden md:flex md:w-1/2 bg-accent flex-col justify-center items-center p-12 text-white relative select-none">
        <div className="absolute inset-0 bg-gradient-to-br from-accent to-accent-pressed opacity-95" />
        
        {/* Spark logo with subtle vertical floating animation */}
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="relative z-10 flex flex-col items-center"
        >
          <div className="w-24 h-24 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/20 shadow-lg mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-12 h-12 text-white"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 18a3.75 3.75 0 0 0 .495-7.467 5.99 5.99 0 0 0-1.925 3.546 5.974 5.974 0 0 1-2.133-1A3.75 3.75 0 0 0 12 18Z"
              />
            </svg>
          </div>
          
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            SparkChat
          </h1>
          <p className="text-white/80 font-medium text-sm text-center">
            Where conversations ignite.
          </p>
        </motion.div>
      </div>

      {/* Auth page form container */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-12 overflow-y-auto bg-bg-sidebar">
        {children}
      </div>
    </div>
  );
}
