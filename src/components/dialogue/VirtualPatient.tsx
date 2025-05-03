// src/components/dialogue/VirtualPatient.tsx
'use client';

import { useRef } from 'react';
import Image from 'next/image';

interface VirtualPatientProps {
  isListening: boolean;
  isRecordButtonPressed: boolean;
  overlayText: string | null;
  interimTranscript: string;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: ((e: React.MouseEvent) => void) | undefined;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

export function VirtualPatient({
  isListening,
  isRecordButtonPressed,
  overlayText,
  interimTranscript,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
  onTouchStart,
  onTouchEnd
}: VirtualPatientProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 flex justify-center">
      <div 
        className="relative w-full max-w-md cursor-pointer select-none" 
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onContextMenu={(e) => e.preventDefault()} // 防止右键菜单
      > 
        {/* 語音識別狀態 */}
        {isListening && (
          <div className="mb-4 text-center">
            <span className="inline-flex items-center text-sm text-red-500">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></span>
              正在錄音...
            </span>
            {interimTranscript && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 italic">
                {interimTranscript}...
              </p>
            )}
          </div>
        )}
        {overlayText && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="bg-gray-800 bg-opacity-70 text-white p-4 rounded-lg max-w-[90%] text-center">
              {overlayText}
            </div>
          </div>
        )}
        <Image
          src="/image/virtualpatient.png"
          alt="虛擬病人"
          width={400}
          height={400}
          className="rounded-lg mx-auto pointer-events-none" // 禁用图片的指针事件
          priority
          draggable="false" // 禁止拖拽
          style={{ WebkitTouchCallout: 'none' }} // 禁止iOS长按呼出菜单
        />
        {isListening && (
          <div className="absolute top-14 left-0 right-0 mx-auto w-fit text-center bg-red-500 text-white px-3 py-1 rounded-b-lg text-sm animate-pulse">
          正在聆聽...
        </div>
        
        )}
        {/* 添加提示信息 */}
        <div className="absolute bottom-2 left-0 right-0 text-center text-white bg-black bg-opacity-50 py-1 rounded-b-lg pointer-events-none">
          點擊頭像開始錄音
        </div>
      </div>
    </div>
  );
} 