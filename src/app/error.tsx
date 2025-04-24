'use client';

import React from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="flex items-center min-h-screen p-4 sm:p-16 bg-white dark:bg-gray-900">
      <div className="container flex flex-col items-center justify-center px-5 mx-auto my-8 space-y-8 text-center sm:max-w-md">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 512 512" 
          className="w-40 h-40 text-red-600 dark:text-red-400"
        >
          <path 
            fill="currentColor" 
            d="M256,16C123.452,16,16,123.452,16,256S123.452,496,256,496,496,388.548,496,256,388.548,16,256,16ZM403.078,403.078a207.253,207.253,0,1,1,44.589-66.125A207.332,207.332,0,0,1,403.078,403.078Z"
          ></path>
          <rect 
            width="32" 
            height="176" 
            x="240" 
            y="176" 
            fill="currentColor"
          ></rect>
          <rect 
            width="32" 
            height="32" 
            x="240" 
            y="384" 
            fill="currentColor"
          ></rect>
        </svg>
        
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white">出錯了！</h1>
        
        <p className="text-2xl text-gray-700 dark:text-gray-300">
          很抱歉，我們在處理您的請求時遇到了問題
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={() => reset()}
            className="px-8 py-3 font-semibold rounded-md border border-red-600 text-red-600 hover:bg-red-50 dark:border-red-400 dark:text-red-400 dark:hover:bg-gray-800"
          >
            重試
          </button>
          
          <Link 
            href="/"
            className="px-8 py-3 font-semibold rounded-md bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
          >
            返回首頁
          </Link>
        </div>
      </div>
    </section>
  );
} 