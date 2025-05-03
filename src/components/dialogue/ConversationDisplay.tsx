// src/components/dialogue/ConversationDisplay.tsx
'use client';

import React from 'react';

interface Message {
  role: 'nurse' | 'patient' | 'system';
  content: string;
  elapsedSeconds?: number;
  timestamp?: Date;
  tag?: string;
  audioUrl?: string;
  code?: string;
  answerType?: string;
}

interface ConversationDisplayProps {
  conversation: Message[];
  audioRef: React.RefObject<HTMLAudioElement | null>;
  showPlayButton: boolean;
}

export function ConversationDisplay({ conversation, audioRef, showPlayButton }: ConversationDisplayProps) {
  return (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      {conversation.map((msg, index) => (
        <div 
          key={index} 
          className={`flex ${msg.role === 'nurse' ? 'justify-end' : 'justify-start'}`}
        >
          <div 
            className={`max-w-[80%] rounded-lg p-3 ${
              msg.role === 'nurse'
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100' 
                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
            }`}
          >
            <p>{msg.content}</p>
            {msg.audioUrl && (
              <div className="mt-2">
                {showPlayButton ? (
                  <button 
                    onClick={() => audioRef.current?.play()} 
                    className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm"
                  >
                    播放語音
                  </button>
                ) : (
                  <audio 
                    ref={(el) => {
                      if (el && index === conversation.length - 1 && audioRef) audioRef.current = el;
                    }}
                    src={msg.audioUrl}
                    className="w-full"
                    controls={false}
                  />
                )}
              </div>
            )}
            {msg.elapsedSeconds !== undefined && msg.role !== 'system' && (
              <div className="text-xs mt-1 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded inline-block ml-auto text-gray-700 dark:text-gray-300 text-right">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {Math.floor(msg.elapsedSeconds / 60).toString().padStart(2, '0')}:
                {(msg.elapsedSeconds % 60).toString().padStart(2, '0')}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
