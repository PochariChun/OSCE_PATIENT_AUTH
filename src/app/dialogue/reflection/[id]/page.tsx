// src/app/dialogue/reflection/page.tsx
'use client';

import { useRef, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { fetchJson } from '@/lib/fetchJson';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useReflectionConversation } from '@/hooks/useReflectionConversation';
// import { speakText } from '@/lib/speakText'; // 你需要封裝 EdgeTTS 播放函數

interface ReflectionMessage {
  role: 'nurse' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  gibbsStage?: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}


export default function ReflectionPage() {
  const user = useCurrentUser<User>();
  const [message, setMessage] = useState('');
  const [reflection, setReflection] = useState(null);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [showScoringSummary, setShowScoringSummary] = useState(false);
  const [scoredList, setScoredList] = useState<string[]>([]);
  const [unscoredList, setUnscoredList] = useState<string[]>([]);
  const [recordedList, setRecordedList] = useState<string[]>([]);
  const [unrecordedList, setUnrecordedList] = useState<string[]>([]);
  const [sectionVisibility, setSectionVisibility] = useState({
    messages: true,
    notes: true,
  });
  const toggleSection = (key: 'messages' | 'notes') =>
    setSectionVisibility(prev => ({ ...prev, [key]: !prev[key] }));

  const router = useRouter();
  const params = useParams();
  const conversationId = params.id as string;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
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
    rawMessages,
    nursingNote,
  
  } = useReflectionConversation(conversationId, user?.id);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // const handleSendMessage = async () => {
  //   if (!message.trim() || isPlayingVoice) return;

  //   const userMessage: ReflectionMessage = {
  //     role: 'nurse',
  //     content: message.trim(),
  //     timestamp: new Date(),
  //     gibbsStage: currentStage
  //   };

  //   setConversation(prev => [...prev, userMessage]);
  //   setMessage('');

  //   let data: {
  //     response: string;
  //     gibbsStage: string;
  //     nextStage: string;
  //     scoredList?: string[];
  //     unscoredList?: string[];
  //     recordedList?: string[];
  //     unrecordedList?: string[];
  //     missedItems?: {
  //       id: number;
  //       category: string;
  //       subcategory: string;
  //     }[];
  //   } | null = null;

  //   try {
  //     data = await fetchJson(`/api/conversations/${conversationId}/reflection`, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({
  //         userId: user?.id,
  //         message: userMessage.content,
  //         currentStage,
  //         scoredList,
  //         unscoredList,
  //         recordedList,
  //         unrecordedList
  //       })
  //     });
  //     // ✅ 確保 data 不為 null 再處理
  //     if (!data) {
  //       console.warn('⚠️ 系統未回傳資料，請稍後重試');
  //       return;
  //     }
  //     const aiMessage = {
  //       role: 'assistant' as const,
  //       content: data.response,
  //       timestamp: new Date(),
  //       gibbsStage: data.gibbsStage
  //     };

  //     setConversation(prev => [...prev, aiMessage]);
      
  //     // ＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
  //     setCurrentStage(data.nextStage);
  //     setShowScoringSummary(data.nextStage === 'analysis');

  //     if (data.gibbsStage === 'analysis') {
  //       setScoredList(data.scoredList || []);
  //       setUnscoredList(data.unscoredList || []);
  //       setRecordedList(data.recordedList || []);
  //       setUnrecordedList(data.unrecordedList || []);
  //     }

  //     // if (data.gibbsStage === 'conclusion') {
  //     //   setShowScoringSummary(false);
  //     // }

  //     if (data.nextStage === 'completed') {
  //       try {
  //         const res = await fetchJson(`/api/conversations/${conversationId}?userId=${user?.id}`);
  //         if (res.feedback) {
  //           setFeedback(res.feedback);
  //         } else {
  //           console.warn('⚠️ feedback 為空');
  //         }
  //       } catch (err) {
  //         console.error('❌ 無法取得總結 feedback:', err);
  //       }
  //     }
  //     // ＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝＝
      
  //   } catch (error: any) {
  //     console.error('發送反思訊息錯誤:', error.message);
  //     setConversation(prev => [
  //       ...prev,
  //       {
  //         role: 'assistant',
  //         content: `⚠️ 發送失敗：${error.message}`,
  //         timestamp: new Date(),
  //         gibbsStage: '錯誤'
  //       }
  //     ]);
  //     if (data?.nextStage) setCurrentStage(data.nextStage);
  //   }
  // };

  const handleSendMessage = async () => {
    if (!message.trim() || isPlayingVoice) return;
  
    const userMessage: ReflectionMessage = {
      role: 'nurse',
      content: message.trim(),
      timestamp: new Date(),
      gibbsStage: currentStage
    };
  
    setConversation(prev => [...prev, userMessage]);
    setMessage('');
  
    try {
      const data = await fetchJson(`/api/conversations/${conversationId}/reflection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          message: userMessage.content,
          currentStage,
          scoredList,
          unscoredList,
          recordedList,
          unrecordedList,
          complete: currentStage === 'action'  // ✅ 若為最後一階段則標記為完成
        })
      });
  
      if (!data) {
        console.warn('⚠️ 系統未回傳資料，請稍後重試');
        return;
      }
  
      const aiMessage = {
        role: 'assistant' as const,
        content: data.response,
        timestamp: new Date(),
        gibbsStage: data.gibbsStage
      };
  
      setConversation(prev => [...prev, aiMessage]);
      setCurrentStage(data.nextStage);
      setShowScoringSummary(data.nextStage === 'analysis');
  
      if (data.gibbsStage === 'analysis') {
        setScoredList(data.scoredList || []);
        setUnscoredList(data.unscoredList || []);
        setRecordedList(data.recordedList || []);
        setUnrecordedList(data.unrecordedList || []);
      }
  
      if (data.nextStage === 'completed' && data.feedback) {
        setFeedback(data.feedback); // ✅ 直接從 POST 回應設置 feedback
      }
  
    } catch (error: any) {
      console.error('發送反思訊息錯誤:', error.message);
      setConversation(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ 發送失敗：${error.message}`,
          timestamp: new Date(),
          gibbsStage: '錯誤'
        }
      ]);
    }
  };
  
  const stageLabels: Record<string, string> = {
    description: '📝 描述階段',
    feelings: '💭 感受階段',
    evaluation: '📈 評估階段',
    analysis: '🔍 分析階段',
    conclusion: '📚 結論階段',
    action: '🛠️ 改善計畫階段',
  };
  
  const handleFinishReflection = async () => {
    try {
      const res = await fetchJson(`/api/conversations/${conversationId}/reflection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          currentStage,
          userId: user?.id,
          complete: false,
          scoredList,
          unscoredList,
          recordedList,
          unrecordedList
        })
      });
            // ✅ 若後端有回傳 feedback，更新前端顯示
      if (res.feedback) {
        setFeedback(res.feedback);
      }

      router.push(`/dialogue/history/${conversationId}`);
    } catch (error: any) {
      console.error('完成反思時出錯:', error.message);
      alert(`完成反思時出錯：${error.message}`);
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
        <div className="max-w-4xl mx-auto">




          {/* 標題框*/}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  反思: {conversationTitle}
                </h1>



              </div>
              <div>
                <span className={`px-3 py-1 text-sm rounded-full ${
                  currentStage === 'description' ? 'bg-blue-100 text-blue-800' :
                  currentStage === 'feelings' ? 'bg-green-100 text-green-800' :
                  currentStage === 'evaluation' ? 'bg-yellow-100 text-yellow-800' :
                  currentStage === 'analysis' ? 'bg-purple-100 text-purple-800' :
                  currentStage === 'conclusion' ? 'bg-orange-100 text-orange-800' :
                  currentStage === 'action' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                {stageLabels[currentStage] || '準備中'}
                </span>
                            
              </div>
              
            </div>
            <div className="mb-6">
                  <div className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 rounded-lg shadow-md p-4">
                    <h2 className="text-lg font-semibold mb-2">📌 使用說明</h2>
                    <ul className="list-disc list-inside text-sm space-y-1 leading-relaxed">
                      <li>請根據畫面提示，逐步完成 Gibbs 六階段的反思。</li>
                      <li>輸入框支援 <strong>Shift + Enter</strong> 換行，<strong>Enter</strong> 直接送出。</li>
                      <li>當進入「分析階段」時，系統會顯示本次得分與未得分項目，供你參考。</li>
                      <li>完成所有反思階段後，請按下「完成反思」查看總結與得分結果。</li>
                    </ul>
                  </div>
                </div>
            {currentStage && (
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 font-bold">
                {currentStage === 'description' && '📝 描述階段：試著回想剛剛練習中大概有講什麼?\n 不用擔心對錯，系統會接著陪你一起整理回顧。'}
                {currentStage === 'feelings' && '💭 感受階段：你覺得剛剛整個體驗如何？\n緊張？還是有點不確定？都可以跟我分享哦～'}
                {currentStage === 'evaluation' && '📈 評估階段：看看歷史對話, 你覺得有哪些地方自己剛剛沒回想到？\n有沒有什麼地方，可以做更好？'}
                {currentStage === 'analysis' && '🔍 分析階段：這些是你的得分和沒有得分的項目，\n 你覺得忘記原因是什麼呢？\n可能跟準備、心情、對話方式有關嗎？'}
                {currentStage === 'conclusion' && '📚 結論階段：經過這次經驗，\n 你有什麼學到的事情嗎？'}
                {currentStage === 'action' && '🛠️ 改善計畫階段：如果下次再遇到同樣的情境，你會怎麼思考來讓下次可以成功拿到分數？\n 想越完整的計畫,\n 系統就可以給你更有效的回饋喔！ 😊'}
              </p>

            )}
          </div>

          {/* 第四階段資訊 */}
          {currentStage === 'analysis' && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">系統提示</h2>
                {/* 可選的收合功能 */}
              </div>

              <details className="bg-yellow-50 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-100 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4">
                <summary className="cursor-pointer font-semibold text-sm">🔍 你可能遺漏的項目（點我展開）</summary>
                <div className="mt-3 space-y-2 text-sm leading-relaxed">
                  <div>✅ 得分項目（{scoredList.length}）：{scoredList.join('、') || '（無）'}</div>
                  <div>⚠️ 未得分項目（{unscoredList.length}）：{unscoredList.join('、') || '（無）'}</div>
                  <div>📝 紀錄補充項目（{recordedList.length}）：{recordedList.join('、') || '（無）'}</div>
                  <div>❌ 未記錄項目（{unrecordedList.length}）：{unrecordedList.join('、') || '（無）'}</div>
                </div>
              </details>
            </div>
          )}

          
          {/* 第三階段資訊 */}
          {currentStage === 'evaluation' && (
            <>
              {/* 對話內容 */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">對話內容</h2>
                  <button
                    onClick={() => toggleSection('messages')}
                    className="text-sm text-blue-600 dark:text-blue-400 flex items-center"
                  >
                    {sectionVisibility.messages ? '收合 ▲' : '展開 ▼'}
                  </button>
                </div>

                {sectionVisibility.messages && (
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md max-h-[300px] overflow-y-auto space-y-2 text-sm text-gray-800 dark:text-gray-100">
                    
                    
                    {rawMessages.length > 0 ? (
                      rawMessages.map((msg, idx) => (
                        <div key={idx} className="border-b border-gray-200 dark:border-gray-600 pb-2">
                          <strong>{msg.role === 'user' ? '👩‍⚕️ 你說：' : '🧒 病人回應：'}</strong> {msg.content}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">尚無對話紀錄</p>

                    )}



                  </div>
                )}

              </div>

              {/* 護理紀錄 */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">護理紀錄</h2>
                  <button
                    onClick={() => toggleSection('notes')}
                    className="text-sm text-blue-600 dark:text-blue-400 flex items-center"
                  >
                    {sectionVisibility.notes ? '收合 ▲' : '展開 ▼'}
                  </button>
                </div>

                {sectionVisibility.notes && (
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md whitespace-pre-line text-sm text-gray-800 dark:text-gray-200">
                    {nursingNote?.trim() ? nursingNote : '尚無護理紀錄。'}
                  </div>
                )}
              </div>


            </>
          )}

          {/* 輸入框*/}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
            <div className="space-y-4 mb-4 max-h-[60vh] overflow-y-auto">
              {conversation.filter(msg => msg.role !== 'system').map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'nurse' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg p-3 ${
                    msg.role === 'nurse'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                      : typeof msg.content === 'string' && msg.content.startsWith('⚠️ 發送失敗')
                      ? 'bg-red-100 dark:bg-red-800 text-red-900 dark:text-red-100'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'                  
                      }`}>
                    <p className="whitespace-pre-line">{msg.content}</p>
                    {msg.gibbsStage && msg.role === 'assistant' && (
                      <div className="text-xs mt-1 bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded inline-block ml-auto text-gray-700 dark:text-gray-300">
                        {msg.gibbsStage}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="flex space-x-2">

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault(); // 避免預設換行
                    handleSendMessage();
                  }
                }}
                placeholder={
                  currentStage === 'completed'
                    ? "🟢 🎉 恭喜你完成反思！🎉 請按「完成反思」看自己的評分結果"
                    : isPlayingVoice
                      ? "請稍等語音播放完畢..."
                      : "輸入您的反思...（Shift + Enter 可換行, Enter 送出）"
                }
                disabled={isPlayingVoice || currentStage === 'completed'}
                rows={3}
                className="flex-grow px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white resize-none"
              />

              <button
                onClick={handleSendMessage}
                disabled={isPlayingVoice || currentStage === 'completed'}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
              >
                發送
              </button>

            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleFinishReflection}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md transition-colors"
            >
              完成反思
            </button>
          </div>
          {currentStage === 'completed' && feedback && (
            <div className="bg-green-50 dark:bg-green-900 text-green-800 dark:text-green-100 border border-green-300 dark:border-green-700 rounded-lg p-4 mt-6">
              <h2 className="font-semibold text-lg mb-2">🧠 系統總結回饋</h2>

              {Array.isArray(feedback) ? (
                <ul className="list-disc ml-6 space-y-1 text-sm">
                  {feedback.map((item: any, idx: number) => (
                    <li key={idx}>
                      {typeof item === 'object' && 'text' in item ? item.text : JSON.stringify(item)}
                    </li>
                  ))}
                </ul>
              ) : typeof feedback === 'object' && feedback !== null && 'text' in feedback ? (
                <p>{feedback.text}</p>
              ) : (
                <p>{String(feedback)}</p>
              )}



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
