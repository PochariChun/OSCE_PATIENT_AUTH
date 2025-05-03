
// src/components/dialogue/MessageInput.tsx
'use client';

interface MessageInputProps {
  message: string;
  setMessage: (message: string) => void;
  handleSendMessage: () => void;
  isRecordButtonPressed: boolean;
  isListening: boolean;
  handleRecordButtonMouseDown: (e: React.MouseEvent) => void;
  handleRecordButtonMouseUp: (e: React.MouseEvent) => void;
  handleRecordButtonTouchStart: (e: React.TouchEvent) => void;
  handleRecordButtonTouchEnd: (e: React.TouchEvent) => void;
}

export function MessageInput({
  message,
  setMessage,
  handleSendMessage,
  isRecordButtonPressed,
  isListening,
  handleRecordButtonMouseDown,
  handleRecordButtonMouseUp,
  handleRecordButtonTouchStart,
  handleRecordButtonTouchEnd
}: MessageInputProps) {
  return (
    <div className="flex items-center space-x-2 mb-4">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        placeholder="按住麥克風或圖片說話..."
        className="flex-grow px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
      />
      
      {/* 錄音按鈕 */}
      <button
        onMouseDown={handleRecordButtonMouseDown}
        onMouseUp={handleRecordButtonMouseUp}
        onMouseLeave={isRecordButtonPressed ? handleRecordButtonMouseUp : undefined}
        onTouchStart={handleRecordButtonTouchStart}
        onTouchEnd={handleRecordButtonTouchEnd}
        className={`p-3 rounded-full transition-all duration-200 ${
          isRecordButtonPressed 
            ? 'bg-red-600 scale-110' 
            : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
        }`}
        aria-label="按住說話"
      >
        <div className="relative">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="currentColor" 
            className={`w-6 h-6 ${isRecordButtonPressed ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}
          >
            <path d="M12 16c2.206 0 4-1.794 4-4V6c0-2.217-1.785-4.021-3.979-4.021a.933.933 0 0 0-.209.025A4.006 4.006 0 0 0 8 6v6c0 2.206 1.794 4 4 4z" />
            <path d="M11 19.931V22h2v-2.069c3.939-.495 7-3.858 7-7.931h-2c0 3.309-2.691 6-6 6s-6-2.691-6-6H4c0 4.072 3.061 7.436 7 7.931z" />
          </svg>
          
          {isRecordButtonPressed && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          )}
        </div>
      </button>
    </div>
  );
} 