import { NextResponse } from 'next/server';
import fetch from 'node-fetch';
import { normalizeNames } from '@/lib/textUtils';

// 調用嵌入式查詢API服務
async function queryEmbeddingService(query: string, history: any[] = []): Promise<any> {
  try {
    // 使用環境變量獲取API地址，預設為本地地址
    const apiUrl = process.env.EMBEDDING_API_URL || 'http://localhost:5000/query';
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        query, 
        top_k: 3,
        // // 可以選擇性地傳遞歷史記錄
        // history: history.slice(-5)  // 只傳遞最近的5條訊息
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API 請求失敗: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('查詢嵌入服務時出錯:', error);
    // 返回空數組而不是拋出錯誤，讓調用者可以處理失敗情況
    return [];
  }
}

// 修改 generateVoiceWithBark 函數以更好地處理連接錯誤
async function generateVoiceWithBark(text: string): Promise<string | null> {
  try {
    // 使用環境變量獲取 Bark API 地址
    const barkApiUrl = process.env.BARK_API_URL || 'http://localhost:7860/api/generate';
    
    // 添加超時設置，避免長時間等待
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超時
    
    const response = await fetch(barkApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice_preset: 'mother', // 使用媽媽的聲音預設
        // 可以添加其他 Bark 參數，如語速、音調等
      }),
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));
    
    if (!response.ok) {
      throw new Error(`Bark API 請求失敗: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.audio_url || null; // 假設 API 返回音頻 URL
  } catch (error) {
    // 更詳細的錯誤日誌
    if (error instanceof Error) {
      console.error(`生成語音時出錯: ${error.name}: ${error.message}`);
      // 如果是 AbortError，提供更具體的錯誤信息
      if (error.name === 'AbortError') {
        console.error('Bark API 請求超時');
      }
    } else {
      console.error('生成語音時出現未知錯誤:', error);
    }
    
    // 返回 null，表示無法生成語音
    return null;
  }
}

// 修改 POST 處理函數，確保即使語音生成失敗也能返回文本回覆
export async function POST(request: Request) {
  try {
    console.log('收到 AI 回覆請求');
    
    const { message, history, scenarioId } = await request.json();
    console.log('原始用戶訊息:', message);
    console.log('場景ID:', scenarioId);
    
    // 標準化名稱
    const normalizedMessage = normalizeNames(message);
    console.log('標準化後的用戶訊息:', normalizedMessage);
    
    // 檢查是否是重複的問題
    const isRepeatedQuestion = history && history.length >= 4 && 
      history[history.length - 3].content.toLowerCase() === normalizedMessage.toLowerCase();
    
    if (isRepeatedQuestion) {
      // 如果是重複的問題，表示媽媽可能已經聽清楚了
      const responseText = '我現在聽清楚了。讓我想想...';
      
      // 嘗試生成語音，但不阻止回覆
      const audioUrl = await generateVoiceWithBark(responseText).catch(() => null);
      
      return NextResponse.json({ 
        response: responseText,
        audioUrl: audioUrl
      });
    }
    
    // 調用嵌入式查詢服務
    const results = await queryEmbeddingService(normalizedMessage, history);
    
    // 檢查是否有匹配結果
    if (results && results.length > 0) {
      const bestMatch = results[0];
      
      console.log(`最佳匹配分數: ${bestMatch.score}`);
      
      // // 檢查是否在開發環境
      // const isDevelopment = process.env.NODE_ENV === 'development';
      
      // 檢查是否有 answerType 為 narration
      const isNarration = bestMatch.answerType === 'narration';
      
      // 嘗試生成語音，但不阻止回覆
      const audioUrl = await generateVoiceWithBark(bestMatch.answer).catch(() => null);
      
      const response = {
        response: bestMatch.answer,
        answerType: bestMatch.answerType || 'dialogue', // 預設為 dialogue
        // imageToShow: bestMatch.imageToShow || null, // 如果有圖片要顯示
        audioUrl: audioUrl // 添加語音 URL，可能為 null
      };
      
      if (isDevelopment) {
        // 在開發環境中，在回覆中包含匹配信息
        return NextResponse.json({ 
          ...response,
          debug: {
            matchedQuestion: bestMatch.question,
            score: bestMatch.score,
            tags: bestMatch.tags,
            scoringCategory: bestMatch.scoringCategory,
            scoringItem: bestMatch.scoringItem,
            scoringSubItem: bestMatch.scoringSubItem
          }
        });
      } else {
        // 在生產環境中，只返回回答、類型和語音 URL
        return NextResponse.json(response);
      }
    }
    
    // 如果沒有找到匹配，返回預設回覆
    const defaultResponses = [
      '抱歉，我沒有聽清楚您說的話，能再說一次嗎？',
      '對不起，我剛才在照顧小威，您能再重複一次嗎？',
      '不好意思，我沒聽懂您的意思，能請您再說一次嗎？',
      '抱歉，我有點分心，您能再說一次嗎？',
      '對不起，我剛才沒聽清楚，請您再說一次好嗎？'
    ];
    
    const randomResponse = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
    
    // 嘗試生成語音，但不阻止回覆
    const audioUrl = await generateVoiceWithBark(randomResponse).catch(() => null);
    
    return NextResponse.json({ 
      response: randomResponse,
      answerType: 'dialogue',
      audioUrl: audioUrl
    });
    
  } catch (error) {
    console.error('AI回覆處理錯誤:', error);
    return NextResponse.json(
      { error: '處理請求時出錯' },
      { status: 500 }
    );
  }
} 