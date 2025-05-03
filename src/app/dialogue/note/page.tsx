'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import Link from 'next/link';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  nickname?: string;
}

interface NursingNote {
  id?: number;
  conversationId: number;
  rawText: string;
  matchedCodes: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export default function NursingNotePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [matchedCodes, setMatchedCodes] = useState<string[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [scenarioTitle, setScenarioTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    const fetchUserAndConversation = async () => {
      try {
        setLoading(true);
        
        // 从 localStorage 获取用户信息
        const userJson = localStorage.getItem('user');
        if (!userJson) {
          console.error('未登入，重定向到登入頁面');
          router.push('/login');
          return;
        }
        
        const userData = JSON.parse(userJson);
        setUser(userData);
        
        // 从 URL 参数获取对话 ID
        const id = searchParams.get('id');
        if (!id) {
          // 如果没有提供 ID，尝试从 localStorage 获取最近的对话 ID
          const recentConversationId = localStorage.getItem('recentConversationId');
          if (recentConversationId) {
            setConversationId(parseInt(recentConversationId));
            await fetchConversationDetails(parseInt(recentConversationId));
          } else {
            setError('未提供對話 ID，無法創建護理紀錄');
          }
        } else {
          setConversationId(parseInt(id));
          await fetchConversationDetails(parseInt(id));
        }
      } catch (error) {
        console.error('獲取用戶或對話信息失敗', error);
        setError('獲取用戶或對話信息失敗');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserAndConversation();
  }, [router, searchParams]);
  
  const fetchConversationDetails = async (id: number) => {
    try {
      const response = await fetch(`/api/conversations/${id}`);
      
      if (!response.ok) {
        throw new Error(`獲取對話詳情失敗: ${response.statusText}`);
      }
      
      const data = await response.json();
      setScenarioTitle(data.scenario?.title || '未知場景');
      
      // 检查是否已有护理记录
      const noteResponse = await fetch(`/api/conversations/${id}/nursing-note`);
      
      if (noteResponse.ok) {
        const noteData = await noteResponse.json();
        setNoteText(noteData.rawText || '');
        setMatchedCodes(noteData.matchedCodes || []);
      }
    } catch (error) {
      console.error('獲取對話詳情失敗', error);
      setError('獲取對話詳情失敗');
    }
  };
  
  const handleSaveNote = async () => {
    if (!conversationId) {
      setError('無效的對話 ID');
      return;
    }
    
    if (!noteText.trim()) {
      setError('請輸入護理紀錄內容');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch(`/api/conversations/${conversationId}/nursing-note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rawText: noteText,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`保存護理紀錄失敗: ${response.statusText}`);
      }
      
      const data = await response.json();
      setMatchedCodes(data.matchedCodes || []);
      setSuccess('護理紀錄已保存');
    } catch (error) {
      console.error('保存護理紀錄失敗', error);
      setError('保存護理紀錄失敗');
    } finally {
      setSaving(false);
    }
  };
  
  const handleFinish = async () => {
    if (!conversationId) {
      setError('無效的對話 ID');
      return;
    }
    
    // 先保存当前笔记
    if (noteText.trim()) {
      await handleSaveNote();
    }
    
    // 导航到反思页面
    router.push(`/dialogue/reflection/${conversationId}`);
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
                  護理紀錄
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {scenarioTitle}
                </p>
              </div>
            </div>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <p>{error}</p>
              </div>
            )}
            
            {success && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                <p>{success}</p>
              </div>
            )}
            
            <div className="mb-6">
              <label htmlFor="nursingNote" className="block text-gray-700 dark:text-gray-300 mb-2 font-medium">
                請輸入護理紀錄內容
              </label>
              <textarea
                id="nursingNote"
                ref={textareaRef}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white min-h-[200px]"
                placeholder="請輸入護理紀錄內容，包括病人狀況、生命徵象、症狀開始時間等重要資訊..."
              />
            </div>
            
            {matchedCodes.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  已識別的關鍵項目
                </h3>
                <div className="flex flex-wrap gap-2">
                  {matchedCodes.map((code, index) => (
                    <span 
                      key={index}
                      className="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 px-3 py-1 rounded-full text-sm"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex justify-between">
              <button
                onClick={handleSaveNote}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors disabled:bg-blue-400"
              >
                {saving ? '保存中...' : '保存紀錄'}
              </button>
              
              <button
                onClick={handleFinish}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors"
              >
                結束紀錄，開始反思
              </button>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              護理紀錄指引
            </h2>
            <div className="text-gray-700 dark:text-gray-300 space-y-3">
              <p>
                請在護理紀錄中包含以下關鍵資訊（如適用）：
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>病人主訴</li>
                <li>症狀開始時間</li>
                <li>症狀嚴重程度</li>
                <li>生命徵象（體溫、脈搏、呼吸、血壓等）</li>
                <li>疼痛評估（位置、性質、嚴重程度）</li>
                <li>已採取的護理措施</li>
                <li>病人對護理措施的反應</li>
                <li>其他重要觀察</li>
              </ul>
              <p className="mt-4 text-sm italic">
                系統將自動識別您記錄中的關鍵項目，並顯示在上方的「已識別的關鍵項目」區域。
              </p>
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
