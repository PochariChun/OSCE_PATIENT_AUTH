// src/hooks/useReflectionConversation.ts
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
type Feedback = string | { text: string };

export function useReflectionConversation(conversationId: string, userId?: number) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState('');
  const [reflectionCards, setReflectionCards] = useState<ReflectionCard[]>([]);
  const [conversation, setConversation] = useState<ReflectionMessage[]>([]);
  const [currentStage, setCurrentStage] = useState<string>('description')
  // 這樣可以保留 null 初始值，並讓它知道之後會是 string 或 { text: string }。
  const [feedback, setFeedback] = useState<Feedback | undefined>();

  const [scoredList, setScoredList] = useState<string[]>([]);
  const [unscoredList, setUnscoredList] = useState<string[]>([]);
  const [recordedList, setRecordedList] = useState<string[]>([]);
  const [unrecordedList, setUnrecordedList] = useState<string[]>([]);
  const [rawMessages, setRawMessages] = useState<any[]>([]);
  const [nursingNote, setNursingNote] = useState<string | null>(null);


  useEffect(() => {
    if (!conversationId || !userId) return;

    const fetchConversationData = async () => {
      try {
        const scoreRes = await fetchJson(`/api/conversations/${conversationId}/scores`);
        console.log('[得分記錄] ✅ scoredList:', scoreRes.scoredList);
        console.log('[得分記錄] ⚠️ unscoredList:', scoreRes.unscoredList);
        console.log('[得分記錄] 📝 recordedList:', scoreRes.recordedList);
        console.log('[得分記錄] ❌ unrecordedList:', scoreRes.unrecordedList);
        setScoredList(scoreRes.scoredList || []);
        setUnscoredList(scoreRes.unscoredList || []);
        setRecordedList(scoreRes.recordedList || []);
        setUnrecordedList(scoreRes.unrecordedList || []);

        const conversationData = await fetchJson(`/api/conversations/${conversationId}?userId=${userId}`);
        setConversationTitle(conversationData.title || `對話 #${conversationId}`);
        setFeedback(conversationData.feedback ?? null);

        const messagesData = await fetchJson(`/api/conversations/${conversationId}/messages`);
        const cards: ReflectionCard[] = [];

        const fullData = await fetchJson(`/api/conversations/${conversationId}?userId=${userId}`);
        setRawMessages(fullData.messages || []);
        setNursingNote(fullData.nursingCaseNote?.rawText || null);


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

        setConversation([
          {
            role: 'system',
            content: `你是一位協助護理師反思他剛完成的"小兒腸道護理評估對話練習"的小幫手，語氣溫暖、給予學生多種正向的鼓勵, 必要時用少量 emoji 增添情緒
                      
                      請幫助學生開始 Gibbs 六階段反思的第一步,描述階段
                      
                      範例引導語：請你回想一下剛剛的練習中，你講了哪些內容呢？
                      
                      鼓勵學生盡量說，不用擔心對錯，幫他整理回顧。`,
            timestamp: new Date()
          },
          {
            role: 'assistant',
            content: `🎉恭喜你完成練習！🎉
                      我們來一起回顧一下這次的對話, 看看有什麼可以做的更好的地方吧～

                      📝 先回想看看, 你還記得自己在剛剛的練習中講了什麼嗎？
                      📝 盡可能的寫出你記得的部份,
                      📝 可以用條列的方式寫出來,
                      例如：
                      - 我剛剛有問到病人手圈, 但忘記問床號
                      - 我剛剛有記得量心尖脈, 但忘記使用量表
                      `,
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

  return {
    loading,
    error,
    conversationTitle,
    reflectionCards,
    conversation,
    currentStage,
    setConversation,
    setCurrentStage,
    feedback,
    setFeedback,
    scoredList,
    unscoredList,
    recordedList,
    unrecordedList,
    rawMessages,
    nursingNote,
  };
}
