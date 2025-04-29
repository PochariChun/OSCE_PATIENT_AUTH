import { NextResponse } from 'next/server';
import path from 'path';
import fetch from 'node-fetch';
import { normalizeNames } from '@/lib/textUtils';

// 標準化名稱變體
function normalizeNames(text: string): string {
  // 將所有"小威"的變體統一為"小威"
  return text.replace(/小葳|小薇|曉薇|曉威|筱威|小葳/g, '小威');
}

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
        // 可以選擇性地傳遞歷史記錄
        history: history.slice(-5)  // 只傳遞最近的5條訊息
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
      return NextResponse.json({ 
        response: '我現在聽清楚了。讓我想想...' 
      });
    }
    
    // 調用嵌入式查詢服務
    const results = await queryEmbeddingService(normalizedMessage, history);
    
    // 檢查是否有匹配結果
    if (results && results.length > 0) {
      const bestMatch = results[0];
      
      // 動態閾值調整
      let threshold = 0.7;  // 基礎閾值
      
      // 1. 根據問題長度調整閾值
      if (normalizedMessage.length < 10) {
        // 短問題需要更高的匹配度
        threshold += 0.05;
      } else if (normalizedMessage.length > 30) {
        // 長問題可以接受稍低的匹配度
        threshold -= 0.05;
      }
      
      // 2. 根據歷史對話調整閾值
      if (history && history.length > 0) {
        // 如果已經有多輪對話，可以稍微降低閾值
        threshold -= 0.03 * Math.min(3, Math.floor(history.length / 2));
      }
      
      // 3. 根據場景調整閾值
      if (scenarioId) {
        // 可以為特定場景設置不同的閾值
        const scenarioThresholds: Record<string, number> = {
          'gastroenteritis': 0.65,  // 胃腸炎場景可以接受稍低的閾值
          'fever': 0.68,            // 發燒場景
          'default': 0.7            // 預設場景
        };
        
        threshold = scenarioThresholds[scenarioId] || scenarioThresholds['default'];
      }
      
      console.log(`動態閾值: ${threshold}, 最佳匹配分數: ${bestMatch.score}`);
      
      // 檢查匹配分數是否足夠高
      if (bestMatch.score > threshold) {
        // 檢查是否在開發環境
        const isDevelopment = process.env.NODE_ENV === 'development';
        
        if (isDevelopment) {
          // 在開發環境中，在回覆中包含匹配信息
          return NextResponse.json({ 
            response: bestMatch.answer,
            debug: {
              matchedQuestion: bestMatch.question,
              score: bestMatch.score
            }
          });
        } else {
          // 在生產環境中，只返回回答
          return NextResponse.json({ response: bestMatch.answer });
        }
      }
    }
    
    // 如果沒有找到匹配或匹配分數不夠高，返回預設回覆
    const defaultResponses = [
      '抱歉，我沒有聽清楚您說的話，能再說一次嗎？',
      '對不起，我剛才在照顧小威，您能再重複一次嗎？',
      '不好意思，我沒聽懂您的意思，能請您再說一次嗎？',
      '抱歉，我有點分心，您能再說一次嗎？',
      '對不起，我剛才沒聽清楚，請您再說一次好嗎？'
    ];
    
    const randomResponse = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
    
    return NextResponse.json({ response: randomResponse });
    
  } catch (error) {
    console.error('AI回覆處理錯誤:', error);
    return NextResponse.json(
      { error: '處理請求時出錯' },
      { status: 500 }
    );
  }
}

// 使用更好的中文分詞
function segmentChinese(text: string): string[] {
  // 这里可以集成专业的中文分词库，如jieba-js
  // 简单实现：按字符分词，并保留完整的英文单词和数字
  const result: string[] = [];
  let currentWord = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = text.charCodeAt(i);
    
    // 中文字符
    if (code >= 0x4e00 && code <= 0x9fff) {
      if (currentWord) {
        result.push(currentWord);
        currentWord = '';
      }
      result.push(char);
    }
    // 英文字母和数字
    else if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122) || (code >= 48 && code <= 57)) {
      currentWord += char;
    }
    // 其他字符（标点等）
    else {
      if (currentWord) {
        result.push(currentWord);
        currentWord = '';
      }
    }
  }
  
  if (currentWord) {
    result.push(currentWord);
  }
  
  return result;
}

// 使用更复杂的相似度计算函数
function calculateSimilarity(text1: string, text2: string): number {
  // 对中文文本进行分词
  const words1 = segmentChinese(text1.toLowerCase());
  const words2 = segmentChinese(text2.toLowerCase());
  
  // 计算TF-IDF加权的余弦相似度
  return cosineSimilarityWithTFIDF(words1, words2);
}

// TF-IDF加权的余弦相似度
function cosineSimilarityWithTFIDF(words1: string[], words2: string[]): number {
  // 所有唯一词
  const allWords = Array.from(new Set([...words1, ...words2]));
  
  // 计算词频
  const tf1 = calculateTF(words1);
  const tf2 = calculateTF(words2);
  
  // 计算逆文档频率
  const idf = calculateIDF([words1, words2], allWords);
  
  // 计算TF-IDF向量
  const vector1 = allWords.map(word => (tf1[word] || 0) * idf[word]);
  const vector2 = allWords.map(word => (tf2[word] || 0) * idf[word]);
  
  // 计算余弦相似度
  return cosine(vector1, vector2);
}

// 计算词频
function calculateTF(words: string[]): Record<string, number> {
  const tf: Record<string, number> = {};
  words.forEach(word => {
    tf[word] = (tf[word] || 0) + 1;
  });
  
  // 归一化
  const total = words.length;
  Object.keys(tf).forEach(word => {
    tf[word] = tf[word] / total;
  });
  
  return tf;
}

// 计算逆文档频率
function calculateIDF(documents: string[][], allWords: string[]): Record<string, number> {
  const idf: Record<string, number> = {};
  const N = documents.length;
  
  allWords.forEach(word => {
    const containingDocs = documents.filter(doc => doc.includes(word)).length;
    idf[word] = Math.log(N / (containingDocs || 1));
  });
  
  return idf;
}

// 计算余弦相似度
function cosine(vector1: number[], vector2: number[]): number {
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;
  
  for (let i = 0; i < vector1.length; i++) {
    dotProduct += vector1[i] * vector2[i];
    magnitude1 += vector1[i] * vector1[i];
    magnitude2 += vector2[i] * vector2[i];
  }
  
  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);
  
  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  
  return dotProduct / (magnitude1 * magnitude2);
}

// 提取关键词
function extractKeywords(text: string): string[] {
  const words = segmentChinese(text.toLowerCase());
  
  // 过滤掉停用词
  const stopWords = ['的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这'];
  
  return words.filter(word => !stopWords.includes(word) && word.length > 1);
}

// 计算关键词匹配分数
function calculateKeywordMatchScore(text: string, keywords: string[]): number {
  const textWords = segmentChinese(text.toLowerCase());
  
  let matchCount = 0;
  for (const keyword of keywords) {
    if (textWords.includes(keyword)) {
      matchCount++;
    }
  }
  
  return keywords.length > 0 ? matchCount / keywords.length : 0;
}

// 添加模糊匹配
function fuzzyMatch(text: string, pattern: string): boolean {
  // 简化文本和模式
  const simplifiedText = text.toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9]/g, '');
  const simplifiedPattern = pattern.toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9]/g, '');
  
  // 检查文本是否包含模式的所有字符（按顺序）
  let j = 0;
  for (let i = 0; i < simplifiedText.length && j < simplifiedPattern.length; i++) {
    if (simplifiedText[i] === simplifiedPattern[j]) {
      j++;
    }
  }
  
  return j === simplifiedPattern.length;
} 