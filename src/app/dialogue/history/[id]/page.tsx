// src/app/dialogue/history/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { generateScoredItems } from '@/lib/scoringItems';
import Link from 'next/link';
import React from 'react';
import { ChevronUp, ChevronDown } from "lucide-react";


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
    delayFromPrev?: number | null;
    isDelayed?: boolean;
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
  scoredItems?: {
    code: string;
    category: string;
    subcategory: string;
    score: number;
    awarded: boolean;
    hitMessages: string[];
  }[];
  nursingCaseNote?: {
    rawText: string;
  } | null;
}

export default function DialogueDetailPage() {
  const params = useParams();
  const dialogueId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogue, setDialogue] = useState<DialogueDetail | null>(null);
  const router = useRouter();
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sectionVisibility, setSectionVisibility] = useState({
    info: true,
    messages: true,
    notes: true,
    scores: true,
    feedback: true,
  });
  
  const toggleSection = (section: keyof typeof sectionVisibility) => {
    setSectionVisibility((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };
  
  
  useEffect(() => {
    const userJson = localStorage.getItem('user');
    if (!userJson) {
      router.push('/login');
      return;
    }
  
    const userData = JSON.parse(userJson);
    setUser(userData);
  
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    if (id) {
      fetchDialogueDetail(id);
    }
  
    // 無論如何最後都停止 loading
    setLoading(false);
  }, [params.id, router]);
  
  
  // 從 API 獲取對話詳情數據
  const fetchDialogueDetail = async (id: string) => {
    try {
      const userJson = localStorage.getItem('user');
      const userData = userJson ? JSON.parse(userJson) : null;
      const userId = userData?.id;
  
      const response = await fetch(`/api/conversations/${id}?userId=${userId}`, {
        credentials: 'include',
      });
  
      if (!response.ok) {
        console.warn(`獲取對話詳情失敗: ${response.status} ${response.statusText}`);
        return;
      }
  
      const data = await response.json();
      console.log('成功取得對話詳情 data= ', data);
  
      const awardedMap: Record<string, { hitMessages: string[] }> = {};
      for (const msg of data.messages) {
        if (!msg.scoringItems) continue;
        for (const item of msg.scoringItems) {
          if (!awardedMap[item.code]) {
            awardedMap[item.code] = { hitMessages: [msg.content] };
          } else if (!awardedMap[item.code].hitMessages.includes(msg.content)) {
            awardedMap[item.code].hitMessages.push(msg.content);
          }
        }
      }
      // console.log('data.nursingCaseNotematchedCodes= ', data.nursingCaseNote.matchedCodes);
      const noteMatchedCodes = data.nursingCaseNote?.matchedCodes || [];
      const scoredItems = generateScoredItems(awardedMap, noteMatchedCodes);
      // 🔁 加入 M1 項目：以 fluency 判定是否得分
      scoredItems.push({
        code: 'M1',
        category: '綜合性表現',
        subcategory: '護理評估流暢度',
        score: 1,
        awarded: data.fluency === true,
        hitMessages: [data.fluency === true ? '系統判定語句流暢' : '未達流暢標準'],
      });
      setDialogue({
        ...data,
        feedback: typeof data.feedback === 'object' && data.feedback !== null ? data.feedback.text ?? '' : data.feedback,
        scoredItems,
      });
          } catch (error) {
      console.error('獲取對話詳情失敗', error);
    }
  };
  

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Navbar user={user} />
        <main className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center min-h-[60vh]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 dark:border-gray-100"></div>
              <p className="mt-2 text-gray-700 dark:text-gray-300">載入中...</p>
            </div>
          </div>
        </main>
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
  // 在 return 之前先處理好 groupedScoredItems
  const groupedScoredItems: Record<string, DialogueDetail['scoredItems']> =
  dialogue?.scoredItems?.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = []; // 初始化為空陣列
    }
    acc[item.category]!.push(item); // 現在 TypeScript 不會抱怨了
    return acc;
  }, {} as Record<string, DialogueDetail['scoredItems']>) ?? {};

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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                對話資訊
              </h2>
              <button
                onClick={() => toggleSection('info')}
                className="text-sm text-blue-600 dark:text-blue-400 flex items-center"
              >
                {sectionVisibility.info ? (
                  <>
                    收合 <span className="ml-1">▲</span>
                  </>
                ) : (
                  <>
                    展開 <span className="ml-1">▼</span>
                  </>
                )}
              </button>
            </div>
            {sectionVisibility.info && (  
              
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

                  {/* 總分 */}
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">總分：</span>
                    <span className={`font-semibold ${
                      dialogue.score !== null && dialogue.score < 30 ? 'text-red-600 dark:text-red-400' :
                      dialogue.score !== null && dialogue.score < 60 ? 'text-orange-500 dark:text-orange-300' :
                      dialogue.score !== null && dialogue.score < 70 ? 'text-blue-600 dark:text-blue-400' :
                      dialogue.score !== null && dialogue.score < 80 ? 'text-green-600 dark:text-green-400' :
                      dialogue.score !== null && dialogue.score < 90 ? 'text-yellow-500 dark:text-yellow-300' :
                      dialogue.score !== null ? 'text-amber-500 dark:text-amber-300' :
                      'text-gray-600 dark:text-gray-400'
                    }`}>
                      {dialogue.score !== null ? `${dialogue.score}/100` : '未評分'}
                    </span>
                  </div>


                  
                  {/* 添加評分等級 */}
                  {dialogue.score !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">等級：</span>
                      <span className={`font-semibold ${
                        dialogue.score < 30 ? 'text-red-600 dark:text-red-400' :
                        dialogue.score < 60 ? 'text-orange-500 dark:text-orange-300' :
                        dialogue.score < 70 ? 'text-blue-600 dark:text-blue-400' :
                        dialogue.score < 80 ? 'text-green-600 dark:text-green-400' :
                        dialogue.score < 90 ? 'text-yellow-500 dark:text-yellow-300' :
                        'text-amber-500 dark:text-amber-300'
                      }`}>
                        {dialogue.score < 30 ? 'D (需加強)' :
                        dialogue.score < 60 ? 'C (基本)' :
                        dialogue.score < 70 ? 'B (普通)' :
                        dialogue.score < 80 ? 'A (良好)' :
                        dialogue.score < 90 ? 'A+ (優秀)' :
                        'A++ (卓越)'}
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
                    <p className="text-sm text-gray-500 dark:text-gray-100">
                      {dialogue.score === null 
                        ? '這次的對話還沒被評分，完成後系統會自動幫你打分數喔！' 
                        : dialogue.score < 30
                          ? '沒關係，我們一起慢慢來，從錯誤中學習最扎實。'
                          : dialogue.score < 60
                            ? '有些基礎已經掌握了，再多練習幾次會更上手！'
                            : dialogue.score < 70
                              ? '離目標越來越近了，再調整一下就更棒了～'
                              : dialogue.score < 80
                                ? '表現不錯喔！再多一點練習就更穩定了。'
                                : dialogue.score < 90
                                  ? '很好！你已經十分熟練了，繼續保持！'
                                  : '太棒了！你簡直是入院護理評估的專家，繼續加油！'}
                    </p>
                  </div>



                </div>
              </div>
            </div>
            )}





          </div>
          {/* 对话内容 */}
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
                      // console.log('msg= ', msg);
                      // console.log('dialogue.messages= ', dialogue.messages);

                      const isUserMessage = msg.role === 'user';
                      // 只對用戶消息檢查延遲，確保 isDelayed存在, delayFromPrev 是數字
                      const showDelayWarning = isUserMessage && msg.isDelayed && 
                                               typeof msg.delayFromPrev === 'number'
                      
                      // 計算與上一條消息的間距（基於 elapsedSeconds）
                      const prevMsg = index > 0 ? arr[index - 1] : null;
                      const prevElapsed = prevMsg ? (prevMsg.elapsedSeconds || 0) : 0;
                      const currentElapsed = msg.elapsedSeconds || 0;
                      const timeDiff = index === 0 && currentElapsed === 0 ? 0 : currentElapsed - prevElapsed;
                      
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
                            {msg.elapsedSeconds !== undefined && msg.elapsedSeconds !== null && msg.elapsedSeconds !== 0
                              ? `${Math.floor(msg.elapsedSeconds / 60).toString().padStart(2, '0')}:${(msg.elapsedSeconds % 60).toString().padStart(2, '0')}` 
                              : ''}
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
                                      {msg.elapsedSeconds !== undefined && msg.elapsedSeconds !== null && msg.elapsedSeconds !== 0
                                        ? `${Math.floor(msg.elapsedSeconds / 60).toString().padStart(2, '0')}:${(msg.elapsedSeconds % 60).toString().padStart(2, '0')}` 
                                        : ''}
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
                                      {msg.elapsedSeconds !== undefined && msg.elapsedSeconds !== null && msg.elapsedSeconds !== 0
                                        ? `${Math.floor(msg.elapsedSeconds / 60).toString().padStart(2, '0')}:${(msg.elapsedSeconds % 60).toString().padStart(2, '0')}` 
                                        : ''}
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
            )}
          </div>

          {/* 護理紀錄筆記 */}
          {dialogue.nursingCaseNote?.rawText && (
            <div className="mb-8">
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

              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md whitespace-pre-line text-gray-800 dark:text-gray-200">
                {dialogue.nursingCaseNote.rawText}
              </div>
              )}
            </div>
          )}

          {/* 評分細項 */}
          {/* 評分細項 */}
          {Object.entries(groupedScoredItems).length > 0 ? (
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">評分細項</h2>
                <button
                  onClick={() => toggleSection('scores')}
                  className="text-sm text-blue-600 dark:text-blue-400 flex items-center"
                >
                  {sectionVisibility.scores ? '收合 ▲' : '展開 ▼'}
                </button>
              </div>

              {sectionVisibility.scores && (
                <>
                  {/* ✅ 控制全部類別的顯示切換按鈕 */}
                  <div className="flex justify-end mb-4">
                    <button
                      onClick={() => setIsCollapsed((prev) => !prev)}
                      className="text-sm text-blue-600 dark:text-blue-400 font-semibold"
                    >
                      {isCollapsed ? '（僅顯示得分）' : '（全部顯示）'}
                    </button>
                  </div>

                  {Object.entries(groupedScoredItems).map(([category, items], idx) => {
                    const displayItems = (isCollapsed ? items?.filter(item => item.awarded) : items) ?? [];
                    const totalScore = items.reduce((sum, i) => sum + i.score, 0);
                    const earnedScore = items.reduce((sum, i) => sum + (i.awarded ? i.score : 0), 0);
                    const percentage = Math.round((earnedScore / totalScore) * 100);

                    return (
                      <div key={category} className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <button
                            onClick={() =>
                              setCollapsedCategories((prev) => ({
                                ...prev,
                                [category]: !prev[category],
                              }))
                            }
                            className="font-semibold text-left text-lg text-blue-600 dark:text-blue-400"
                          >
                            {category}
                          </button>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            得分：{earnedScore} / {totalScore}（{percentage}%）
                          </div>
                        </div>

                        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-md">
                          {/* 表頭 */}
                          <div className="grid grid-cols-[200px_100px_100px_auto] bg-gray-100 dark:bg-gray-700 text-xs uppercase text-gray-700 dark:text-gray-200 px-4 py-2 font-semibold">
                            <div>項目</div>
                            <div className="text-center">項目分數</div>
                            <div className="text-center">是否得分</div>
                            <div>得分句子</div>
                          </div>

                          {/* 資料列 */}
                          {displayItems.map((item, index) => (
                            <div
                              key={index}
                              className={`grid grid-cols-[200px_100px_100px_auto] border-t border-gray-200 dark:border-gray-700 px-4 py-2 text-sm ${
                                !item.awarded
                                  ? 'text-gray-500 dark:text-gray-500 font-normal'
                                  : 'text-white-100 dark:text-gray-200 font-semibold'
                              }`}
                            >
                              <div>{item.subcategory}</div>
                              <div className="text-center">{item.score}</div>
                              <div className="text-center">
                                {item.awarded ? (
                                  <span className="text-green-600 dark:text-green-400 font-semibold">✔ 有</span>
                                ) : (
                                  <span className="text-red-500 dark:text-red-400 font-semibold">✘ 沒有</span>
                                )}
                              </div>
                              <div>{item.awarded ? item.hitMessages.join('\n') : '—'}</div>
                            </div>
                          ))}

                          {/* 進度條 */}
                          <div className="mt-2 px-4 pb-2">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded h-2 mt-1">
                              <div
                                className="bg-green-500 h-2 rounded"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{percentage}% 完成</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400">尚無評分項目</div>
          )}


          
          {/* 添加反思内容部分 */}
          {(dialogue.reflection || (dialogue.reflections && dialogue.reflections.length > 0)) && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">反思對話</h2>
                <button
                  onClick={() => toggleSection('feedback')}
                  className="text-sm text-blue-600 dark:text-blue-400 flex items-center"
                >
                  {sectionVisibility.feedback ? '收合 ▲' : '展開 ▼'}
                </button>
              </div>


              {sectionVisibility.feedback && (

                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                  {dialogue.reflection && (
                    <div className="mb-4">
                      <h3 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-2">總結反思</h3>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{dialogue.reflection}</p>
                    </div>
                  )}
                  
                  {dialogue.reflections && dialogue.reflections.length > 0 && (
                    <div>
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

              )}

            </div>
          )}
          
          {/* 保留原有的feedback显示，以防有些对话使用旧格式 */}
          {dialogue.feedback && !dialogue.reflection && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">評語</h2>
                <button
                  onClick={() => toggleSection('feedback')}
                  className="text-sm text-blue-600 dark:text-blue-400 flex items-center"
                >
                  {sectionVisibility.feedback ? '收合 ▲' : '展開 ▼'}
                </button>
              </div>

              {sectionVisibility.feedback && (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{dialogue.feedback}</p>
                </div>
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