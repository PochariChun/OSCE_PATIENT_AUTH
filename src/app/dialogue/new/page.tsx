// src/app/dialogue/new/page.tsx
'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '../../../components/navbar';
import Link from 'next/link';
import { MicrophoneCheck } from '@/components/dialogue/MicrophoneCheck';
import Image from 'next/image';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  nickname?: string; // Added optional nickname property
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

// 標準化名稱變體
const normalizeNames = (text: string): string => {
  // 將所有"小威"的變體統一為"小威"
  return text.replace(/小葳|小薇|曉薇|曉威|筱威|小為/g, '小威');
};
function normalizeMedicalTerms(text: string): string {
  const medicalCorrections: Record<string, string> = {
    '新間脈': '心尖脈',
    '新鮮賣': '心尖脈',
    'breat': 'BART',
    'brat': 'BART',
    'bart': 'BART',
    '真相': '跡象',
    '新間賣': '心尖脈',
    '心尖賣': '心尖脈',
    '新尖脈': '心尖脈',
    '心間脈': '心尖脈',
    '三腸瓣': '三尖瓣',
    '左心白': '左心房',
    '拉肚紙': '拉肚子',
    '抽經': '抽筋',
    '氣喘病': '氣喘',
    '寫詩': '血絲',
    'CC水水': '稀稀水水',
    '細細水水': '稀稀水水',
    '床頭塔': '床頭卡',
  };
  let normalized = text;
  for (const [incorrect, correct] of Object.entries(medicalCorrections)) {
    const regex = new RegExp(incorrect, 'g');
    normalized = normalized.replace(regex, correct);
  }
  return normalized;
}
// 創建一個包裝組件來使用 useSearchParams
function DialogueNewContent() {
  const [overlayText, setOverlayText] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioInfo | null>(null);
  const [conversation, setConversation] = useState<{ 
    role: 'nurse' | 'patient' | 'system'; 
    content: string;
    elapsedSeconds?: number;
    timestamp?: Date;
    tag?: string;
    audioUrl?: string;
    code?: string;
    answerType?: string;
  }[]>([]);
  const [message, setMessage] = useState('');
  const [micCheckCompleted, setMicCheckCompleted] = useState(false);
  const [scoredCodes, setScoredCodes] = useState<Set<string>>(new Set());

  const [isListening, setIsListening] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState<SpeechRecognition | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [lastSentenceEnd, setLastSentenceEnd] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [lastpatientmsgTime, setLastpatientmsgTime] = useState(0);
  const [lastTag, setLastTag] = useState('');
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [delayThreshold, setDelayThreshold] = useState(10);
  const [conversationId, setConversationId] = useState<number | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenarioCode = searchParams.get('scenario');
  
  const [isRecordButtonPressed, setIsRecordButtonPressed] = useState(false);
  
  const [isInitializingSpeech, setIsInitializingSpeech] = useState(false);
  
  const [lastRecognizedText, setLastRecognizedText] = useState('');
  
  const [startingDialogue, setStartingDialogue] = useState(false);
  
  const [previousTag, setPreviousTag] = useState<string | null>(null);
  
  // 添加音頻播放相關狀態
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [showPlayButton, setShowPlayButton] = useState(false);

  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const [lastAudioUrl, setLastAudioUrl] = useState<string | null>(null);

  const finalTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');
  const lastRecognizedTextRef = useRef('');


  useEffect(() => {
    const unlockAudioContext = () => {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (ctx.state === 'suspended') {
          ctx.resume().then(() => {
            console.log('🔓 AudioContext 已在首次互動中解鎖');
          });
        }
      } catch (e) {
        console.warn('⚠️ 解鎖 AudioContext 失敗', e);
      }
    };
  
    // 使用 once: true 確保只觸發一次
    window.addEventListener('click', unlockAudioContext, { once: true });
  
    return () => {
      window.removeEventListener('click', unlockAudioContext);
    };
  }, []);
  
  useEffect(() => {
    // 從 localStorage 獲取用戶信息
    const fetchUser = async () => {
      try {
        const userJson = localStorage.getItem('user');
        if (!userJson) {
          console.error('未登入，重定向到登入頁面');
          router.push('/login');
          return;
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
            const cleaned = normalizeMedicalTerms(normalizeNames(final));
            setFinalTranscript(prev => {
              const newText = prev + cleaned;
              finalTranscriptRef.current = newText; // ✅ 同步更新 ref
              return newText;
            });
            
            
            // 檢測句子結束（句號、問號、驚嘆號等）
            const sentenceEndRegex = /[。！？\.!?]/g;
            let match;
            while ((match = sentenceEndRegex.exec(final)) !== null) {
              if (match.index > lastSentenceEnd) {
                // 提取完整句子
                const sentence = final.substring(lastSentenceEnd, match.index + 1).trim();
                if (sentence) {
                  // 自動發送句子
                  sendMessageToServer(sentence);
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
  


  // 安全清理語音識別，僅當 component 卸載時用
  useEffect(() => {
    return () => {
      if (speechRecognition) {
        try {
          speechRecognition.stop();
          console.log('[unmount] 組件卸載時停止語音識別');
        } catch (e) {
          console.warn('[unmount] 停止失敗:', e);
        }
      }
    };
  }, []); // 👈 這裡不要有 speechRecognition 當依賴，否則會重新執行

  // 獲取場景資料
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
      const formattedScenarios = data.data.map((scenario: any) => ({
        id: scenario.id,
        title: scenario.title,
        description: scenario.description,
        scenarioCode: scenario.scenarioCode,
        patientInfo: scenario.patientName && scenario.patientAge && scenario.diagnosis
          ? `${scenario.patientName}，${scenario.patientAge}歲，${scenario.diagnosis}。${scenario.accompaniedBy ? `陪同者：${scenario.accompaniedBy}。` : ''}`
          : '', // 若沒有資料就給空字串
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
            role: user.role,
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
  
  // 添加一个函数来获取AI回覆
  const getAIResponse = async (
    message: string,
    previousTag?: string | null // 加上這個參數
  ) => {
    try {
      const response = await fetch('/api/ai-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          scenarioId: selectedScenario?.id,
          previousTag: previousTag,
        }),
      });

      // 錯誤獲取AI回覆
      if (!response.ok) {
        console.warn('AI 回覆失敗', await response.text());
        return {
          response: '抱歉，我暫時無法回答，請稍後再試。',
          tag: undefined,
          audioUrl: undefined,
          code: undefined,
          answerType: null,
        };
      }

      // 正常獲取AI回覆
      return await response.json();

    } catch (err) {
      console.error('呼叫 AI 回覆出錯:', err);

      // 錯誤獲取AI回覆
      return {
        response: '抱歉，出現錯誤，請稍後再試。',
        tag: undefined,
        audioUrl: undefined,
        code: undefined,
        answerType: null,
      };
    }
  };
  
  
  const sendMessageToServer = async (messageText: string) => {
    try {

      // 計算護理師回覆的時間
      let elapsedTimeNurse = elapsedTime;

      // 添加用户消息到对话
      const userMessage = {
        role: 'nurse' as const,
        content: messageText,
        elapsedSeconds: elapsedTime,
        timestamp: new Date()
      };

      // 先添加消息到對話，但時間戳和延遲稍後會更新
      setConversation(prev => [...prev, userMessage]);

      // 計算用户回覆的延遲
      const DelayFromPrev = elapsedTimeNurse - lastpatientmsgTime
      const IsDelayed = DelayFromPrev > delayThreshold;

      // =======================================================================
      // 获取AI回复
      const { response: aiResponseText, tag, audioUrl, code, answerType } = await getAIResponse(
      messageText, 
      lastTag // 這是 clientPreviousTag 對應的第三個參數
      );
      // =======================================================================

      // 音頻播放完成後，更新時間戳
      const replyTime = new Date();
      const replySeconds = startTime ? Math.floor((replyTime.getTime() - startTime.getTime()) / 1000) : 0;
      // 更新tag
      setLastTag(tag);

      // 保存最新的音频URL
      if (audioUrl && answerType === 'dialogue') {
        setLastAudioUrl(audioUrl);
      }
      
      // 在头像上显示回复文本
      setOverlayText(aiResponseText);


      let elapsedTimePatient = replySeconds;
      setLastpatientmsgTime(replySeconds);
      

      // 创建临时消息
      const tempAiMessage = {
        role: 'patient' as const,
        content: aiResponseText,
        elapsedSeconds: elapsedTimePatient,
        timestamp: new Date(),
      };
      
      

      
      

      
      // 先添加消息到對話
      setConversation(prev => [...prev, tempAiMessage]);
      
      // 如果有音頻URL，播放音頻
      if (audioUrl) {
        try {
          await playAudio(audioUrl);
        } catch (error) {
          console.error('播放音频失败:', error);
        }
      }
      
      // 設置一個定時器，在一段時間後清除頭像上的文本
      setTimeout(() => {
        setOverlayText(null);
      }, audioUrl ? 8000 : 5000); // 如果有音頻，顯示時間更長
      

      

      setDelayThreshold(10 + Math.floor(aiResponseText.length / 3));


      
 
      let scoringItems: string[] = [];
      if (code) {
        const codes: string[] = code.split(',').map((c: string) => c.trim());
        const newCodes = codes.filter((c: string) => !scoredCodes.has(c)); // ✅ 沒有紅線

        scoringItems = newCodes;

        if (newCodes.length > 0) {
          setScoredCodes(prev => new Set([...prev, ...newCodes]));
        }
      }
      // 計算患者回覆的時間
      console.log('患者回覆的時間replySeconds', replySeconds);
      console.log('患者回覆的時間elapsedTimePatient', elapsedTimePatient);
      console.log('上次患者回覆的時間lastpatientmsgTime', lastpatientmsgTime);
      console.log('護理師回覆的時間elapsedTimeNurse', elapsedTimeNurse);
      console.log('護理師回覆的時間-上次患者回覆的時間 DelayFromPrev', DelayFromPrev);
      console.log('護理師回覆延遲?IsDelayed', IsDelayed);
      console.log('得分項目scoringItems', scoringItems);

      // 保存用户消息到服务器
      if (conversationId) {
        const saveResponse = await fetch(`/api/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sender: 'nurse',
            content: messageText,
            elapsedSeconds: elapsedTimeNurse,
            delayFromPrev: DelayFromPrev,
            isDelayed: IsDelayed,
            tag: lastTag,
            scoringItems: scoringItems,  // <-- 用複數形式傳陣列
          }),
        });
        
        if (!saveResponse.ok) {
          console.error('保存用戶消息失敗:', saveResponse.statusText);
        }
      }

      // 更新助理消息
      const aiMessage = {
        ...tempAiMessage,
        elapsedSeconds: replySeconds,
        timestamp: replyTime
      };
      
      // 更新對話
      setConversation(prev => {
        const newConv = [...prev];
        newConv[newConv.length - 1] = aiMessage;
        return newConv;
      });
      
      // 保存AI回复到服务器
      if (conversationId) {
        const saveAiResponse = await fetch(`/api/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sender: 'patient',
            content: aiResponseText,
            elapsedSeconds: elapsedTimePatient,
            timestamp: replyTime.toISOString(),
            delayFromPrev: 0,
            isDelayed: false,
            tag: tag,
            audioUrl: audioUrl,
            scoringItems: scoringItems,  // <-- 用複數形式傳陣列

          }),
        });
        
        if (!saveAiResponse.ok) {
          console.error('保存AI回覆失敗:', saveAiResponse.statusText);
        }
      }
    } catch (error) {
      console.error('處理消息時出錯:', error);
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
  
  const handleEndDialogue = async () => {
    if (!conversationId) {
      console.error('無法結束對話：對話ID不存在');
      return;
    }
    
    console.log(`準備結束對話 ID: ${conversationId}`);
    
    // 停止計時器
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    
    try {
      console.log('發送結束對話請求...');
      const response = await fetch(`/api/conversations/${conversationId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user?.id,
          durationSec: elapsedTime
        }),
      });
      
      console.log(`結束對話請求回應狀態: ${response.status}`);
      
      if (!response.ok) {
        let errorMessage = `結束對話失敗: ${response.statusText}`;
        try {
          const errorText = await response.text();
          console.error('結束對話失敗:', {
            status: response.status,
            statusText: response.statusText,
            errorText
          });
          errorMessage += ` - ${errorText}`;
        } catch (e) {
          console.error('無法解析錯誤響應', e);
        }
        alert(errorMessage);
        return;
      }
      
      const data = await response.json();
      console.log('對話成功結束，返回資料:', data);
      
      // 保存最近的对话ID到localStorage，以便在护理记录页面使用
      localStorage.setItem('recentConversationId', conversationId.toString());
      
      // 重定向到护理记录页面，而不是直接到反思页面
      router.push(`/dialogue/note?id=${conversationId}`);
    } catch (error) {
      console.error('結束對話時發生錯誤:', error);
      alert(`結束對話時發生錯誤: ${(error as Error).message}`);
    }
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
        // 跳過 HMR 請求
        if (typeof url === 'string' && url.includes('hot-update')) {
          return originalFetch.apply(this, args);
        }
        // 打印請求詳細信息 
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
  
  // 在組件卸載時清理音頻
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const createNewRecognition = () => {
    // 創建新的識別實例
    const RecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new RecognitionClass();

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
          // console.log('識別到臨時文本:', interimText);
          setInterimTranscript(interimText);
          interimTranscriptRef.current = interimText; // ✅ 加這行
        }
        
        
        if (finalText) {
          // console.log('識別到最終文本:', finalText);
          // 標準化名稱
          const cleaned = normalizeMedicalTerms(normalizeNames(finalText));
          // console.log('標準化後的文本:', cleaneㄋd);
          
          // 將最終文本添加到 finalTranscript 中，而不是替換它
          // React 的 setXxx() 是非同步的，所以需要使用 prev 來更新
          setInterimTranscript('');
          interimTranscriptRef.current = '';
          

          setFinalTranscript(prev => {
            const newText = prev + cleaned;
            finalTranscriptRef.current = newText; // ✅ 更新 ref
            // console.log('更新最終文本為:', newText);
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
      
    //   // 處理結束
    //  recognition.onend= () => {
    //     console.log('語音識別會話結束');
        
    //     // 如果用戶仍在按住按鈕，自動重啟識別
    //     if (isRecordButtonPressed) {
    //       try {
    //         recognition.start();
    //         console.log('自動重啟語音識別');
    //       } catch (e) {
    //         console.error('重啟語音識別失敗:', e);
    //         setIsListening(false);
    //       }
    //     } else {
    //       setIsListening(false);
    //     }
        
    //     setIsInitializingSpeech(false);
    // };
    recognition.onend = () => {
      console.log('語音識別會話結束');
    
      const textToSend =
      finalTranscriptRef.current ||
      interimTranscriptRef.current ||
      lastRecognizedTextRef.current;
        
      if (textToSend) {
        console.log('[onend] 發送識別文本:', textToSend);
        sendMessageToServer(textToSend);
      } else {
        console.log('[onend] 沒有識別到文本，不發送');
      }
    
      // 清空所有暫存
      setFinalTranscript('');
      finalTranscriptRef.current = '';
      setInterimTranscript('');
      interimTranscriptRef.current = '';
      setLastRecognizedText('');
      lastRecognizedTextRef.current = '';

      
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
    
  
    recognition.start();
    setSpeechRecognition(recognition);
    setIsListening(true);
    setIsInitializingSpeech(false);
    console.log('[createNewRecognition] 語音識別已啟動');
  };
  
  const startRecording = () => {
    
    // 如果已經在錄音，不做任何事
    if (isListening || isInitializingSpeech) {
      console.log('已經在錄音中或正在初始化，忽略此次請求');
      return;
    }
    
    setIsInitializingSpeech(true); // 標記正在初始化
    setInterimTranscript('');    // 清空臨時文本，但不清空最終文本

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

      if (speechRecognition && isListening) {
        console.log('正在錄音中，先停止舊的實例');
        speechRecognition.onend = () => {
          console.log('舊實例已停止，開始新的語音識別');
          createNewRecognition(); // 自己抽出一個新函式來創建
        };
        speechRecognition.stop();
      } else {      
        console.log('開始錄音...');
        createNewRecognition();
      }     
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
    
    // // 保存當前的臨時文本和最終文本，以防在停止過程中丟失
    // const currentInterimTranscript = interimTranscript;
    // const currentFinalTranscript = finalTranscript;
    // const currentLastRecognizedText = lastRecognizedText;
    
    // console.log('停止錄音時的最終文本:', currentFinalTranscript);
    // console.log('停止錄音時的臨時文本:', currentInterimTranscript);
    // console.log('停止錄音時的最後識別文本:', currentLastRecognizedText);
    
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

  const handleStartDialogue = async () => {
    if (!selectedScenario) {
      alert('請先選擇一個場景');
      return;
    }
    
    setStartingDialogue(true);
    
    try {
      console.log('開始創建對話，場景ID:', selectedScenario.id);
      
      // 確保用戶已登入
      if (!user) {
        console.error('用戶未登入');
        router.push('/login');
        return;
      }
      
      // 創建新對話，使用用戶的角色
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          scenarioId: selectedScenario.id,
          role: user.role?.toUpperCase() || 'NURSE', // 使用用戶的角色，轉為大寫，如果沒有則使用預設值
        }),
      });
      
      console.log('創建對話請求響應狀態:', response.status);
      
      if (!response.ok) {
        let errorMessage = `創建對話失敗: ${response.statusText}`;
        try {
          const errorData = await response.json();
          console.error('創建對話失敗', {
            status: response.status,
            statusText: response.statusText,
            errorData
          });
          if (errorData.details) {
            errorMessage += ` - ${errorData.details}`;
          }
        } catch (e) {
          console.error('無法解析錯誤響應', e);
        }
        alert(errorMessage);
        return;
      }
      
      const data = await response.json();
      console.log('對話創建成功，返回數據:', data);
      
      // 保存對話ID
      setConversationId(data.id);
      
      // 添加系統消息
      const systemMessage = {
        role: 'system' as const,
        content: `場景：${selectedScenario.title}\n\n${selectedScenario.description}`,
      };
      
      setConversation([systemMessage]);
      
      // 開始計時
      setStartTime(new Date());
      setElapsedTime(0);
      const interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
      setTimerInterval(interval);
      
      // 切換到對話界面
      setStartingDialogue(false);
    } catch (error) {
      console.error('創建對話時發生錯誤:', error);
      alert(`創建對話失敗: ${(error as Error).message}`);
    } finally {
      setStartingDialogue(false);
    }
  };

  // 添加 handleSendMessage 函数
  const handleSendMessage = () => {
    if (!message.trim() || !conversationId) return;
    
    // 标准化名称
    const normalizedMessage = normalizeNames(message);
    
    // 发送消息并清空输入框
    sendMessageToServer(normalizedMessage);
    setMessage('');
  };

  // 修改音频播放逻辑，确保在移动设备上也能正常工作
  const playAudio = async (audioUrl: string) => {
    if (!audioUrl) return;
  
    try {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      await audio.play(); // 不會再被拒絕（如果 AudioContext 已解鎖）
      setIsAudioPlaying(true);
      setShowPlayButton(false);
    } catch (e) {
      console.warn('❌ 自動播放失敗:', e);
      setShowPlayButton(true);
    }
  };
  
  // 添加手动解锁音频的函数
  const handleManualAudioUnlock = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      ctx.resume().then(() => {
        console.log("🔓 使用者主動解鎖 AudioContext");
        setIsAudioUnlocked(true);
        
        // 如果有最新的音频URL，尝试播放
        if (lastAudioUrl) {
          playAudio(lastAudioUrl);
          // 播放后清除，确保只播放一次
          setLastAudioUrl(null);
        }
      });
    } catch (e) {
      console.error("❌ Audio 解鎖失敗", e);
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

                      
                      <button
                        className="mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md shadow transition duration-200 w-full"
                      >
                        點我進入對話場景
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </button>

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
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-1">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-3">
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
                      結束評估, 開始紀錄 
                    </button>
                  </div>
                    
                </div>
                {/* 解說區塊 */}
                <div className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 rounded-lg shadow-md p-2 mb-1 max-w-3xl mx-auto">
                      <h2 className="text-lg font-semibold mb-2">📌 使用說明</h2>
                      <ul className="list-disc list-inside space-y-1 text-sm leading-relaxed">
                        <li>點擊虛擬病人頭像即可開始說話，放開就會送出對話內容。</li>
                        <li>錄音中將顯示「正在錄音...」, 圖像正上方顯示灰色即時辨識文字。</li>
                        <li>請一次只說一句完整的問題或指令，系統將自動辨識並回應。</li>
                        <li>對話結束後，請點選「結束評估，開始紀錄」按鈕結束和病人對話, 開始寫護理記錄。</li>
                      </ul>
                  </div>
              </div>
              {/* {Array.from(scoredCodes).length > 0 && (
                <div className="mt-4 mb-6 text-center text-sm text-green-700 dark:text-green-200">
                  <strong>🎯 已得分：</strong>
                  <div className="mt-2 inline-flex flex-wrap justify-center gap-2">
                    {Array.from(scoredCodes).map(code => (
                      <span 
                        key={code}
                        className="inline-block bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 px-2 py-1 rounded text-xs"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )} */}

              {/* 虛擬病人頭像區塊 - 添加点击功能并防止长按下载 */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6 flex justify-center">
                <div 
                  className="relative w-full max-w-md cursor-pointer select-none" 
                  onMouseDown={handleRecordButtonMouseDown}
                  onMouseUp={handleRecordButtonMouseUp}
                  onMouseLeave={isRecordButtonPressed ? handleRecordButtonMouseUp : undefined}
                  onTouchStart={(e) => {
                    e.preventDefault(); // 防止默认行为
                    handleRecordButtonTouchStart(e);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault(); // 防止默认行为
                    handleRecordButtonTouchEnd(e);
                  }}
                  onContextMenu={(e) => e.preventDefault()} // 防止右键菜单
                > 
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
                  {overlayText && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                      <div className="bg-gray-800 bg-opacity-70 text-white p-4 rounded-lg max-w-[90%] text-center">
                        {overlayText}
                      </div>
                    </div>
                  )}
                  <Image
                    src="/image/virtualpatient.png"
                    alt="虛擬病人"
                    width={400}
                    height={400}
                    className="rounded-lg mx-auto pointer-events-none" // 禁用图片的指针事件
                    priority
                    draggable="false" // 禁止拖拽
                    style={{ WebkitTouchCallout: 'none' }} // 禁止iOS长按呼出菜单
                  />
                  {isListening && (
                    <div className="absolute top-14 left-0 right-0 mx-auto w-fit text-center bg-red-500 text-white px-3 py-1 rounded-b-lg text-sm animate-pulse">
                    正在聆聽...
                  </div>
                  
                  )}
                  {/* 添加提示信息 */}
                  <div className="absolute bottom-2 left-0 right-0 text-center bg-yellow-200 text-gray-800 font-semibold py-2 px-4 rounded-b-lg animate-bounce shadow pointer-events-none">
                    👉 點擊圖片開始說話
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
                    placeholder="按住麥克風或圖片說話..."
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
                
                
                
                {/* 对话显示区域 - 移到输入区域下方 */}
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {conversation.map((msg, index) => (
                    <div 
                      key={index} 
                      className={`flex ${msg.role === 'nurse' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.role === 'nurse'
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100' 
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        <p>{msg.content}</p>
                        {msg.audioUrl && (
                          <div className="mt-2">
                            {showPlayButton ? (
                              <button 
                                onClick={() => audioRef.current?.play()} 
                                className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm"
                              >
                                播放語音
                              </button>
                            ) : (
                              <audio 
                                ref={(el) => {
                                  if (el) audioRef.current = el;
                                }}
                                src={msg.audioUrl}
                                className="w-full"
                                controls={false}
                              />
                            )}
                          </div>
                        )}
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

// 主页面组件
export default function DialogueNewPage() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <DialogueNewContent />
    </Suspense>
  );
}

