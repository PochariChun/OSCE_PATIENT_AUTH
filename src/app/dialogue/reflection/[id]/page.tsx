// src/app/dialogue/reflection/page.tsx
'use client';

import { useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { fetchJson } from '@/lib/fetchJson';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useReflectionConversation } from '@/hooks/useReflectionConversation';
// import { speakText } from '@/lib/speakText'; // 你需要封裝 EdgeTTS 播放函數

interface ReflectionMessage {
  role: 'nurse' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  gibbsStage?: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}


export default function ReflectionPage() {
  const user = useCurrentUser<User>();
  const [message, setMessage] = useState('');
  const [reflection, setReflection] = useState(null);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  const router = useRouter();
  const params = useParams();
  const conversationId = params.id as string;

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // const reflectionState = user?.id
  // ? useReflectionConversation(conversationId, user.id)
  // : null;

  const {
    loading,
    error,
    conversationTitle,
    reflectionCards,
    conversation,
    currentStage,
    setConversation,
    setCurrentStage
  } = useReflectionConversation(conversationId, user?.id);  // 無論有無 user.id 都呼叫
  

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!message.trim() || isPlayingVoice) return;
    // if (!message.trim()) return;

    const userMessage: ReflectionMessage = {
      role: 'nurse',
      content: message.trim(),
      timestamp: new Date(),
      gibbsStage: currentStage
    };

    setConversation(prev => [...prev, userMessage]);
    setMessage('');

    try {
      const data = await fetchJson<{
        response: string;
        gibbsStage: string;
        missedItems?: {
          id: number;
          category: string;
          subcategory: string;
        }[];
      }>(`/api/conversations/${conversationId}/reflection`, {
      
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          message: userMessage.content,
          currentStage
        })
      });

      const aiMessage = {
        role: 'assistant' as const,
        content: data.response,
        timestamp: new Date(),
        gibbsStage: data.gibbsStage
      };

      // ================================
      //
      setConversation(prev => [...prev, aiMessage]);
      if (data.gibbsStage) setCurrentStage(data.gibbsStage);
      // ================================


    } catch (error: any) {
      console.error('發送反思訊息錯誤:', error.message);
      setConversation(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ 發送失敗：${error.message}`,
          timestamp: new Date(),
          gibbsStage: '錯誤'
        }
      ]);
      setIsPlayingVoice(false); // 保險
    }
  };
  const stageLabels: Record<string, string> = {
    description: '📝 描述階段',
    feelings: '💭 感受階段',
    evaluation: '📈 評估階段',
    analysis: '🔍 分析階段',
    conclusion: '📚 結論階段',
    action: '🛠️ 改善計畫階段',
  };
  
  const handleFinishReflection = async () => {
    try {
      await fetchJson(`/api/conversations/${conversationId}/reflection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, complete: true })
      });
      
      router.push(`/dialogue/history/${conversationId}`);
    } catch (error: any) {
      console.error('完成反思時出錯:', error.message);
      alert(`完成反思時出錯：${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navbar user={user} />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  反思: {conversationTitle}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  使用 Gibbs 反思模型進行反思
                </p>
              </div>
              <div>
                <span className={`px-3 py-1 text-sm rounded-full ${
                  currentStage === 'description' ? 'bg-blue-100 text-blue-800' :
                  currentStage === 'feelings' ? 'bg-green-100 text-green-800' :
                  currentStage === 'evaluation' ? 'bg-yellow-100 text-yellow-800' :
                  currentStage === 'analysis' ? 'bg-purple-100 text-purple-800' :
                  currentStage === 'conclusion' ? 'bg-orange-100 text-orange-800' :
                  currentStage === 'action' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                {stageLabels[currentStage] || '準備中'}
                </span>
                            
              </div>
              
            </div>
            {currentStage && (
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                {currentStage === 'description' && '📝 描述階段：可以跟我聊聊你大概有講什麼呢?\n有哪裡不足的地方?'}
                {currentStage === 'feelings' && '💭 感受階段：你覺得剛剛？\n開心？緊張？還是有點不確定？都可以跟我分享哦～'}
                {currentStage === 'evaluation' && '📈 評估階段：你覺得有哪些地方做得還不錯呢？\n有沒有什麼地方，下次可以再更進步？我們一起看看～'}
                {currentStage === 'analysis' && '🔍 分析階段：你覺得事情會那樣發生的原因是什麼呢？\n可能跟準備、心情、對話方式有關嗎？一起想一想～'}
                {currentStage === 'conclusion' && '📚 結論階段：經過這次經驗，你有什麼學到的事情嗎？\n可以是一點小發現也沒關係喔～'}
                {currentStage === 'action' && '🛠️ 改善計畫階段：如果下次再遇到類似的情況，你會想怎麼做不一樣？\n想做的事、想準備的都可以寫下來 😊'}
              </p>

            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <div className="space-y-4 mb-4 max-h-[60vh] overflow-y-auto">
              {conversation.filter(msg => msg.role !== 'system').map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'nurse' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg p-3 ${
                    msg.role === 'nurse'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                      : typeof msg.content === 'string' && msg.content.startsWith('⚠️ 發送失敗')
                      ? 'bg-red-100 dark:bg-red-800 text-red-900 dark:text-red-100'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'                  
                      }`}>
                    <p className="whitespace-pre-line">{msg.content}</p>
                    {msg.gibbsStage && msg.role === 'assistant' && (
                      <div className="text-xs mt-1 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded inline-block ml-auto text-gray-700 dark:text-gray-300">
                        {msg.gibbsStage}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex space-x-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={isPlayingVoice ? "請稍等語音播放完畢..." : "輸入您的反思..."}
                className="flex-grow px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                // disabled={isPlayingVoice}
              />
              <button
                onClick={handleSendMessage}
                // disabled={isPlayingVoice}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"

              >
                發送
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleFinishReflection}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors"
            >
              完成反思
            </button>
          </div>
        </div>
      </main>

      <footer className="bg-white dark:bg-gray-800 py-6 mt-8">
        <div className="container mx-auto px-4">
          <p className="text-center text-gray-600 dark:text-gray-400">
            © {new Date().getFullYear()} OSCE 虛擬病人對話系統 | 版權所有
          </p>
        </div>
      </footer>
    </div>
  );
}
