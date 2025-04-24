'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import Link from 'next/link';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface DialogueDetail {
  id: number;
  title: string;
  startedAt: string;
  endedAt: string | null;
  score: number | null;
  durationSec: number | null;
  overtime: boolean;
  scenarioTitle: string;
  scenarioDescription: string;
  messages: {
    id: number;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }[];
  feedback: string | null;
}

export default function DialogueDetailPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogue, setDialogue] = useState<DialogueDetail | null>(null);
  const router = useRouter();
  const params = useParams();
  const dialogueId = params?.id as string;

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
        
        // 获取对话详情
        await fetchDialogueDetail(dialogueId);
      } catch (error) {
        console.error('获取用户信息失败', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router, dialogueId]);

  // 从 API 获取对话详情数据
  const fetchDialogueDetail = async (id: string) => {
    try {
      const response = await fetch(`/api/conversations/${id}`);
      
      if (!response.ok) {
        console.warn(`获取对话详情失败: ${response.status} ${response.statusText}`);
        return;
      }
      
      const data = await response.json();
      setDialogue(data);
    } catch (error) {
      console.error('获取对话详情失败', error);
    }
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

  if (!dialogue) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <Navbar user={user} />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                對話詳情
              </h1>
              <Link 
                href="/dialogue/history"
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                返回歷史記錄
              </Link>
            </div>
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">找不到對話記錄</p>
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Navbar user={user} />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {dialogue.title}
            </h1>
            <Link 
              href="/dialogue/history"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              返回歷史記錄
            </Link>
          </div>
          
          {/* 对话信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">對話信息</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">場景：</span>
                  <span className="text-gray-900 dark:text-white">{dialogue.scenarioTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">開始時間：</span>
                  <span className="text-gray-900 dark:text-white">{new Date(dialogue.startedAt).toLocaleString('zh-TW')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">結束時間：</span>
                  <span className="text-gray-900 dark:text-white">
                    {dialogue.endedAt ? new Date(dialogue.endedAt).toLocaleString('zh-TW') : '未完成'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">持續時間：</span>
                  <span className="text-gray-900 dark:text-white">
                    {dialogue.durationSec ? `${Math.floor(dialogue.durationSec / 60)}分${dialogue.durationSec % 60}秒` : '未完成'}
                    {dialogue.overtime && <span className="ml-1 text-red-500">⚠️ 超時</span>}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">評分信息</h2>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">總分：</span>
                  <span className={`font-semibold ${
                    dialogue.score && dialogue.score >= 90 ? 'text-green-600 dark:text-green-400' :
                    dialogue.score && dialogue.score >= 80 ? 'text-blue-600 dark:text-blue-400' :
                    dialogue.score && dialogue.score >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                    dialogue.score ? 'text-red-600 dark:text-red-400' :
                    'text-gray-600 dark:text-gray-400'
                  }`}>
                    {dialogue.score !== null ? `${dialogue.score}/100` : '未評分'}
                  </span>
                </div>
                {dialogue.feedback && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400 block mb-1">評語：</span>
                    <p className="text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-2 rounded-md">
                      {dialogue.feedback}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* 对话内容 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">對話內容</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
              {dialogue.messages.map((msg, index) => (
                <div 
                  key={msg.id || index} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === 'user' 
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100' 
                        : 'bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <p>{msg.content}</p>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                      {new Date(msg.timestamp).toLocaleTimeString('zh-TW')}
                    </div>
                  </div>
                </div>
              ))}
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