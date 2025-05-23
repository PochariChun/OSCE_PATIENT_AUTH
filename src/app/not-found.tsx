'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';

export default function NotFound() {
  const { theme } = useTheme();
  
  return (
    <section className="flex items-center min-h-screen p-4 sm:p-16 bg-white dark:bg-gray-900">
      <div className="container flex flex-col items-center justify-center px-5 mx-auto my-8 space-y-8 text-center sm:max-w-md">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 512 512" 
          className="w-40 h-40 text-blue-600 dark:text-blue-400"
        >
          <path 
            fill="currentColor" 
            d="M256,16C123.452,16,16,123.452,16,256S123.452,496,256,496,496,388.548,496,256,388.548,16,256,16ZM403.078,403.078a207.253,207.253,0,1,1,44.589-66.125A207.332,207.332,0,0,1,403.078,403.078Z"
          ></path>
          <rect 
            width="176" 
            height="32" 
            x="168" 
            y="320" 
            fill="currentColor"
          ></rect>
          <polygon 
            fill="currentColor" 
            points="210.63 228.042 186.588 206.671 207.958 182.63 184.042 161.37 162.671 185.412 138.63 164.042 117.37 187.958 141.412 209.329 120.042 233.37 143.958 254.63 165.329 230.588 189.37 251.958 210.63 228.042"
          ></polygon>
          <polygon 
            fill="currentColor" 
            points="383.958 182.63 360.042 161.37 338.671 185.412 314.63 164.042 293.37 187.958 317.412 209.329 296.042 233.37 319.958 254.63 341.329 230.588 365.37 251.958 386.63 228.042 362.588 206.671 383.958 182.63"
          ></polygon>
        </svg>
        
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white">Oops!</h1>
        
        <p className="text-2xl text-gray-700 dark:text-gray-300">
          您要查找的頁面不存在或已被移動
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="px-8 py-3 font-semibold rounded-md border border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-gray-800"
          >
            返回上一頁
          </button>
          
          <Link 
            href="/"
            className="px-8 py-3 font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
          >
            返回首頁
          </Link>
        </div>
      </div>
    </section>
  );
} 