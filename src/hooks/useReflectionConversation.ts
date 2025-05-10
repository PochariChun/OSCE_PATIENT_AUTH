// src/hooks/useReflectionConversation.ts
// 這個 hook：

// 載入對話標題、原始訊息、反思紀錄與分析結果

// 建立「反思卡片」：每張卡片表示一輪護士與病人的互動與分析

// 載入或初始化「反思對話」：由 AI 協助使用者根據 Gibbs 模型逐步反思
import { useEffect, useState } from 'react';
import { fetchJson } from '@/lib/fetchJson';

interface ReflectionCard {
  timestamp: string;
  userSpeech: string;
  patientResponse: string;
  isCorrect: boolean;
  isDelayed: boolean;
  emotionLabel: string;
  emotionScore: number;
  notes?: string;
}

interface ReflectionMessage {
  role: 'nurse'| 'assistant' | 'system';
  content: string;
  timestamp: Date;
  gibbsStage?: string;
}

export function useReflectionConversation(conversationId: string, userId?: number) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState('');
  const [reflectionCards, setReflectionCards] = useState<ReflectionCard[]>([]);
  const [conversation, setConversation] = useState<ReflectionMessage[]>([]);
  const [currentStage, setCurrentStage] = useState<string>('description');

  // 載入對話標題、原始訊息、反思紀錄與分析結果
  useEffect(() => {
    if (!conversationId || !userId) return;

    // 載入對話標題、原始訊息、反思紀錄與分析結果
    const fetchConversationData = async () => {
      try {
        // 1 載入對話和標題
        const conversationData = await fetchJson(`/api/conversations/${conversationId}?userId=${userId}`);
        setConversationTitle(conversationData.title || `對話 #${conversationId}`);

        // 2️ 載入訊息並產生反思卡片
        const messagesData = await fetchJson(`/api/conversations/${conversationId}/messages`);
        const cards: ReflectionCard[] = [];

        // 3️ 產生反思卡片
        for (let i = 0; i < messagesData.length; i += 2) {
          if (i + 1 < messagesData.length) {
            const userMessage = messagesData[i];
            const aiResponse = messagesData[i + 1];

            if (userMessage.sender === 'nurse'&& aiResponse.sender === 'assistant') {
              cards.push({
                timestamp: new Date(userMessage.timestamp).toLocaleTimeString(),
                userSpeech: userMessage.text,
                patientResponse: aiResponse.text,
                isCorrect: userMessage.isCorrect || false,
                isDelayed: userMessage.isDelayed || false,
                emotionLabel: aiResponse.emotionLabel || '中性',
                emotionScore: aiResponse.emotionScore || 0,
                notes: userMessage.notes || ''
              });
            }
          }
        }
        setReflectionCards(cards);

        
          // 4️ 載入或初始化「反思對話」
          setConversation([
            {
              role: 'system',
              content: 
              `你是一位親切且鼓勵人的反思小幫手，
              要引導使用者用Gibbs六階段模型進行對話練習後的反思，
              語氣要溫暖、輕鬆、有陪伴感。
              必要時可以用 emoji 增添情緒。
              你會先詢問使用者是否記得剛剛的對話練習，
              如果使用者記得，你會引導使用者用Gibbs六階段模型進行反思。
              如果使用者不記得，你會引導使用者回顧對話練習的內容。
              `,
              timestamp: new Date()
            },
            {
              role: 'assistant',
              content: 
              `恭喜你完成練習！😊 
              我們來一起回顧一下這次的對話, 看看有什麼可以做的更好的地方吧～📝

              👉 你還記得剛剛的練習中，你講了哪些內容嗎？
              
              不用擔心對錯，盡量講就好！😉
              我會根據你前面的對話紀錄來幫你喔👍`,

              timestamp: new Date(),
              gibbsStage: 'description'
            }
          ]);
          
          setCurrentStage('description');
          
        
      } catch (e: any) {
        console.error('獲取對話數據錯誤:', e);
        setError('無法加載對話數據，請稍後再試');
      } finally {
        setLoading(false);
      }
    };

    fetchConversationData();
  }, [conversationId, userId]);

  // 建立「反思卡片」：每張卡片表示一輪護士與病人的互動與分析
  return {
    loading,
    error,
    conversationTitle,
    reflectionCards,
    conversation,
    currentStage,
    setConversation,
    setCurrentStage
  };
}
