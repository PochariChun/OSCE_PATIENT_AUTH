import fs from 'fs';
import path from 'path';
import { normalizeNames } from './textUtils';
import { scoringCriteria } from './archived/scoringCriteria';

// 定義對話類型
interface Message {
  sender: string;
  text: string;
}

interface Conversation {
  messages: Message[];
}

// 定義 RAG 數據結構
interface RAGItem {
  question: string;
  answer: string;
  tags: string[];
  scoringCategory?: string;
  scoringItem?: string;
  scoringSubItem?: string | string[];
  answerType?: string;
  isNotScoring?: boolean;
}

// 加載 RAG 數據
function loadRAGData(): RAGItem[] {
  const filePath = path.join(process.cwd(), 'src/lib/rag_lookup_data.jsonl');
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const lines = fileContent.split('\n').filter(line => line.trim() && !line.startsWith('//'));
  
  return lines.map(line => JSON.parse(line));
}

// 評分邏輯函數
export async function evaluateConversationWithRAG(conversation: Conversation) {
  // 加載 RAG 數據
  const ragData = loadRAGData();
  
  console.log(`===== 開始評分 =====`);
  console.log(`總共加載了 ${ragData.length} 條 RAG 數據項`);
  
  // 只獲取學生的訊息
  const studentMessages = conversation.messages
    .filter((msg) => msg.sender === 'user')
    .map((msg) => normalizeNames(msg.text.toLowerCase()));
  
  console.log(`學生總共發送了 ${studentMessages.length} 條訊息`);
  
  // 創建評分結果對象
  const evaluationDetails: Record<string, any> = {};
  let totalScore = 0;
  
  // 追蹤已評分的項目，避免重複計分
  const scoredItems = new Set<string>();
  
  // 初始化評分結果結構
  for (const category in scoringCriteria) {
    evaluationDetails[category] = {};
    for (const item in scoringCriteria[category]) {
      evaluationDetails[category][item] = {
        points: 0,
        maxPoints: scoringCriteria[category][item].score
      };
    }
  }
  
  // 遍歷學生訊息
  for (let i = 0; i < studentMessages.length; i++) {
    const studentMsg = studentMessages[i];
    console.log(`\n評分訊息 #${i+1}: "${studentMsg}"`);
    
    // 方法1: 使用 RAG 匹配
    let bestMatch: RAGItem | null = null;
    let bestScore = 0;
    
    for (const ragItem of ragData) {
      // 跳過不計分的項目
      if (ragItem.isNotScoring) continue;
      
      // 相似度計算 - 降低閾值到 0.5
      const similarity = calculateSimilarity(studentMsg, ragItem.question.toLowerCase());
      
      if (similarity > bestScore && similarity > 0.5) { // 降低閾值
        bestScore = similarity;
        bestMatch = ragItem;
      }
    }
    
    // 如果找到匹配項
    if (bestMatch) {
      console.log(`RAG匹配: "${bestMatch.question}" (相似度: ${bestScore.toFixed(2)})`);
      
      if (bestMatch.scoringCategory && bestMatch.scoringItem) {
        const category = bestMatch.scoringCategory;
        const item = bestMatch.scoringItem;
        
        // 檢查該項目是否已經得分
        if (!scoredItems.has(`${category}:${item}`)) {
          // 從 scoringCriteria 獲取分數
          const maxPoints = scoringCriteria[category]?.[item]?.score || 0;
          
          if (maxPoints > 0) {
            evaluationDetails[category][item].points = maxPoints;
            totalScore += maxPoints;
            
            console.log(`得分! 類別 "${category}" 項目 "${item}" 獲得 ${maxPoints} 分 (總分: ${totalScore})`);
            
            // 標記為已評分
            scoredItems.add(`${category}:${item}`);
          }
        } else {
          console.log(`項目 "${category}:${item}" 已經得過分，不重複計分`);
        }
      }
    } else {
      console.log(`沒有找到 RAG 匹配項`);
    }
    
    // 方法2: 使用關鍵字匹配
    for (const category in scoringCriteria) {
      for (const item in scoringCriteria[category]) {
        // 如果該項目已經得分，跳過
        if (scoredItems.has(`${category}:${item}`)) continue;
        
        const criteria = scoringCriteria[category][item];
        
        // 檢查學生訊息中是否包含關鍵字
        const hasKeyword = criteria.studentKeywords.some(keyword => 
          studentMsg.includes(keyword.toLowerCase())
        );
        
        if (hasKeyword) {
          console.log(`關鍵字匹配: 在訊息中找到 "${category}" 類別 "${item}" 的關鍵字`);
          
          evaluationDetails[category][item].points = criteria.score;
          totalScore += criteria.score;
          
          console.log(`得分! 類別 "${category}" 項目 "${item}" 獲得 ${criteria.score} 分 (總分: ${totalScore})`);
          
          // 標記為已評分
          scoredItems.add(`${category}:${item}`);
        }
      }
    }
  }
  
  // 計算每個類別的總分
  console.log(`\n===== 評分摘要 =====`);
  for (const category in evaluationDetails) {
    let categoryTotal = 0;
    
    for (const item in evaluationDetails[category]) {
      categoryTotal += evaluationDetails[category][item].points;
      console.log(`類別 "${category}" 項目 "${item}": ${evaluationDetails[category][item].points}/${evaluationDetails[category][item].maxPoints} 分`);
    }
    
    evaluationDetails[category].totalPoints = categoryTotal;
    console.log(`類別 "${category}" 總分: ${categoryTotal}`);
  }
  
  console.log(`總得分: ${totalScore}`);
  console.log(`===== 評分結束 =====`);
  
  return { score: totalScore, evaluationDetails };
}

// 改進的相似度計算函數
function calculateSimilarity(text1: string, text2: string): number {
  // 將文本轉換為詞集合
  const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 1));
  const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 1));
  
  // 計算交集大小
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  
  // 計算並集大小
  const union = new Set([...words1, ...words2]);
  
  // Jaccard 相似度
  return intersection.size / union.size;
} 