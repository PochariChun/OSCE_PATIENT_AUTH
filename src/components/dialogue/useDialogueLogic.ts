// src/components/dialogue/useDialogueLogic.ts
import { useState, useEffect, useRef } from 'react';
import { ScenarioInfo } from '@/types';

export interface Message {
  role: 'nurse' | 'patient' | 'system';
  content: string;
  elapsedSeconds?: number;
  audioUrl?: string;
  code?: string;
  answerType?: string;
}

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
  return text.replace(/小葳|小薇|曉薇|曉威|筱威|小葳/g, '小威');
};

export default function useDialogueLogic(scenario: ScenarioInfo) {
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
  const [micCheckCompleted, setMicCheckCompleted] = useState(false);

  const [speechRecognition, setSpeechRecognition] = useState<SpeechRecognition | null>(null);
  const [lastSentenceEnd, setLastSentenceEnd] = useState(0);

  const [conversationId, setConversationId] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [lastpatientmsgTime, setLastpatientmsgTime] = useState<number>(0);
  const [lastTag, setLastTag] = useState<string | null>(null);
  const [lastAudioUrl, setLastAudioUrl] = useState<string | null>(null);
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [delayThreshold, setDelayThreshold] = useState<number>(10);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenarioCode = searchParams.get('scenario');
  
  
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
  const finalTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');
  const lastRecognizedTextRef = useRef('');



  const [message, setMessage] = useState('');
  // const [conversation, setConversation] = useState<Message[]>([{
  //   role: 'system',
  //   content: `您已進入「${scenario.title}」的模擬對話。請開始與虛擬病人對話。`
  // }]);
  const [scoredCodes, setScoredCodes] = useState<Set<string>>(new Set());
  const [overlayText, setOverlayText] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');

  const [isListening, setIsListening] = useState(false);
  const [isRecordButtonPressed, setIsRecordButtonPressed] = useState(false);
  const startTimeRef = useRef<number | null>(null);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    const now = Date.now();

    const newMessage: Message = {
      role: 'nurse',
      content: message,
      elapsedSeconds: startTimeRef.current ? Math.floor((now - startTimeRef.current) / 1000) : undefined
    };

    const updatedConversation = [...conversation, newMessage];
    setConversation(updatedConversation);
    setMessage('');

    setTimeout(() => {
      const reply: Message = {
        role: 'patient',
        content: `這是虛擬病人的回應。`,
        elapsedSeconds: 2
      };
      setConversation([...updatedConversation, reply]);
    }, 800);
  };

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
            const normalizedText = normalizeNames(final);
            setFinalTranscript(prev => {
              const newText = prev + normalizedText;
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
          console.log('識別到臨時文本:', interimText);
          setInterimTranscript(interimText);
          interimTranscriptRef.current = interimText; // ✅ 加這行
        }
        
        
        if (finalText) {
          console.log('識別到最終文本:', finalText);
          // 標準化名稱
          const normalizedText = normalizeNames(finalText);
          console.log('標準化後的文本:', normalizedText);
          
          // 將最終文本添加到 finalTranscript 中，而不是替換它
          // React 的 setXxx() 是非同步的，所以需要使用 prev 來更新
          setInterimTranscript('');
          interimTranscriptRef.current = '';
          

          setFinalTranscript(prev => {
            const newText = prev + normalizedText;
            finalTranscriptRef.current = newText; // ✅ 更新 ref
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
  
  // const handleRecordButtonMouseDown = () => {
  //   setIsRecordButtonPressed(true);
  //   setIsListening(true);
  //   startTimeRef.current = Date.now();
  // };

  // const handleRecordButtonMouseUp = () => {
  //   setIsRecordButtonPressed(false);
  //   setIsListening(false);
  // };

  // const handleRecordButtonMouseLeave = (e: React.MouseEvent) => {
  //   if (isRecordButtonPressed) handleRecordButtonMouseUp();
  // };

  // const handleRecordButtonTouchStart = () => {
  //   handleRecordButtonMouseDown();
  // };

  // const handleRecordButtonTouchEnd = () => {
  //   handleRecordButtonMouseUp();
  // };

  return {
    message,
    setMessage,
    conversation,
    scoredCodes,
    overlayText,
    interimTranscript,
    isListening,
    isRecordButtonPressed,
    handleSendMessage,
    handleRecordButtonMouseDown,
    handleRecordButtonMouseUp,
    handleRecordButtonMouseLeave,
    handleRecordButtonTouchStart,
    handleRecordButtonTouchEnd,
  };
}
