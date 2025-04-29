'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Navbar } from '@/components/navbar';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface ReflectionCard {
  timestamp: string;
  userSpeech: string;
  patientResponse: string;
  isCorrect: boolean;
  isDelayed: boolean;
  emotionLabel: string;
  notes?: string;
}

interface ReflectionMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  gibbsStage?: 'description' | 'feelings' | 'evaluation' | 'analysis' | 'conclusion' | 'action';
}

export default function ReflectionPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [reflectionCards, setReflectionCards] = useState<ReflectionCard[]>([]);
  const [conversation, setConversation] = useState<ReflectionMessage[]>([]);
  const [message, setMessage] = useState('');
  const [conversationTitle, setConversationTitle] = useState('');
  const [currentStage, setCurrentStage] = useState<string>('');
  const [reflection, setReflection] = useState(null);
  const [error, setError] = useState(null);
  
  const router = useRouter();
  const params = useParams();
  const conversationId = params.id as string;
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 滾動到最新訊息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    // 改進的 fetchUser 函數
    const fetchUser = async () => {
      try {
        console.log('ReflectionPage: 開始獲取用戶資訊');
        const userJson = localStorage.getItem('user');
        if (!userJson) {
          console.log('ReflectionPage: 未找到用戶資訊，重定向到登入頁面');
          router.push('/login');
          return;
        }
        
        let userData;
        try {
          userData = JSON.parse(userJson);
          console.log('ReflectionPage: 成功解析用戶資料');
        } catch (parseError) {
          console.error('ReflectionPage: 用戶資料解析失敗', parseError);
          localStorage.removeItem('user'); // 清除無效資料
          router.push('/login');
          return;
        }
        
        setUser(userData);
        
        // 分開處理反思數據獲取
        try {
          console.log(`ReflectionPage: 開始獲取反思數據，ID: ${conversationId}`);
          await fetchConversationData(userData.id);
        } catch (reflectionError) {
          console.error('ReflectionPage: 獲取反思數據失敗', reflectionError);
          setError('無法加載反思數據，請稍後再試');
        }
      } catch (error) {
        console.error('ReflectionPage: 獲取用戶資訊失敗', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
  }, [router, conversationId]);
  
  useEffect(() => {
    scrollToBottom();
  }, [conversation]);
  
  const fetchConversationData = async (userId: number) => {
    try {
      if (!conversationId) {
        console.error('對話ID不存在');
        return;
      }
      
      // 獲取對話詳情
      const response = await fetch(`/api/conversations/${conversationId}?userId=${userId}`);
      
      if (!response.ok) {
        console.error('獲取對話詳情失敗:', response.status, response.statusText);
        return;
      }
      
      const data = await response.json();
      console.log('獲取對話詳情成功:', data);
      
      setConversationTitle(data.title || `對話 #${conversationId}`);
      
      // 將對話訊息轉換為反思卡片
      const cards = transformMessagesToCards(data.messages);
      setReflectionCards(cards);
      
      // 初始化反思對話
      initializeReflectionConversation(cards);
      
    } catch (error) {
      console.error('獲取對話資料失敗', error);
    }
  };
  
  // 將對話訊息轉換為反思卡片
  const transformMessagesToCards = (messages: any[]): ReflectionCard[] => {
    const cards: ReflectionCard[] = [];
    
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      
      if (msg.role === 'user') {
        // 尋找下一條病人回覆
        const patientResponse = messages[i + 1]?.role === 'assistant' ? messages[i + 1].content : '';
        
        cards.push({
          timestamp: formatTimestamp(msg.elapsedSeconds),
          userSpeech: msg.content,
          patientResponse: patientResponse,
          isCorrect: true, // 這裡需要根據實際情況判斷
          isDelayed: msg.delayFromPrev > 5, // 假設超過5秒視為延遲
          emotionLabel: 'neutral', // 這裡需要根據實際情況判斷
          notes: ''
        });
        
        // 如果有找到病人回覆，跳過下一條訊息
        if (patientResponse) {
          i++;
        }
      }
    }
    
    return cards;
  };
  
  // 格式化時間戳
  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // 初始化反思對話
  const initializeReflectionConversation = (cards: ReflectionCard[]) => {
    // 系統提示
    const systemPrompt: ReflectionMessage = {
      role: 'system',
      content: `你是一位護理教育反思教練。你的任務是使用 Gibbs（1988）六階段模型，引導學生針對自己的護理對話練習進行深度反思。`,
      timestamp: new Date()
    };
    
    // 將卡片資訊摘要給 AI
    const cardsSummary = cards.map(card => 
      `[${card.timestamp}] 學生: "${card.userSpeech}" -> 病人: "${card.patientResponse}"`
    ).join('\n');
    
    const dataPrompt: ReflectionMessage = {
      role: 'system',
      content: `以下是學生的對話記錄摘要:\n${cardsSummary}\n\n請開始引導學生進行反思。`,
      timestamp: new Date()
    };
    
    // AI 的第一個回應
    const initialResponse: ReflectionMessage = {
      role: 'assistant',
      content: `您好！我是您的反思教練。我看到您剛完成了一場醫病對話練習，現在讓我們一起來反思這次的經驗。\n\n首先，請您簡單描述一下這次對話的情境和您的整體感受。`,
      timestamp: new Date(),
      gibbsStage: 'description'
    };
    
    setConversation([systemPrompt, dataPrompt, initialResponse]);
    setCurrentStage('description');
  };
  
  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    const userMessage: ReflectionMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    
    setConversation(prev => [...prev, userMessage]);
    setMessage('');
    
    try {
      // 準備發送給 AI 的完整對話歷史
      const conversationHistory = conversation
        .filter(msg => msg.role !== 'system') // 排除系統訊息
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      
      // 添加用戶最新訊息
      conversationHistory.push({
        role: 'user',
        content: message
      });
      
      // 添加當前階段資訊
      const prompt = `當前反思階段: ${currentStage}。請根據學生回應，判斷是否需要提供對話片段輔助，並引導進入適當的下一階段。`;
      
      // 發送請求到 AI API
      const response = await fetch('/api/reflection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          messages: conversationHistory,
          reflectionCards,
          currentStage,
          systemPrompt: prompt
        }),
      });
      
      if (!response.ok) {
        throw new Error('AI 回應失敗');
      }
      
      const data = await response.json();
      
      // 更新對話和當前階段
      const assistantMessage: ReflectionMessage = {
        role: 'assistant',
        content: data.content,
        timestamp: new Date(),
        gibbsStage: data.nextStage
      };
      
      setConversation(prev => [...prev, assistantMessage]);
      setCurrentStage(data.nextStage);
      
      // 保存反思訊息到資料庫
      await saveReflectionMessage(userMessage.content, data.content, data.nextStage);
      
    } catch (error) {
      console.error('獲取 AI 回應失敗', error);
      
      // 錯誤處理
      const errorMessage: ReflectionMessage = {
        role: 'assistant',
        content: '抱歉，我在處理您的回應時遇到了問題。請再試一次。',
        timestamp: new Date()
      };
      
      setConversation(prev => [...prev, errorMessage]);
    }
  };
  
  // 保存反思訊息到資料庫
  const saveReflectionMessage = async (userMessage: string, aiResponse: string, stage: string) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/reflection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage,
          aiResponse,
          stage,
          timestamp: new Date().toISOString()
        }),
      });
      
      if (!response.ok) {
        console.error('保存反思訊息失敗:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('保存反思訊息失敗', error);
    }
  };
  
  const handleFinishReflection = async () => {
    try {
      // 生成反思報告
      const response = await fetch(`/api/conversations/${conversationId}/reflection/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation: conversation.filter(msg => msg.role !== 'system')
        }),
      });
      
      if (!response.ok) {
        throw new Error('生成反思報告失敗');
      }
      
      // 導向到歷史頁面
      router.push(`/dialogue/history/${conversationId}`);
      
    } catch (error) {
      console.error('完成反思失敗', error);
      // 錯誤處理，仍然導向到歷史頁面
      router.push(`/dialogue/history/${conversationId}`);
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
                  使用 Gibbs 反思模型進行深度反思
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
                  {currentStage === 'description' ? '描述階段' :
                   currentStage === 'feelings' ? '感受階段' :
                   currentStage === 'evaluation' ? '評價階段' :
                   currentStage === 'analysis' ? '分析階段' :
                   currentStage === 'conclusion' ? '結論階段' :
                   currentStage === 'action' ? '行動計畫' :
                   '準備中'}
                </span>
              </div>
            </div>
          </div>
          
          {/* 對話區域 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <div className="space-y-4 mb-4 max-h-[60vh] overflow-y-auto">
              {conversation.filter(msg => msg.role !== 'system').map((msg, index) => (
                <div 
                  key={index} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === 'user' 
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.content}</p>
                    {msg.gibbsStage && msg.role === 'assistant' && (
                      <div className="text-xs mt-1 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded inline-block ml-auto text-gray-700 dark:text-gray-300">
                        {msg.gibbsStage === 'description' ? '描述階段' :
                         msg.gibbsStage === 'feelings' ? '感受階段' :
                         msg.gibbsStage === 'evaluation' ? '評價階段' :
                         msg.gibbsStage === 'analysis' ? '分析階段' :
                         msg.gibbsStage === 'conclusion' ? '結論階段' :
                         msg.gibbsStage === 'action' ? '行動計畫' : ''}
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
                placeholder="輸入您的反思..."
                className="flex-grow px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
              <button
                onClick={handleSendMessage}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
              >
                發送
              </button>
            </div>
          </div>
          
          {/* 完成反思按鈕 */}
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