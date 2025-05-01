'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '../components/navbar';
import Link from 'next/link';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  nickname?: string;
}

interface DialogueHistory {
  id: number;
  title: string;
  startedAt: string;
  score: number | null;
  durationSec: number | null;
  overtime: boolean;
}

interface RecommendedScenario {
  id: number;
  title: string;
  description: string;
  scenarioCode: string;
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogueHistory, setDialogueHistory] = useState<DialogueHistory[]>([]);
  const [recommendedScenarios, setRecommendedScenarios] = useState<RecommendedScenario[]>([]);
  const router = useRouter();

  useEffect(() => {
    // 確保代碼在客戶端執行
    if (typeof window === 'undefined') {
      console.log('代碼在伺服器端執行，跳過localStorage操作');
      setLoading(false);
      return;
    }
    
    const fetchUser = async () => {
      console.log('開始獲取用戶資訊');
      try {
        const userJson = localStorage.getItem('user');
        console.log('localStorage中的user資料:', userJson ? '存在' : '不存在');
        
        if (!userJson) {
          console.log('未登入，但首頁可以訪問');
          setUser(null);
          setLoading(false);
          return;
        }
        
        try {
          console.log('嘗試解析用戶資料');
          const userData = JSON.parse(userJson);
          console.log('用戶資料解析成功:', userData);
          setUser(userData);
          
          try {
            console.log('開始獲取對話歷史和推薦場景');
            // 獲取對話歷史
            await fetchDialogueHistory(userData.id);
            // 獲取推薦場景
            await fetchRecommendedScenarios(userData.id);
            console.log('對話歷史和推薦場景獲取完成');
          } catch (apiError) {
            console.error('API 調用失敗:', apiError);
          }
        } catch (parseError) {
          console.error('解析用戶資料失敗:', parseError);
          localStorage.removeItem('user');
          setUser(null);
        }
      } catch (error) {
        console.error('獲取用戶資訊失敗:', error);
        setUser(null);
      } finally {
        console.log('設置loading為false');
        setLoading(false);
      }
    };
    
    fetchUser();
  }, []);

  // 從 API 獲取對話歷史資料
  const fetchDialogueHistory = async (userId: number) => {
    try {
      console.log(`開始獲取用戶 ${userId} 的對話歷史`);
      const response = await fetch(`/api/conversations/history?userId=${userId}`);
      
      console.log(`對話歷史 API 回應狀態: ${response.status}`);
      
      if (!response.ok) {
        console.warn(`獲取對話歷史失敗: ${response.status} ${response.statusText}`);
        // 如果獲取失敗，設置為空陣列
        setDialogueHistory([]);
        return;
      }
      
      const data = await response.json();
      console.log(`獲取到 ${data.length} 條對話歷史記錄:`, data);
      setDialogueHistory(data);
    } catch (error) {
      console.error('獲取對話歷史失敗', error);
      // 如果獲取失敗，設置為空陣列
      setDialogueHistory([]);
    }
  };

  // 從 API 獲取推薦場景資料
  const fetchRecommendedScenarios = async (userId: number) => {
    try {
      // 嘗試從 API 獲取資料
      const response = await fetch(`/api/scenarios/recommended?userId=${userId}`);
      
      if (!response.ok) {
        console.warn(`獲取推薦場景失敗: ${response.status} ${response.statusText}`);
        
        // 如果 API 尚未實現，使用模擬數據進行測試
        const mockData: RecommendedScenario[] = [
          {
            id: 1,
            title: "糖尿病患者護理對話",
            description: "練習與糖尿病患者的溝通技巧，包括飲食指導和胰島素使用說明。",
            scenarioCode: "diabetes_care"
          },
          {
            id: 2,
            title: "術後疼痛評估",
            description: "學習如何評估和管理患者的術後疼痛，提供適當的護理和支持。",
            scenarioCode: "postop_pain"
          }
        ];
        
        setRecommendedScenarios(mockData);
        return;
      }
      
      const data = await response.json();
      setRecommendedScenarios(data);
    } catch (error) {
      console.error('獲取推薦場景失敗', error);
      // 如果獲取失敗，設置為空陣列
      setRecommendedScenarios([]);
    }
  };

  const handleStartNewDialogue = () => {
    router.push('/dialogue/new');
  };

  const handleViewHistory = (id: number) => {
    router.push(`/dialogue/history/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">載入中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push('/login');
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="mt-4 text-gray-600 dark:text-gray-400">未登入，正在跳轉到登入頁面...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Navbar user={user} />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* 歡迎橫幅 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            歡迎回來，{user.nickname}！
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            您已成功登入 OSCE 虛擬病人對話系統。這個系統將幫助您練習和提高護理對話技能，為 OSCE 考試做好準備。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左側：用戶資訊和快速操作 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 用戶資訊卡片 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                您的帳號資訊
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">帳號 (學號):</p>
                  <p className="font-medium text-gray-900 dark:text-white">{user.nickname}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">電子郵件:</p>
                  <p className="font-medium text-gray-900 dark:text-white">{user.email || '未設置'}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">角色:</p>
                  <p className="font-medium text-gray-900 dark:text-white">{user.role || '學生'}</p>
                </div>
              </div>
            </div>

            {/* 快速操作卡片 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                快速操作
              </h2>
              <div className="space-y-3">
                <button 
                  onClick={handleStartNewDialogue}
                  className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
                >
                  開始新對話
                </button>
                
              </div>
            </div>

            {/* 學習進度卡片 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                學習進度
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-700 dark:text-gray-300">完成對話</span>
                    <span className="text-gray-700 dark:text-gray-300">{dialogueHistory.length}/10</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${(dialogueHistory.length / 10) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-700 dark:text-gray-300">平均分數</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {dialogueHistory.length > 0 
                        ? Math.round(dialogueHistory.reduce((acc, curr) => acc + (curr.score || 0), 0) / dialogueHistory.filter(h => h.score !== null).length) 
                        : 0}
                      /100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div 
                      className="bg-green-600 h-2.5 rounded-full" 
                      style={{ 
                        width: `${dialogueHistory.length > 0 
                          ? Math.round(dialogueHistory.reduce((acc, curr) => acc + (curr.score || 0), 0) / dialogueHistory.filter(h => h.score !== null).length) 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-700 dark:text-gray-300">超時比例</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {dialogueHistory.length > 0 
                        ? Math.round((dialogueHistory.filter(h => h.overtime).length / dialogueHistory.length) * 100) 
                        : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div 
                      className="bg-red-600 h-2.5 rounded-full" 
                      style={{ 
                        width: `${dialogueHistory.length > 0 
                          ? Math.round((dialogueHistory.filter(h => h.overtime).length / dialogueHistory.length) * 100) 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 右側：對話歷史和推薦場景 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 對話歷史卡片 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  對話歷史
                </h2>
                <Link 
                  href="/dialogue/history"
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                >
                  查看全部
                </Link>
              </div>
              
              {dialogueHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          標題
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          日期
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          分數
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          時長
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {dialogueHistory.slice(0, 5).map((history) => (
                        <tr key={history.id}>
                          
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                              <button
                              onClick={() => handleViewHistory(history.id)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-400 dark:hover:text-blue-300 text-left font-medium truncate max-w-[120px] sm:max-w-[200px] md:max-w-none block"
                              title={history.title}
                            >
                              {history.title}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {new Date(history.startedAt).toLocaleDateString('zh-TW')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              history.score && history.score >= 90 ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                              history.score && history.score >= 80 ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' :
                              history.score && history.score >= 70 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' :
                              history.score ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {history.score !== null ? history.score : '未評分'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                            {history.durationSec ? `${Math.floor(history.durationSec / 60)}分${history.durationSec % 60}秒` : '未完成'}
                            {history.overtime && <span className="ml-1 text-red-500">⚠️</span>}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleViewHistory(history.id)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              查看
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">您還沒有任何對話記錄</p>
                  <button 
                    onClick={handleStartNewDialogue}
                    className="mt-4 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
                  >
                    開始您的第一次對話
                  </button>
                </div>
              )}
            </div>

            {/* 推薦場景卡片 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                推薦場景
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendedScenarios.length > 0 ? (
                  recommendedScenarios.map((scenario) => (
                    <div key={scenario.id} className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg hover:shadow-md transition-shadow">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{scenario.title}</h3>
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                        {scenario.description}
                      </p>
                      <button 
                        onClick={() => router.push(`/dialogue/new?scenario=${scenario.scenarioCode}`)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                      >
                        開始練習 →
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-4">
                    <p className="text-gray-500 dark:text-gray-400">暫無推薦場景</p>
                  </div>
                )}
              </div>
            </div>
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