import { NextResponse, NextRequest } from 'next/server';
import fetch from 'node-fetch';
import { normalizeNames } from '@/lib/textUtils';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 調用嵌入式查詢API服務
async function queryEmbeddingService(query: string, history: any[] = []): Promise<any> {
  try {
    // 使用環境變量獲取API地址，預設為本地地址
    const apiUrl = process.env.EMBEDDING_API_URL || 'http://localhost:5000/query';
    
    // 获取前一句对话的标签（如果存在）
    let previousTag = null;
    if (history.length > 0) {
      const lastMessage = history[history.length - 1];
      // 假设消息对象中有code字段，从中提取标签
      if (lastMessage && lastMessage.tag) {
        const codeMatch = lastMessage.tag.match(/^([A-F]\d+)/);
        if (codeMatch) {
          previousTag = codeMatch[1].charAt(0); // 提取第一个字符作为标签
        }
      }
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        query, 
        top_k: 3,
        previous_tag: previousTag, // 传递前一句对话的标签
        // 可以选择性地传递历史记录
        // history: history.slice(-5)  // 只传递最近的5条讯息
      }),
    });
    
    if (!response.ok) {
      console.error(`API 請求失敗: ${response.status} ${response.statusText}`);
      return []; // 返回空数组，而不是抛出错误
    }
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('查詢嵌入服務時出錯:', error);
    // 返回空數組而不是拋出錯誤，讓調用者可以處理失敗情況
    return [];
  }
}

// 添加 getAIResponse 函数，使用温和的错误处理
async function getAIResponse(message: string, history: any[], scenario: any): Promise<{ response: string, tag?: string }> {
  try {
    // 標準化名稱
    const normalizedMessage = normalizeNames(message);
    
    // 檢查是否是重複的問題
    const isRepeatedQuestion = history && history.length >= 4 && 
      history[history.length - 3].content.toLowerCase() === normalizedMessage.toLowerCase();
    
    if (isRepeatedQuestion) {
      // 如果是重複的問題，表示媽媽可能已經聽清楚了
      return { response: '我現在聽清楚了。讓我想想...' };
    }
    
    // 調用嵌入式查詢服務
    const results = await queryEmbeddingService(normalizedMessage, history);
    
    // 檢查是否有匹配結果
    if (results && results.length > 0) {
      const bestMatch = results[0];
      // 返回回复和标签
      return { 
        response: bestMatch.answer,
        tag: bestMatch.code // 从匹配结果中提取标签
      };
    }
    
    // 如果沒有找到匹配，返回預設回覆
    const defaultResponses = [
      '抱歉，我沒有聽清楚您說的話，能再說一次嗎？',
      '對不起，我剛才在照顧小威，您能再重複一次嗎？',
      '不好意思，我沒聽懂您的意思，能請您再說一次嗎？',
      '抱歉，我有點分心，您能再說一次嗎？',
      '對不起，我剛才沒聽清楚，請您再說一次好嗎？'
    ];
    
    return { response: defaultResponses[Math.floor(Math.random() * defaultResponses.length)] };
  } catch (error) {
    console.error('生成 AI 回覆時出錯:', error);
    return { response: '抱歉，我現在無法回答您的問題。請稍後再試。' };
  }
}

// 修改 POST 處理函數，確保即使語音生成失敗也能返回文本回覆
export async function POST(request: NextRequest) {
  try {
    const { message, history, scenarioId } = await request.json();
    
    if (!message) {
      return NextResponse.json(
        { error: '缺少訊息內容' },
        { status: 400 }
      );
    }
    
    // 獲取場景信息
    const scenario = await prisma.scenario.findUnique({
      where: { id: Number(scenarioId) },
    });
    
    if (!scenario) {
      return NextResponse.json(
        { error: '找不到指定的場景' },
        { status: 404 }
      );
    }
    
    // 調用 AI 服務獲取回覆
    const { response: aiResponse, tag } = await getAIResponse(message, history, scenario);
    
    // 返回回复和标签
    return NextResponse.json({ response: aiResponse, tag: tag });
  } catch (error) {
    console.error('AI 回覆服務錯誤:', error);
    return NextResponse.json(
      { error: '獲取 AI 回覆失敗', details: (error as Error).message },
      { status: 500 }
    );
  }
} 