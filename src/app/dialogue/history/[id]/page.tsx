'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import Link from 'next/link';
import React from 'react';

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
    role: string;
    content: string;
    timestamp: string;
    elapsedSeconds: number | null;
    delayFromPrev: number | null;
  }[];
  reflection: string | null;
  reflections: {
    id: number;
    sender: string;
    text: string;
    timestamp: string;
    sourceNodeId: string | null;
    strategyTag: string | null;
  }[];
  feedback: string | null;
}

export default function DialogueDetailPage({ params }: { params: { id: string } | Promise<{ id: string }> }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogue, setDialogue] = useState<DialogueDetail | null>(null);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  // 正确使用 React.use() 解包 params
  const resolvedParams = params instanceof Promise ? React.use(params) : params;
  const dialogueId = resolvedParams.id;

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
        
        // 获取对话详情
        await fetchDialogueDetail(dialogueId);
      } catch (error) {
        console.error('獲取對話詳情失敗', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [dialogueId, router]);

  // 從 API 獲取對話詳情數據
  const fetchDialogueDetail = async (id: string) => {
    try {
      // 從本地存儲獲取用戶 ID
      const userJson = localStorage.getItem('user');
      const userData = userJson ? JSON.parse(userJson) : null;
      const userId = userData?.id;

      // 添加憑據選項，確保發送 cookies
      const response = await fetch(`/api/conversations/${id}?userId=${userId}`, {
        credentials: 'include'  // 確保發送 cookies
      });
      
      if (!response.ok) {
        console.warn(`獲取對話詳情失敗: ${response.status} ${response.statusText}`);
        return;
      }
      
      const data = await response.json();
      setDialogue(data);
    } catch (error) {
      console.error('獲取對話詳情失敗', error);
    }
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
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">對話信息</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
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
                  
                  {/* 添加評分等級 */}
                  {dialogue.score && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">等級：</span>
                      <span className={`font-semibold ${
                        dialogue.score >= 90 ? 'text-green-600 dark:text-green-400' :
                        dialogue.score >= 80 ? 'text-blue-600 dark:text-blue-400' :
                        dialogue.score >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {dialogue.score >= 90 ? 'A (優秀)' :
                         dialogue.score >= 80 ? 'B (良好)' :
                         dialogue.score >= 70 ? 'C (及格)' :
                         'D (需加強)'}
                      </span>
                    </div>
                  )}
                  
                  {/* 添加評分時間 */}
                  {dialogue.endedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">評分時間：</span>
                      <span className="text-gray-900 dark:text-white">
                        {new Date(dialogue.endedAt).toLocaleString('zh-TW')}
                      </span>
                    </div>
                  )}
                  
                  {/* 添加評分說明 */}
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {dialogue.score === null 
                        ? '此對話尚未評分，完成對話後系統將自動評分。' 
                        : dialogue.score >= 80 
                          ? '恭喜！您在此次對話中表現優異。' 
                          : '繼續練習可以提高您的對話技巧。'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 对话内容 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">對話內容</h2>
            <div className="relative max-h-96 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
              <div className="flex justify-center">
                <div className="relative w-full max-w-4xl">
                  {/* 時間軸線條 - 置中且僅在可滾動區域內 */}
                  <div 
                    className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600 transform -translate-x-1/2"
                  ></div>
                  
                  <div className="space-y-0">
                    {dialogue.messages.map((msg, index, arr) => {
                      // 判斷是否為用戶消息
                      const isUserMessage = msg.role === 'user';
                      
                      // 只對用戶消息檢查延遲
                      const showDelayWarning = isUserMessage && msg.delayFromPrev && msg.delayFromPrev > 5;
                      
                      // 計算與上一條消息的間距（基於 elapsedSeconds）
                      const prevMsg = index > 0 ? arr[index - 1] : null;
                      const prevElapsed = prevMsg ? (prevMsg.elapsedSeconds || 0) : 0;
                      const currentElapsed = msg.elapsedSeconds || 0;
                      const timeDiff = currentElapsed - prevElapsed;
                      
                      // 根據時間差計算間距高度（每秒 5px，最小 40px）
                      const spacing = Math.max(40, timeDiff * 5);
                      
                      return (
                        <div 
                          key={msg.id || index} 
                          className="relative" 
                          style={{ marginTop: index === 0 ? '20px' : `${spacing}px` }}
                        >
                          {/* 時間標記 - 置中 */}
                          <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                              <div className="w-2 h-2 rounded-full bg-white"></div>
                            </div>
                          </div>
                          
                          {/* 時間標籤 - 置中 */}
                          <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2 mt-6 text-xs text-gray-500 dark:text-gray-400 text-center">
                            {msg.elapsedSeconds ? `${Math.floor(msg.elapsedSeconds / 60)}:${(msg.elapsedSeconds % 60).toString().padStart(2, '0')}` : '00:00'}
                          </div>
                          
                          {/* 對話內容 - 分左右兩側 */}
                          <div className="grid grid-cols-2 gap-4 mt-8">
                            {/* 左側（病人）消息 */}
                            {!isUserMessage && (
                              <>
                                <div className={`justify-self-end pr-4 max-w-full`}>
                                  <div className={`rounded-lg p-3 ${
                                    'bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-gray-100'
                                  }`}>
                                    <p className="break-words">{msg.content}</p>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                                      {msg.elapsedSeconds 
                                        ? `${Math.floor(msg.elapsedSeconds / 60)}:${(msg.elapsedSeconds % 60).toString().padStart(2, '0')}` 
                                        : '00:00'}
                                    </div>
                                  </div>
                                </div>
                                <div></div> {/* 右側空白 */}
                              </>
                            )}
                            
                            {/* 右側（用戶）消息 */}
                            {isUserMessage && (
                              <>
                                <div></div> {/* 左側空白 */}
                                <div className={`${showDelayWarning ? 'justify-self-start pl-4 max-w-full' : 'max-w-full'}`}>
                                  {/* 延遲警告 - 只對用戶消息顯示 */}
                                  {showDelayWarning && (
                                    <div className="mb-1 text-xs text-red-500 dark:text-red-400">
                                      延遲回應 {msg.delayFromPrev} 秒
                                    </div>
                                  )}
                                  <div className={`rounded-lg p-3 ${
                                    showDelayWarning
                                      ? 'bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 border border-red-300 dark:border-red-700'
                                      : 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                                  }`}>
                                    <p className="break-words">{msg.content}</p>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                                      {msg.elapsedSeconds 
                                        ? `${Math.floor(msg.elapsedSeconds / 60)}:${(msg.elapsedSeconds % 60).toString().padStart(2, '0')}` 
                                        : '00:00'}
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* 添加底部間距，確保最後一條消息有足夠空間 */}
                    <div className="h-20"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* 添加反思内容部分 */}
          {(dialogue.reflection || (dialogue.reflections && dialogue.reflections.length > 0)) && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">評語</h2>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                {dialogue.reflection && (
                  <div className="mb-4">
                    <h3 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-2">總結反思</h3>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{dialogue.reflection}</p>
                  </div>
                )}
                
                {dialogue.reflections && dialogue.reflections.length > 0 && (
                  <div>
                    <h3 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-2">反思對話</h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto p-2">
                      {dialogue.reflections.map((item, index) => (
                        <div 
                          key={item.id || index} 
                          className={`p-3 rounded-lg ${
                            item.sender === 'user' 
                              ? 'bg-blue-100 dark:bg-blue-900 ml-8' 
                              : 'bg-gray-100 dark:bg-gray-600 mr-8'
                          }`}
                        >
                          <p className="text-sm">{item.text}</p>
                          {item.strategyTag && (
                            <span className="inline-block mt-1 text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200">
                              {item.strategyTag}
                            </span>
                          )}
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                            {new Date(item.timestamp).toLocaleTimeString('zh-TW')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* 保留原有的feedback显示，以防有些对话使用旧格式 */}
          {dialogue.feedback && !dialogue.reflection && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">評語</h2>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{dialogue.feedback}</p>
              </div>
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