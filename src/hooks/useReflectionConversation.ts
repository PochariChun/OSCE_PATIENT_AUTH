// src/hooks/useReflectionConversation.ts
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
  useEffect(() => {
    if (!conversationId || !userId) return;

    const fetchConversationData = async () => {
      try {
        const conversationData = await fetchJson(`/api/conversations/${conversationId}?userId=${userId}`);
        setConversationTitle(conversationData.title || `對話 #${conversationId}`);

        const messagesData = await fetchJson(`/api/conversations/${conversationId}/messages`);

        const cards: ReflectionCard[] = [];
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

        try {
          const reflectionData = await fetchJson<{ messages: any[] }>(`/api/conversations/${conversationId}/reflection`);
          setConversation(reflectionData.messages.map((msg: any) => ({
            role: msg.sender,
            content: msg.text,
            timestamp: new Date(msg.timestamp),
            gibbsStage: msg.sourceNodeId || msg.strategyTag
          })));
          const last = reflectionData.messages.at(-1);
          setCurrentStage(last?.gibbsStage || 'description');
        } catch {
          console.warn('未初始化反思紀錄，使用預設問題');
          setConversation([
            {
              role: 'system',
              content: '歡迎進行對話反思。請思考您在與病人的對話中的表現。',
              timestamp: new Date()
            },
            {
              role: 'assistant',
              content: '讓我們開始反思這次對話。首先，請描述一下發生了什麼？請盡可能詳細地描述整個對話過程。',
              timestamp: new Date(),
              gibbsStage: 'description'
            }
          ]);
          setCurrentStage('description');
        }
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
    setCurrentStage
  };
}
