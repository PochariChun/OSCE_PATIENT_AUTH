'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '../../../components/navbar';
import Link from 'next/link';
import { MicrophoneCheck } from '@/components/MicrophoneCheck';
import Image from 'next/image';

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

// 添加 SpeechRecognition 接口定义
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  error?: any;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
}

export default function NewDialoguePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioInfo | null>(null);
  const [conversation, setConversation] = useState<{ 
    role: 'user' | 'assistant' | 'system'; 
    content: string;
    elapsedSeconds?: number;
    timestamp?: Date;
  }[]>([]);
  const [message, setMessage] = useState('');
  const [micCheckCompleted, setMicCheckCompleted] = useState(false);
  
  const [isListening, setIsListening] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState<SpeechRecognition | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [lastSentenceEnd, setLastSentenceEnd] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  
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
  
  useEffect(() => {
    if (micCheckCompleted && typeof window !== 'undefined') {
      // 檢查瀏覽器是否支持語音識別
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'zh-TW'; // 設置為繁體中文
        
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          let interim = '';
          let final = '';
          
          for (let i = 0; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          
          setInterimTranscript(interim);
          
          // 如果有新的最終結果
          if (final !== finalTranscript && final.trim() !== '') {
            setFinalTranscript(final);
            
            // 檢測句子結束（句號、問號、驚嘆號等）
            const sentenceEndRegex = /[。！？\.!?]/g;
            let match;
            while ((match = sentenceEndRegex.exec(final)) !== null) {
              if (match.index > lastSentenceEnd) {
                // 提取完整句子
                const sentence = final.substring(lastSentenceEnd, match.index + 1).trim();
                if (sentence) {
                  // 自動發送句子
                  handleSendVoiceMessage(sentence);
                  setLastSentenceEnd(match.index + 1);
                }
              }
            }
          }
          
          // 將最終結果和中間結果組合顯示在輸入框
          setMessage(final.substring(lastSentenceEnd) + interim);
        };
        
        recognition.onerror = (event: SpeechRecognitionEvent) => {
          console.error('語音識別錯誤:', event.error);
          setIsListening(false);
        };
        
        recognition.onend = () => {
          // 如果仍在監聽狀態，則重新開始
          if (isListening) {
            recognition.start();
          }
        };
        
        setSpeechRecognition(recognition);
      } else {
        console.warn('您的瀏覽器不支持語音識別');
      }
    }
  }, [micCheckCompleted]);
  
  useEffect(() => {
    if (speechRecognition) {
      if (isListening) {
        try {
          speechRecognition.start();
        } catch (error) {
          // 處理可能的錯誤，例如已經在監聽中
          console.log('語音識別已經在運行中或發生錯誤', error);
        }
      } else {
        try {
          speechRecognition.stop();
          // 重置語音識別相關狀態
          setInterimTranscript('');
          setFinalTranscript('');
          setLastSentenceEnd(0);
          setMessage('');
        } catch (error) {
          console.log('停止語音識別時發生錯誤', error);
        }
      }
    }
    
    return () => {
      // 組件卸載時停止語音識別
      if (speechRecognition && isListening) {
        speechRecognition.stop();
      }
    };
  }, [isListening, speechRecognition]);
  
  // 从 API 获取场景数据
  const fetchScenarios = async () => {
    try {
      const response = await fetch('/api/scenarios');
      
      if (!response.ok) {
        console.warn(`獲取場景資料失敗: ${response.status} ${response.statusText}`);
        // 如果獲取失敗，設置為空陣列，不使用假資料
        setScenarios([]);
        return;
      }
      
      const data = await response.json();
      
      // 轉換資料格式
      const formattedScenarios = data.map((scenario: any) => ({
        id: scenario.id,
        title: scenario.title,
        description: scenario.description,
        scenarioCode: scenario.scenarioCode,
        // 只使用資料庫中的患者資訊，不使用預設值
        patientInfo: `${scenario.patientName}，${scenario.patientAge}歲，${scenario.diagnosis}。${scenario.accompaniedBy ? `陪同者：${scenario.accompaniedBy}。` : ''}`,
        difficulty: difficultyMap[scenario.difficulty] || 'medium'
      }));
      
      setScenarios(formattedScenarios);
      
      // 如果 URL 中有場景代碼，自動選擇該場景
      if (scenarioCode) {
        const scenario = formattedScenarios.find((s: any) => s.scenarioCode === scenarioCode);
        if (scenario) {
          setSelectedScenario(scenario);
          // 初始化對話，使用系統提示而非虛擬病人的問候語
          setConversation([
            { 
              role: 'system' as const, 
              content: `您已進入「${scenario.title}」的模擬對話。請開始與虛擬病人對話。`,
              timestamp: new Date(),
              elapsedSeconds: 0
            }
          ]);
          
          // 啟動計時器
          const now = new Date();
          setStartTime(now);
          const interval = setInterval(() => {
            setElapsedTime(prev => prev + 1);
          }, 1000);
          setTimerInterval(interval);
        }
      }
    } catch (error) {
      console.error('獲取場景資料失敗', error);
      // 如果獲取失敗，設置為空陣列，不使用假資料
      setScenarios([]);
    }
  };
  
  const handleScenarioSelect = (scenarioCode: string) => {
    const scenario = scenarios.find(s => s.scenarioCode === scenarioCode);
    if (scenario) {
      setSelectedScenario(scenario);
      // 初始化對話，使用系統提示而非虛擬病人的問候語
      setConversation([
        { 
          role: 'system' as const, 
          content: `您已進入「${scenario.title}」的模擬對話。請開始與虛擬病人對話。`,
          timestamp: new Date(),
          elapsedSeconds: 0
        }
      ]);
      
      // 啟動計時器
      const now = new Date();
      setStartTime(now);
      const interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      setTimerInterval(interval);
    }
  };
  
  const handleSendVoiceMessage = (voiceMessage: string) => {
    if (!voiceMessage.trim()) return;
    
    const now = new Date();
    const seconds = startTime ? Math.floor((now.getTime() - startTime.getTime()) / 1000) : 0;
    
    // 添加用戶訊息到對話
    const updatedConversation = [
      ...conversation,
      { 
        role: 'user' as const, 
        content: voiceMessage,
        timestamp: now,
        elapsedSeconds: seconds
      }
    ];
    setConversation(updatedConversation);
    
    // 模擬虛擬病人回覆
    setTimeout(() => {
      const replyTime = new Date();
      const replySeconds = startTime ? Math.floor((replyTime.getTime() - startTime.getTime()) / 1000) : 0;
      
      setConversation([
        ...updatedConversation,
        { 
          role: 'assistant' as const, 
          content: '我明白您的意思了。您能告訴我更多關於這個問題的資訊嗎？',
          timestamp: replyTime,
          elapsedSeconds: replySeconds
        }
      ]);
    }, 1000);
  };
  
  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    const now = new Date();
    const seconds = startTime ? Math.floor((now.getTime() - startTime.getTime()) / 1000) : 0;
    
    // 添加用戶訊息到對話
    const updatedConversation = [
      ...conversation,
      { 
        role: 'user' as const, 
        content: message,
        timestamp: now,
        elapsedSeconds: seconds
      }
    ];
    setConversation(updatedConversation);
    setMessage('');
    
    // 模擬虛擬病人回覆
    setTimeout(() => {
      const replyTime = new Date();
      const replySeconds = startTime ? Math.floor((replyTime.getTime() - startTime.getTime()) / 1000) : 0;
      
      setConversation([
        ...updatedConversation,
        { 
          role: 'assistant' as const, 
          content: '我明白您的意思了。您能告訴我更多關於這個問題的資訊嗎？',
          timestamp: replyTime,
          elapsedSeconds: replySeconds
        }
      ]);
    }, 1000);
  };
  
  const handleEndDialogue = () => {
    // 清除計時器
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    
    // 在實際應用中，這裡會儲存對話記錄到資料庫
    router.push('/dialogue/history');
  };
  
  const toggleListening = () => {
    setIsListening(!isListening);
  };
  
  const handleMicCheckComplete = (success: boolean) => {
    setMicCheckCompleted(true);
    // 如果麦克风检查成功，可以在這裡添加額外處理邏輯
  };
  
  // 组件卸载时清除计时器
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [timerInterval]);
  
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
        {/* 麥克風檢查頁面 */}
        {!micCheckCompleted ? (
          <div className="flex justify-center items-center py-8">
            <MicrophoneCheck onComplete={handleMicCheckComplete} />
          </div>
        ) : (
          // 原有的場景選擇和對話頁面
          !selectedScenario ? (
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
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">暫無可用場景</p>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">請聯絡管理員添加場景</p>
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
                  </div>
                  <div className="flex items-center space-x-4">
                    {/* 計時器顯示 - 更明顯的樣式 */}
                    <div className="bg-blue-100 dark:bg-blue-900 border-2 border-blue-500 dark:border-blue-400 px-4 py-2 rounded-md shadow-md">
                      <div className="text-lg font-mono font-bold text-blue-800 dark:text-blue-200 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {Math.floor(elapsedTime / 60).toString().padStart(2, '0')}:
                        {(elapsedTime % 60).toString().padStart(2, '0')}
                      </div>
                    </div>
                    <button 
                      onClick={handleEndDialogue}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors flex-shrink-0"
                    >
                      結束對話
                    </button>
                  </div>
                </div>
              </div>
              
              {/* 虛擬病人頭像區塊 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 flex justify-center">
                <div className="relative w-full max-w-md">
                  <Image
                    src="/image/virtualpatient.png"
                    alt="虛擬病人"
                    width={400}
                    height={400}
                    className="rounded-lg mx-auto"
                    priority
                  />
                  {isListening && (
                    <div className="absolute bottom-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm animate-pulse">
                      正在聆聽...
                    </div>
                  )}
                </div>
              </div>
              
              {/* 對話區域 - 確保顯示時間 */}
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
                        {msg.elapsedSeconds !== undefined && msg.role !== 'system' && (
                          <div className="text-xs mt-1 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded inline-block ml-auto text-gray-700 dark:text-gray-300 text-right">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {Math.floor(msg.elapsedSeconds / 60).toString().padStart(2, '0')}:
                            {(msg.elapsedSeconds % 60).toString().padStart(2, '0')}
                          </div>
                        )}
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
                    placeholder={isListening ? '正在聆聽...' : '輸入您的回應...'}
                    className={`flex-grow px-4 py-2 border ${
                      isListening 
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                        : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700'
                    } rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white`}
                    readOnly={isListening}
                  />
                  <button
                    onClick={toggleListening}
                    className={`px-4 py-2 ${
                      isListening 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-green-600 hover:bg-green-700'
                    } text-white font-medium rounded-md transition-colors`}
                    title={isListening ? '停止語音輸入' : '開始語音輸入'}
                  >
                    {isListening ? '🛑 停止' : '🎤 語音'}
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={isListening}
                    className={`px-4 py-2 ${
                      isListening 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    } text-white font-medium rounded-md transition-colors`}
                  >
                    發送
                  </button>
                </div>
                
                {/* 語音狀態指示器 */}
                {isListening && (
                  <div className="mt-2 text-sm text-green-600 dark:text-green-400 flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                    正在聆聽...說話時會自動檢測句子並發送
                  </div>
                )}
              </div>
            </div>
          )
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

// 修复全局声明
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}