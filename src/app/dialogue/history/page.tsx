'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import Link from 'next/link';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface DialogueHistory {
  id: number;
  title: string;
  startedAt: string;
  score: number | null;
  durationSec: number | null;
  overtime: boolean;
}

export default function DialogueHistoryPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogueHistory, setDialogueHistory] = useState<DialogueHistory[]>([]);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    
    // 从 localStorage 获取用户信息
    const fetchUser = async () => {
      try {
        const userJson = localStorage.getItem('user');
        if (!userJson) {
          throw new Error('未登入');
        }
        
        const userData = JSON.parse(userJson);
        setUser(userData);
        
        // 获取对话历史
        await fetchDialogueHistory(userData.id);
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
        setDialogueHistory([]);
        return;
      }
      
      const data = await response.json();
      setDialogueHistory(data);
    } catch (error) {
      console.error('获取对话历史失败', error);
      setDialogueHistory([]);
    }
  };

  const handleViewHistory = (id: number) => {
    router.push(`/dialogue/history/${id}`);
  };

  // 避免服务器端和客户端渲染不匹配
  if (!mounted) {
    return null;
  }

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Navbar user={user} />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              對話歷史
            </h1>
            <Link 
              href="/"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              返回首頁
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
                  {dialogueHistory.map((history) => (
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
              <Link 
                href="/dialogue/new"
                className="mt-4 inline-block py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
              >
                開始您的第一次對話
              </Link>
            </div>
          )}
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