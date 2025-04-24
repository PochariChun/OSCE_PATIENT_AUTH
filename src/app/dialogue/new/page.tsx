'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '../../../components/navbar';
import Link from 'next/link';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface ScenarioInfo {
  id: string | number;
  title: string;
  description: string;
  patientInfo?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  scenarioCode: string;
}

// 默认的难度映射
const difficultyMap: Record<number, 'easy' | 'medium' | 'hard'> = {
  1: 'easy',
  2: 'medium',
  3: 'hard',
  4: 'hard'
};

export default function NewDialoguePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioInfo | null>(null);
  const [conversation, setConversation] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [message, setMessage] = useState('');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenarioCode = searchParams.get('scenario');
  
  useEffect(() => {
    // 从 localStorage 获取用户信息
    const fetchUser = async () => {
      try {
        const userJson = localStorage.getItem('user');
        if (!userJson) {
          throw new Error('未登入');
        }
        
        const userData = JSON.parse(userJson);
        setUser(userData);
        
        // 获取场景数据
        await fetchScenarios();
      } catch (error) {
        console.error('获取用户信息失败', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
  }, [router]);
  
  // 从 API 获取场景数据
  const fetchScenarios = async () => {
    try {
      const response = await fetch('/api/scenarios');
      
      if (!response.ok) {
        console.warn(`获取场景数据失败: ${response.status} ${response.statusText}`);
        // 如果获取失败，设置为空数组，不使用假数据
        setScenarios([]);
        return;
      }
      
      const data = await response.json();
      
      // 转换数据格式
      const formattedScenarios = data.map((scenario: any) => ({
        id: scenario.id,
        title: scenario.title,
        description: scenario.description,
        scenarioCode: scenario.scenarioCode,
        // 只使用数据库中的患者信息，不使用默认值
        patientInfo: `${scenario.patientName}，${scenario.patientAge}歲，${scenario.diagnosis}。${scenario.accompaniedBy ? `陪同者：${scenario.accompaniedBy}。` : ''}`,
        difficulty: difficultyMap[scenario.difficulty] || 'medium'
      }));
      
      setScenarios(formattedScenarios);
      
      // 如果 URL 中有场景代码，自动选择该场景
      if (scenarioCode) {
        const scenario = formattedScenarios.find((s: any) => s.scenarioCode === scenarioCode);
        if (scenario) {
          setSelectedScenario(scenario);
          // 初始化对话
          setConversation([
            { 
              role: 'assistant' as const, 
              content: `您好，我是${scenario.title}的虛擬患者。${scenario.patientInfo}` 
            }
          ]);
        }
      }
    } catch (error) {
      console.error('获取场景数据失败', error);
      // 如果获取失败，设置为空数组，不使用假数据
      setScenarios([]);
    }
  };
  
  const handleScenarioSelect = (scenarioCode: string) => {
    const scenario = scenarios.find(s => s.scenarioCode === scenarioCode);
    if (scenario) {
      setSelectedScenario(scenario);
      // 初始化对话
      setConversation([
        { 
          role: 'assistant' as const, 
          content: `您好，我是${scenario.title}的虛擬患者。${scenario.patientInfo}` 
        }
      ]);
    }
  };
  
  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    // 添加用户消息到对话
    const updatedConversation = [
      ...conversation,
      { role: 'user' as const, content: message }
    ];
    setConversation(updatedConversation);
    setMessage('');
    
    // 模拟虚拟病人回复（在实际应用中，这里会调用 AI API）
    setTimeout(() => {
      setConversation([
        ...updatedConversation,
        { 
          role: 'assistant' as const, 
          content: '我明白您的意思了。您能告訴我更多關於這個問題的信息嗎？' 
        }
      ]);
    }, 1000);
  };
  
  const handleEndDialogue = () => {
    // 在实际应用中，这里会保存对话记录到数据库
    router.push('/dialogue/history');
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">加載中...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navbar user={user} />
      
      <main className="container mx-auto px-4 py-8">
        {!selectedScenario ? (
          // 場景選擇頁面
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              選擇對話場景
            </h1>
            
            {scenarios.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {scenarios.map((scenario) => (
                  <div 
                    key={scenario.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleScenarioSelect(scenario.scenarioCode)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {scenario.title}
                      </h2>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        scenario.difficulty === 'easy' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                        scenario.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' :
                        'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                      }`}>
                        {scenario.difficulty === 'easy' ? '簡單' : 
                         scenario.difficulty === 'medium' ? '中等' : '困難'}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {scenario.description}
                    </p>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium text-gray-700 dark:text-gray-300">患者資訊：</span> 
                        {scenario.patientInfo}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">暫無可用場景</p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">請聯繫管理員添加場景</p>
              </div>
            )}
          </div>
        ) : (
          // 對話頁面
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedScenario.title}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {selectedScenario.description}
                  </p>
                </div>
                <button 
                  onClick={handleEndDialogue}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors flex-shrink-0"
                >
                  結束對話
                </button>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300">患者資訊：</span> 
                  {selectedScenario.patientInfo}
                </p>
              </div>
            </div>
            
            {/* 對話區域 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
              <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
                {conversation.map((msg, index) => (
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
                      <p>{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="輸入您的回應..."
                  className="flex-grow px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                <button
                  onClick={handleSendMessage}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
                >
                  發送
                </button>
              </div>
            </div>
            
            {/* 提示和指導 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                提示和指導
              </h2>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li>• 保持專業和同理心，傾聽患者的擔憂</li>
                <li>• 使用患者能理解的語言解釋醫療概念</li>
                <li>• 確認患者理解您提供的信息</li>
                <li>• 給予患者足夠的時間表達自己</li>
                <li>• 提供明確的後續步驟和建議</li>
              </ul>
            </div>
          </div>
        )}
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