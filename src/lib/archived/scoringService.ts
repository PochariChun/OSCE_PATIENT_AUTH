import { scoringCriteria } from './scoringCriteria';

// 定義對話類型
interface Message {
  sender: string;
  text: string;
}

interface Conversation {
  messages: Message[];
}

// 評分邏輯函數
export function evaluateConversation(conversation: Conversation) {
  let totalScore = 0;
  const evaluationDetails: Record<string, any> = {};
  
  // 只獲取學生的訊息
  const studentMessages = conversation.messages
    .filter((msg) => msg.sender === 'user')
    .map((msg) => msg.text.toLowerCase());
  
  // 遍歷評分標準進行評分
  for (const category in scoringCriteria) {
    evaluationDetails[category] = {};
    let categoryScore = 0;
    
    for (const item in scoringCriteria[category]) {
      const criteria = scoringCriteria[category][item];
      const maxPoints = criteria.score;
      let points = 0;
      
      // 檢查學生訊息中是否包含關鍵字
      const studentKeywordsFound = criteria.studentKeywords.some((keyword: string) => 
        studentMessages.some((msg: string) => msg.includes(keyword))
      );
      
      // 如果學生提問包含關鍵字，則得分
      if (studentKeywordsFound) {
        points = maxPoints;
      }
      
      evaluationDetails[category][item] = {
        maxPoints,
        points,
        studentKeywordsFound
      };
      
      categoryScore += points;
    }
    
    evaluationDetails[category].totalPoints = categoryScore;
    totalScore += categoryScore;
  }
  
  return { score: totalScore, evaluationDetails };
} 