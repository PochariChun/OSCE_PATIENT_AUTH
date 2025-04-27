import { useState } from 'react';
import { ScenarioInfo } from '@/types';

interface DialogueInterfaceProps {
  scenario: ScenarioInfo;
  onEndDialogue: () => void;
}

export default function DialogueInterface({ scenario, onEndDialogue }: DialogueInterfaceProps) {
  const [conversation, setConversation] = useState<{ role: 'user' | 'assistant' | 'system'; content: string }[]>([
    { 
      role: 'system', 
      content: `您已進入「${scenario.title}」的模擬對話。請開始與虛擬病人對話。` 
    }
  ]);
  const [message, setMessage] = useState('');
  
  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    // 添加用戶消息到對話
    const updatedConversation = [
      ...conversation,
      { role: 'user', content: message }
    ];
    setConversation(updatedConversation);
    setMessage('');
    
    // 模擬虛擬病人回應（這裡您可能會調用 API）
    setTimeout(() => {
      setConversation([
        ...updatedConversation,
        { 
          role: 'assistant', 
          content: `這是虛擬病人的回應。在實際系統中，這會由 AI 生成。` 
        }
      ]);
    }, 1000);
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* 场景信息头部 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {scenario.title}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {scenario.description}
        </p>
      </div>
      
      {/* 对话区域 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md mb-4">
        <div className="h-96 overflow-y-auto p-4 border-b border-gray-200 dark:border-gray-700">
          {conversation.map((msg, index) => (
            <div 
              key={index} 
              className={`mb-4 ${
                msg.role === 'user' 
                  ? 'text-right' 
                  : msg.role === 'system' 
                    ? 'text-center' 
                    : ''
              }`}
            >
              {msg.role === 'system' ? (
                <div className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 p-2 rounded-md inline-block mx-auto my-2">
                  <span className="text-sm">{msg.content}</span>
                </div>
              ) : (
                <div 
                  className={`inline-block p-3 rounded-lg ${
                    msg.role === 'user' 
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  }`}
                >
                  {msg.content}
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="p-4 flex">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="輸入您的對話..."
            className="flex-grow px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <button
            onClick={handleSendMessage}
            className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            發送
          </button>
        </div>
      </div>
      
      {/* 结束对话按钮 */}
      <div className="flex justify-end">
        <button
          onClick={onEndDialogue}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          結束對話
        </button>
      </div>
    </div>
  );
} 