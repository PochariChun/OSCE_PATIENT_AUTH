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
    // 从 localStorage 获取用户信息
    const fetchUser = async () => {
      try {
        const userJson = localStorage.getItem('user');
        if (!userJson) {
          throw new Error('未登入');
        }
        
        const userData = JSON.parse(userJson);
        setUser(userData);
        
        // 从 API 获取对话历史和推荐场景
        await Promise.all([
          fetchDialogueHistory(userData.id),
          fetchRecommendedScenarios(userData.id)
        ]);
      } catch (error) {
        console.error('获取用户信息失败', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router]);

  // 从 API 获取对话历史数据
  const fetchDialogueHistory = async (userId: number) => {
    try {
      const response = await fetch(`/api/conversations/history?userId=${userId}`);
      
      if (!response.ok) {
        console.warn(`获取对话历史失败: ${response.status} ${response.statusText}`);
        // 如果获取失败，设置为空数组
        setDialogueHistory([]);
        return;
      }
      
      const data = await response.json();
      setDialogueHistory(data);
    } catch (error) {
      console.error('获取对话历史失败', error);
      // 如果获取失败，设置为空数组
      setDialogueHistory([]);
    }
  };

  // 从 API 获取推荐场景数据
  const fetchRecommendedScenarios = async (userId: number) => {
    try {
      // 尝试从 API 获取数据
      const response = await fetch(`/api/scenarios/recommended?userId=${userId}`);
      
      if (!response.ok) {
        console.warn(`获取推荐场景失败: ${response.status} ${response.statusText}`);
        // 如果获取失败，设置为空数组，不使用假数据
        setRecommendedScenarios([]);
        return;
      }
      
      const data = await response.json();
      setRecommendedScenarios(data);
    } catch (error) {
      console.error('获取推荐场景失败', error);
      // 如果获取失败，设置为空数组，不使用假数据
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
          <p className="mt-4 text-gray-600 dark:text-gray-400">加載中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // 將由 useEffect 中的 router.push 處理重定向
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Navbar user={user} />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {/* 歡迎橫幅 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            歡迎回來，{user.name}！
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            您已成功登入 OSCE 虛擬病人對話系統。這個系統將幫助您練習和提高護理對話技能，為 OSCE 考試做好準備。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左側：用戶信息和快速操作 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 用戶信息卡片 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                您的帳號信息
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">帳號 (學號):</p>
                  <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">電子郵件:</p>
                  <p className="font-medium text-gray-900 dark:text-white">{user.email || '未設置'}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">角色:</p>
                  <p className="font-medium text-gray-900 dark:text-white">{user.role || '學生'}</p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">帳號創建時間:</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(user.createdAt).toLocaleString('zh-TW')}
                  </p>
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
                <Link 
                  href="/profile/edit"
                  className="block w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-medium rounded-md transition-colors text-center"
                >
                  編輯個人資料
                </Link>
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
                            {history.title}
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