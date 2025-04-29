'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '../../../components/navbar';
import Link from 'next/link';
import { MicrophoneCheck } from '@/components/MicrophoneCheck';
import Image from 'next/image';
import { normalizeNames } from '@/lib/textUtils'; // 導入共用函數，而不是在本地定義

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
  
  const [conversationId, setConversationId] = useState<number | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenarioCode = searchParams.get('scenario');
  
  const [isRecordButtonPressed, setIsRecordButtonPressed] = useState(false);
  
  const [isInitializingSpeech, setIsInitializingSpeech] = useState(false);
  
  const [lastRecognizedText, setLastRecognizedText] = useState('');
  
  useEffect(() => {
    // 從 localStorage 獲取用戶信息
    const fetchUser = async () => {
      try {
        const userJson = localStorage.getItem('user');
        if (!userJson) {
          console.error('未登入，重定向到登入頁面');
          throw new Error('未登入');
        }
        
        const userData = JSON.parse(userJson);
        console.log('已獲取用戶資料:', userData);
        setUser(userData);
        
        // 獲取場景數據
        await fetchScenarios();
      } catch (error) {
        console.error('獲取用戶信息失敗', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
  }, [router]);
  
  useEffect(() => {
    // 只在 micCheckCompleted 為 true 且沒有現有的 speechRecognition 實例時初始化
    if (micCheckCompleted && typeof window !== 'undefined' && !speechRecognition) {
      console.log('初始化語音識別功能');
      
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
            // 標準化名稱
            const normalizedText = normalizeNames(final);
            setFinalTranscript(normalizedText);
            
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
  }, [micCheckCompleted, speechRecognition]);
  
  useEffect(() => {
    // 移除這裡的啟動邏輯，只保留停止邏輯
    if (speechRecognition && !isListening) {
      try {
        speechRecognition.stop();
        console.log('通過 useEffect 停止語音識別');
        // 重置語音識別相關狀態
        setInterimTranscript('');
        setLastSentenceEnd(0);
        setMessage('');
      } catch (error) {
        console.log('停止語音識別時發生錯誤', error);
      }
    }
    
    return () => {
      // 組件卸載時停止語音識別
      if (speechRecognition) {
        try {
          speechRecognition.stop();
          console.log('組件卸載時停止語音識別');
        } catch (e) {
          // 忽略錯誤
        }
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
  
  const handleScenarioSelect = async (scenarioCode: string) => {
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
      
      // 添加日誌以追蹤執行流程
      console.log('準備創建新對話，場景ID:', scenario.id, '用戶ID:', user?.id);
      
      // 创建新的会话记录
      try {
        // 確保用戶ID存在
        if (!user?.id) {
          console.error('用戶ID不存在，無法創建對話');
          return;
        }
        
        const response = await fetch('/api/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            scenarioId: scenario.id,
            role: '考生',
            prompt: '開始對話',
            response: '請開始與虛擬病人對話',
            topic: scenario.title,
            triggerType: '系統',
            orderIndex: 0
          }),
        });
        
        console.log('對話創建請求已發送，狀態碼:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('創建會話失敗', {
            status: response.status,
            statusText: response.statusText,
            errorData
          });
          
          // 顯示錯誤訊息給用戶
          alert(`創建對話失敗: ${response.statusText}`);
        } else {
          const data = await response.json();
          console.log('會話創建成功，ID:', data.id);
          setConversationId(data.id);
        }
      } catch (error) {
        console.error('創建會話時發生錯誤', error);
        // 顯示錯誤訊息給用戶
        alert(`創建對話時發生錯誤: ${(error as Error).message}`);
      }
    }
  };
  
  // 添加一个函数来获取AI回复
  const getAIResponse = async (userMessage: string, conversationHistory: any[]) => {
    try {
      console.log('发送请求到 AI 回复服务...');
      
      const response = await fetch('/api/ai-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          history: conversationHistory,
          scenarioId: selectedScenario?.id
        }),
      });
      
      console.log('收到 AI 回复服务响应，状态码:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI 回复服务返回错误:', {
          status: response.status,
          statusText: response.statusText,
          errorText
        });
        throw new Error(`获取AI回复失败: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('成功解析 AI 回复:', data);
      
      return data.response;
    } catch (error) {
      console.error('获取AI回复时发生错误:', error);
      // 返回一个友好的错误消息
      return '抱歉，我现在无法回答您的问题。请稍后再试。';
    }
  };
  
  // 修改handleSendVoiceMessage和sendMessageToServer函数
  const handleSendVoiceMessage = async (voiceMessage: string) => {
    if (!voiceMessage.trim() || !conversationId) return;
    
    const now = new Date();
    const seconds = startTime ? Math.floor((now.getTime() - startTime.getTime()) / 1000) : 0;
    
    // 計算與上一條消息的延遲
    let delayFromPrev = 0;
    let isDelayed = false;
    const lastMessage = conversation.filter(msg => msg.role !== 'system').pop();
    
    if (lastMessage && lastMessage.timestamp) {
      delayFromPrev = Math.floor((now.getTime() - lastMessage.timestamp.getTime()) / 1000);
      isDelayed = delayFromPrev > 10;
    }
    
    // 添加用戶訊息到對話
    const userMessage = { 
      role: 'user' as const, 
      content: voiceMessage,
      timestamp: now,
      elapsedSeconds: seconds
    };
    
    const updatedConversation = [...conversation, userMessage];
    setConversation(updatedConversation);
    
    // 保存用戶消息到數據庫
    try {
      const apiUrl = `/api/conversations/${conversationId}/messages`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messages: [
            {
              sender: 'user',
              text: voiceMessage,
              timestamp: now.toISOString(),
              elapsedSeconds: seconds,
              delayFromPrev,
              isDelayed
            }
          ] 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('保存用戶訊息失敗', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
      } else {
        const data = await response.json();
        console.log('用戶訊息保存成功', data);
      }
    } catch (error) {
      console.error('保存用戶訊息時發生錯誤', error);
    }
    
    // 获取AI回复
    const aiResponse = await getAIResponse(voiceMessage, conversation);
    
    const replyTime = new Date();
    const replySeconds = startTime ? Math.floor((replyTime.getTime() - startTime.getTime()) / 1000) : 0;
    
    const assistantMessage = { 
      role: 'assistant' as const, 
      content: aiResponse,
      timestamp: replyTime,
      elapsedSeconds: replySeconds
    };
    
    setConversation([...updatedConversation, assistantMessage]);
    
    // 計算虛擬病人回覆的延遲
    const patientDelayFromPrev = Math.floor((replyTime.getTime() - now.getTime()) / 1000);
    const patientIsDelayed = patientDelayFromPrev > 3;
    
    // 保存虛擬病人消息到數據庫
    try {
      const apiUrl = `/api/conversations/${conversationId}/messages`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messages: [
            {
              sender: 'patient',
              text: assistantMessage.content,
              timestamp: replyTime.toISOString(),
              elapsedSeconds: replySeconds,
              delayFromPrev: patientDelayFromPrev,
              isDelayed: patientIsDelayed
            }
          ] 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('保存虛擬病人訊息失敗', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
      } else {
        const data = await response.json();
        console.log('虛擬病人訊息保存成功', data);
      }
    } catch (error) {
      console.error('保存虛擬病人訊息時發生錯誤', error);
    }
  };
  
  const sendMessageToServer = async (messageText: string) => {
    if (!messageText.trim() || !conversationId) return;
    
    const now = new Date();
    const seconds = startTime ? Math.floor((now.getTime() - startTime.getTime()) / 1000) : 0;
    
    // 計算與上一條消息的延遲
    let delayFromPrev = 0;
    let isDelayed = false;
    const lastMessage = conversation.filter(msg => msg.role !== 'system').pop();
    
    if (lastMessage && lastMessage.timestamp) {
      delayFromPrev = Math.floor((now.getTime() - lastMessage.timestamp.getTime()) / 1000);
      isDelayed = delayFromPrev > 10;
    }
    
    // 添加用戶訊息到對話
    const userMessage = {
      role: 'user' as const,
      content: messageText,
      timestamp: now,
      elapsedSeconds: seconds
    };
    
    const updatedConversation = [...conversation, userMessage];
    setConversation(updatedConversation);
    
    // 保存用戶消息到數據庫
    try {
      const apiUrl = `/api/conversations/${conversationId}/messages`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messages: [
            {
              sender: 'user',
              text: messageText,
              timestamp: now.toISOString(),
              elapsedSeconds: seconds,
              delayFromPrev,
              isDelayed
            }
          ] 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('保存用戶訊息失敗', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
      } else {
        const data = await response.json();
        console.log('用戶訊息保存成功', data);
      }
    } catch (error) {
      console.error('保存用戶訊息時發生錯誤', error);
    }
    
    // 获取AI回复
    const aiResponse = await getAIResponse(messageText, conversation);
    
    const replyTime = new Date();
    const replySeconds = startTime ? Math.floor((replyTime.getTime() - startTime.getTime()) / 1000) : 0;
    
    const assistantMessage = { 
      role: 'assistant' as const, 
      content: aiResponse,
      timestamp: replyTime,
      elapsedSeconds: replySeconds
    };
    
    setConversation([...updatedConversation, assistantMessage]);
    
    // 計算虛擬病人回覆的延遲
    const patientDelayFromPrev = Math.floor((replyTime.getTime() - now.getTime()) / 1000);
    const patientIsDelayed = patientDelayFromPrev > 3;
    
    // 保存虛擬病人消息到數據庫
    try {
      const apiUrl = `/api/conversations/${conversationId}/messages`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          messages: [
            {
              sender: 'patient',
              text: assistantMessage.content,
              timestamp: replyTime.toISOString(),
              elapsedSeconds: replySeconds,
              delayFromPrev: patientDelayFromPrev,
              isDelayed: patientIsDelayed
            }
          ] 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('保存虛擬病人訊息失敗', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
      } else {
        const data = await response.json();
        console.log('虛擬病人訊息保存成功', data);
      }
    } catch (error) {
      console.error('保存虛擬病人訊息時發生錯誤', error);
    }
  };
  
  const handleSendMessage = () => {
    if (!message.trim()) return;
    
    // 標準化名稱
    const normalizedMessage = normalizeNames(message.trim());
    
    // 发送消息到服务器
    sendMessageToServer(normalizedMessage);
    
    // 清空输入框
    setMessage('');
    setInterimTranscript('');
  };
  
  const handleEndDialogue = async () => {
    // 清除計時器
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    
    if (conversationId) {
      console.log('準備更新對話結束時間，對話ID:', conversationId);
      
      try {
        const response = await fetch(`/api/conversations/${conversationId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            endedAt: new Date().toISOString(),
            durationSec: elapsedTime,
            overtime: elapsedTime > 600, // 10分钟 = 600秒
          }),
        });
        
        console.log('對話結束時間更新請求已發送，狀態碼:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('更新對話結束時間失敗', {
            status: response.status,
            statusText: response.statusText,
            errorData
          });
        } else {
          console.log('對話結束時間更新成功');
          
          // 添加評分請求
          try {
            console.log('開始對對話進行評分...');
            const scoreResponse = await fetch(`/api/conversations/${conversationId}/score`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              }
            });
            
            if (scoreResponse.ok) {
              const scoreResult = await scoreResponse.json();
              console.log('對話評分成功，分數:', scoreResult.score);
            } else {
              console.error('對話評分失敗:', scoreResponse.status, scoreResponse.statusText);
            }
          } catch (scoreError) {
            console.error('評分過程中發生錯誤:', scoreError);
          }
          
          // 導向到反思頁面，而不是歷史頁面
          router.push(`/dialogue/reflection/${conversationId}`);
          return; // 提前返回，避免執行後面的歷史頁面導向
        }
      } catch (error) {
        console.error('更新對話結束時間失敗', error);
      }
    } else {
      console.warn('無法更新對話結束時間：對話ID不存在');
    }
    
    // 如果上面的過程出錯，則回退到歷史頁面
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
  
  // 添加網絡請求監控
  useEffect(() => {
    // 只在開發環境中啟用
    if (process.env.NODE_ENV === 'development') {
      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        const [url, options] = args;
        console.log(`🌐 發送請求: ${options?.method || 'GET'} ${url}`, options?.body ? JSON.parse(options.body as string) : '');
        
        try {
          const response = await originalFetch.apply(this, args);
          console.log(`✅ 請求成功: ${options?.method || 'GET'} ${url}`, response.status);
          return response;
        } catch (error) {
          console.error(`❌ 請求失敗: ${options?.method || 'GET'} ${url}`, error);
          throw error;
        }
      };
      
      return () => {
        window.fetch = originalFetch;
      };
    }
  }, []);
  
  const startRecording = () => {
    console.log('開始錄音...');
    
    // 如果已經在錄音，不做任何事
    if (isListening || isInitializingSpeech) {
      console.log('已經在錄音中或正在初始化，忽略此次請求');
      return;
    }
    
    setIsInitializingSpeech(true); // 標記正在初始化
    
    // 清空臨時文本，但不清空最終文本
    setInterimTranscript('');
    
    // 檢查瀏覽器支持
    if (typeof window === 'undefined') {
      setIsInitializingSpeech(false);
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('您的瀏覽器不支持語音識別');
      alert('您的瀏覽器不支持語音識別功能，請使用 Chrome、Edge 或 Safari 瀏覽器。');
      setIsRecordButtonPressed(false);
      setIsInitializingSpeech(false);
      return;
    }
    
    try {
      // 如果已經有一個語音識別實例在運行，先停止它
      if (speechRecognition) {
        try {
          speechRecognition.stop();
          console.log('停止現有語音識別實例');
        } catch (e) {
          console.error('停止現有語音識別實例失敗:', e);
        }
      }
      
      // 創建新的識別實例
      const recognition = new SpeechRecognition();
      recognition.lang = 'zh-TW'; // 設置為繁體中文
      recognition.interimResults = true; // 獲取臨時結果
      recognition.continuous = true; // 改為連續識別模式
      
      // 處理結果
      recognition.onresult = (event) => {
        let interimText = '';
        let finalText = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += transcript;
          } else {
            interimText += transcript;
          }
        }
        
        if (interimText) {
          console.log('識別到臨時文本:', interimText);
          setInterimTranscript(interimText);
        }
        
        if (finalText) {
          console.log('識別到最終文本:', finalText);
          // 標準化名稱
          const normalizedText = normalizeNames(finalText);
          console.log('標準化後的文本:', normalizedText);
          
          // 將最終文本添加到 finalTranscript 中，而不是替換它
          setInterimTranscript('');
          setFinalTranscript(prev => {
            const newText = prev + normalizedText;
            console.log('更新最終文本為:', newText);
            return newText;
          });
        }
      };
      
      // 處理錯誤
      recognition.onerror = (event) => {
        console.log(`語音識別錯誤: ${event.error || '未知錯誤'}`);
        setIsListening(false);
        setIsRecordButtonPressed(false);
        setIsInitializingSpeech(false);
      };
      
      // 處理結束
      recognition.onend = () => {
        console.log('語音識別會話結束');
        
        // 如果用戶仍在按住按鈕，自動重啟識別
        if (isRecordButtonPressed) {
          try {
            recognition.start();
            console.log('自動重啟語音識別');
          } catch (e) {
            console.error('重啟語音識別失敗:', e);
            setIsListening(false);
          }
        } else {
          setIsListening(false);
        }
        
        setIsInitializingSpeech(false);
      };
      
      // 啟動識別
      recognition.start();
      setSpeechRecognition(recognition);
      setIsListening(true);
      console.log('語音識別已啟動');
      setIsInitializingSpeech(false);
    } catch (error) {
      console.error('啟動語音識別失敗:', error);
      setIsListening(false);
      setIsRecordButtonPressed(false);
      setIsInitializingSpeech(false);
      alert('啟動語音識別失敗，請刷新頁面重試。');
    }
  };

  const stopRecording = () => {
    console.log('停止錄音...');
    
    // 保存當前的臨時文本和最終文本，以防在停止過程中丟失
    const currentInterimTranscript = interimTranscript;
    const currentFinalTranscript = finalTranscript;
    const currentLastRecognizedText = lastRecognizedText;
    
    console.log('停止錄音時的最終文本:', currentFinalTranscript);
    console.log('停止錄音時的臨時文本:', currentInterimTranscript);
    console.log('停止錄音時的最後識別文本:', currentLastRecognizedText);
    
    // 如果沒有在錄音，不做任何事
    if (!isListening && !speechRecognition) {
      console.log('沒有正在進行的錄音，忽略此次請求');
      setIsRecordButtonPressed(false);
      return;
    }
    
    // 停止語音識別
    if (speechRecognition) {
      try {
        speechRecognition.stop();
        console.log('語音識別已停止');
      } catch (e) {
        console.error('停止語音識別失敗:', e);
      }
    }
    
    setIsListening(false);
    
    // 增加更長的延遲，確保最終文本已更新
    setTimeout(() => {
      // 檢查是否有文本可以發送
      const textToSend = currentFinalTranscript || currentInterimTranscript || currentLastRecognizedText;
      
      if (textToSend) {
        console.log('發送識別文本:', textToSend);
        sendMessageToServer(textToSend);
        
        // 清空所有文本
        setFinalTranscript('');
        setInterimTranscript('');
        setLastRecognizedText('');
      } else {
        console.log('沒有識別到文本，不發送消息');
      }
    }, 300);
  };

  // 修改按鈕事件處理函數
  const handleRecordButtonMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isInitializingSpeech || isListening) return; // 防止重複啟動
    
    console.log('按下錄音按鈕');
    setIsRecordButtonPressed(true);
    
    // 設置開始時間
    if (!startTime) {
      setStartTime(new Date());
      
      // 啟動計時器
      const interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      
      setTimerInterval(interval);
    }
    
    startRecording();
  };

  // 添加回被刪除的 handleRecordButtonMouseUp 函數
  const handleRecordButtonMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('釋放錄音按鈕');
    setIsRecordButtonPressed(false);
    stopRecording();
  };

  // 觸摸事件處理函數
  const handleRecordButtonTouchStart = (e: React.TouchEvent) => {
    e.preventDefault(); // 防止觸摸事件觸發滑鼠事件
    if (isInitializingSpeech || isListening) return; // 防止重複啟動
    
    console.log('觸摸開始錄音按鈕');
    setIsRecordButtonPressed(true);
    
    // 設置開始時間
    if (!startTime) {
      setStartTime(new Date());
      
      // 啟動計時器
      const interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      
      setTimerInterval(interval);
    }
    
    startRecording();
  };

  const handleRecordButtonTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    console.log('觸摸結束錄音按鈕');
    setIsRecordButtonPressed(false);
    stopRecording();
  };
  
  // 只在特定條件下執行，並且添加額外的檢查
  useEffect(() => {
    if (selectedScenario && !isListening && !isInitializingSpeech && !speechRecognition) {
      // 可能的其他操作，但不要自動啟動語音識別
      console.log('場景已選擇，但不自動啟動語音識別');
    }
  }, [selectedScenario, isListening, isInitializingSpeech, speechRecognition]);

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
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedScenario?.title || '新對話'}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {selectedScenario?.description || '請選擇一個場景開始對話'}
                    </p>
                  </div>
                  
                  <div className="flex flex-row justify-between items-center gap-3 w-full sm:w-auto">
                    {/* 計時器顯示 */}
                    <div className="bg-blue-100 dark:bg-blue-900 border-2 border-blue-500 dark:border-blue-400 px-4 py-2 rounded-md shadow-md flex-1 sm:flex-none">
                      <div className="text-lg font-mono font-bold text-blue-800 dark:text-blue-200 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {Math.floor(elapsedTime / 60).toString().padStart(2, '0')}:
                        {(elapsedTime % 60).toString().padStart(2, '0')}
                      </div>
                    </div>
                    
                    <button 
                      onClick={handleEndDialogue}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors flex-1 sm:flex-none"
                    >
                      結束對話
                    </button>
                  </div>
                </div>
              </div>
              
              {/* 虛擬病人頭像區塊 - 添加点击功能并防止长按下载 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 flex justify-center">
                <div 
                  className="relative w-full max-w-md cursor-pointer select-none" 
                  onMouseDown={handleRecordButtonMouseDown}
                  onMouseUp={handleRecordButtonMouseUp}
                  onMouseLeave={isRecordButtonPressed ? handleRecordButtonMouseUp : undefined}
                  onTouchStart={(e) => {
                    e.preventDefault(); // 防止預設行為
                    handleRecordButtonTouchStart(e);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault(); // 防止預設行為
                    handleRecordButtonTouchEnd(e);
                  }}
                  onContextMenu={(e) => e.preventDefault()} // 防止右键菜单
                >
                  <Image
                    src="/image/virtualpatient.png"
                    alt="虛擬病人"
                    width={400}
                    height={400}
                    className="rounded-lg mx-auto pointer-events-none" // 禁用圖片的指針事件
                    priority
                    draggable="false" // 禁止拖拽
                    style={{ WebkitTouchCallout: 'none' }} // 禁止iOS長按呼出選單
                  />
                  {isListening && (
                    <div className="absolute bottom-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm animate-pulse">
                      正在聆聽...
                    </div>
                  )}
                  {/* 添加提示信息 */}
                  <div className="absolute bottom-2 left-0 right-0 text-center text-white bg-black bg-opacity-50 py-1 rounded-b-lg pointer-events-none">
                    點擊頭像開始錄音
                  </div>
                </div>
              </div>
              
              {/* 對話區域 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                {/* 輸入區域 */}
                <div className="flex items-center space-x-2 mb-4">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="輸入訊息或按住麥克風說話..."
                    className="flex-grow px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                  />
                  
                  {/* 錄音按鈕 */}
                  <button
                    onMouseDown={handleRecordButtonMouseDown}
                    onMouseUp={handleRecordButtonMouseUp}
                    onMouseLeave={isRecordButtonPressed ? handleRecordButtonMouseUp : undefined}
                    onTouchStart={handleRecordButtonTouchStart}
                    onTouchEnd={handleRecordButtonTouchEnd}
                    className={`p-3 rounded-full transition-all duration-200 ${
                      isRecordButtonPressed 
                        ? 'bg-red-600 scale-110' 
                        : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                    aria-label="按住說話"
                  >
                    <div className="relative">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24" 
                        fill="currentColor" 
                        className={`w-6 h-6 ${isRecordButtonPressed ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}
                      >
                        <path d="M12 16c2.206 0 4-1.794 4-4V6c0-2.217-1.785-4.021-3.979-4.021a.933.933 0 0 0-.209.025A4.006 4.006 0 0 0 8 6v6c0 2.206 1.794 4 4 4z" />
                        <path d="M11 19.931V22h2v-2.069c3.939-.495 7-3.858 7-7.931h-2c0 3.309-2.691 6-6 6s-6-2.691-6-6H4c0 4.072 3.061 7.436 7 7.931z" />
                      </svg>
                      
                      {isRecordButtonPressed && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                      )}
                    </div>
                  </button>
                </div>
                
                {/* 語音識別狀態 */}
                {isListening && (
                  <div className="mb-4 text-center">
                    <span className="inline-flex items-center text-sm text-red-500">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></span>
                      正在錄音...
                    </span>
                    {interimTranscript && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 italic">
                        {interimTranscript}...
                      </p>
                    )}
                  </div>
                )}
                
                {/* 對話顯示區域 - 移到輸入區域下方 */}
                <div className="space-y-4 max-h-96 overflow-y-auto">
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