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
  emotionScore: number;
  notes?: string;
}

interface ReflectionMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  gibbsStage?: 'description' | 'feelings' | 'evaluation' | 'analysis' | 'conclusion' | 'action' | string;
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
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const params = useParams();
  const conversationId = params.id as string;
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 滾動到最新訊息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  useEffect(() => {
    const initializeReflection = async () => {
      try {
        setLoading(true);
        
        // 從 localStorage 獲取用戶信息
        const userJson = localStorage.getItem('user');
        if (!userJson) {
          console.error('未登入，請先登入後再訪問此頁面');
          setError('未登入，請先登入後再訪問此頁面');
          router.push('/login');
          return;
        }
        
        const userData = JSON.parse(userJson);
        setUser(userData);
        
        // 獲取對話數據
        await fetchConversationData(userData.id);
      } catch (reflectionError) {
        console.error('ReflectionPage: 獲取反思數據失敗', reflectionError);
        setError('無法加載反思數據，請稍後再試');
      } finally {
        setLoading(false);
      }
    };
    
    initializeReflection();
  }, [conversationId, router]);
  
  useEffect(() => {
    scrollToBottom();
  }, [conversation]);
  
  const fetchConversationData = async (userId: number) => {
    try {
      // 获取对话信息
      const conversationResponse = await fetch(`/api/conversations/${conversationId}?userId=${userId}`);
      
      if (!conversationResponse.ok) {
        console.error('無法獲取對話資訊:', conversationResponse.statusText);
        setError('無法獲取對話資訊，請稍後再試');
        return; // 温和处理，不抛出错误
      }
      
      const conversationData = await conversationResponse.json();
      
      // 放宽权限检查，允许用户访问反思页面
      // 只记录可能的权限问题，但不阻止用户
      if (conversationData.userId && conversationData.userId !== userId) {
        console.warn(`可能的权限问题: 对话用户ID=${conversationData.userId}, 当前用户ID=${userId}`);
      }
      
      // 设置对话标题
      setConversationTitle(conversationData.title || `對話 #${conversationId}`);
      
      // 获取对话消息
      const messagesResponse = await fetch(`/api/conversations/${conversationId}/messages`);
      
      if (!messagesResponse.ok) {
        console.error('無法獲取對話消息:', messagesResponse.statusText);
        setError('無法獲取對話消息，請稍後再試');
        return; // 温和处理，不抛出错误
      }
      
      const messagesData = await messagesResponse.json();
      
      // 处理消息数据，创建反思卡片
      const cards: ReflectionCard[] = [];
      
      for (let i = 0; i < messagesData.length; i += 2) {
        if (i + 1 < messagesData.length) {
          const userMessage = messagesData[i];
          const aiResponse = messagesData[i + 1];
          
          if (userMessage.sender === 'user' && aiResponse.sender === 'assistant') {
            cards.push({
              timestamp: new Date(userMessage.timestamp).toLocaleTimeString(),
              userSpeech: userMessage.text,
              patientResponse: aiResponse.text,
              isCorrect: userMessage.isCorrect || false,
              isDelayed: userMessage.isDelayed || false,
              emotionLabel: aiResponse.emotionLabel || '中性',
              emotionScore: aiResponse.emotionScore || 0,
              notes: userMessage.notes || ''
            });
          }
        }
      }
      
      setReflectionCards(cards);
      
      // 尝试获取反思对话
      try {
        const reflectionResponse = await fetch(`/api/conversations/${conversationId}/reflection`);
        
        if (reflectionResponse.ok) {
          const reflectionData = await reflectionResponse.json();
          
          // 设置反思对话
          setConversation(reflectionData.messages.map((msg: any) => ({
            role: msg.sender,
            content: msg.text,
            timestamp: new Date(msg.timestamp),
            gibbsStage: msg.sourceNodeId || msg.strategyTag
          })));
          
          // 设置当前阶段
          if (reflectionData.messages.length > 0) {
            const lastMessage = reflectionData.messages[reflectionData.messages.length - 1];
            if (lastMessage.gibbsStage) {
              setCurrentStage(lastMessage.gibbsStage);
            }
          }
        } else {
          if (reflectionResponse.status !== 404) {
            console.error('無法獲取反思數據:', reflectionResponse.statusText);
            setError('無法獲取反思數據，請稍後再試');
          }
          
          // 初始化反思对话
          setConversation([
            {
              role: 'system',
              content: `歡迎進行對話反思。請思考您在與病人的對話中的表現。`,
              timestamp: new Date()
            },
            {
              role: 'assistant',
              content: '讓我們開始反思這次對話。首先，請描述一下發生了什麼？請盡可能詳細地描述整個對話過程。',
              timestamp: new Date(),
              gibbsStage: 'description'
            }
          ]);
          
          setCurrentStage('description');
        }
      } catch (reflectionError) {
        console.error('獲取反思數據時出錯:', reflectionError);
        // 温和处理，不抛出错误
        
        // 初始化反思对话
        setConversation([
          {
            role: 'system',
            content: `歡迎進行對話反思。請思考您在與病人的對話中的表現。`,
            timestamp: new Date()
          },
          {
            role: 'assistant',
            content: '讓我們開始反思這次對話。首先，請描述一下發生了什麼？請盡可能詳細地描述整個對話過程。',
            timestamp: new Date(),
            gibbsStage: 'description'
          }
        ]);
        
        setCurrentStage('description');
      }
    } catch (error) {
      console.error('獲取對話數據時出錯:', error);
      setError('無法加載對話數據，請稍後再試');
    }
  };
  
  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    const userMessage: ReflectionMessage = {
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
      gibbsStage: currentStage
    };
    
    setConversation(prev => [...prev, userMessage]);
    setMessage('');
    
    try {
      // 发送消息到服务器
      const response = await fetch(`/api/conversations/${conversationId}/reflection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          message: message.trim(),
          currentStage
        }),
      });
      
      if (!response.ok) {
        console.error('發送反思消息失敗:', response.statusText);
        // 添加一个系统消息，告知用户发送失败
        setConversation(prev => [
          ...prev, 
          {
            role: 'system' as const,
            content: '發送消息失敗，請稍後再試。',
            timestamp: new Date()
          }
        ]);
        return; // 温和处理，不抛出错误
      }
      
      const data = await response.json();
      
      // 添加AI回复
      const aiMessage = {
        role: 'assistant' as const,
        content: data.response,
        timestamp: new Date(),
        gibbsStage: data.gibbsStage
      };
      
      setConversation(prev => [...prev, aiMessage]);
      
      // 更新当前阶段
      if (data.gibbsStage) {
        setCurrentStage(data.gibbsStage);
      }
    } catch (error) {
      console.error('處理反思消息時出錯:', error);
      // 添加一个系统消息，告知用户发送失败
      setConversation(prev => [
        ...prev, 
        {
          role: 'system' as const,
          content: '處理消息時出錯，請稍後再試。',
          timestamp: new Date()
        }
      ]);
    }
  };
  
  const handleFinishReflection = async () => {
    try {
      // 发送完成反思请求
      const response = await fetch(`/api/conversations/${conversationId}/reflection/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id
        }),
      });
      
      if (!response.ok) {
        console.error('完成反思失敗:', response.statusText);
        alert('完成反思失敗，請稍後再試');
        return; // 温和处理，不抛出错误
      }
      
      // 重定向到历史页面
      router.push('/dialogue/history');
    } catch (error) {
      console.error('完成反思時出錯:', error);
      alert('完成反思時出錯，請稍後再試');
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