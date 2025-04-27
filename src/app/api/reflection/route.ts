import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, messages, reflectionCards, currentStage, systemPrompt } = body;
    
    // 這裡應該調用 OpenAI 或其他 AI 服務
    // 為了示範，我們模擬一個簡單的回應
    
    let nextStage = currentStage;
    let content = '';
    
    // 獲取用戶最後一條訊息
    const userLastMessage = messages[messages.length - 1].content;
    
    // 根據當前階段和用戶訊息決定下一階段和回應內容
    switch (currentStage) {
      case 'description':
        if (userLastMessage.length > 20) {
          nextStage = 'feelings';
          content = '謝謝您的描述。在這個對話過程中，您感受如何？有沒有特別的情緒或感覺？例如緊張、滿意、困惑或其他感受？';
        } else {
          content = '能否再多描述一些細節？例如，您記得對話的主要內容是什麼？您的目標是什麼？';
        }
        break;
        
      case 'feelings':
        if (userLastMessage.length > 15) {
          nextStage = 'evaluation';
          content = '了解您的感受了。回顧這次對話，您認為哪些部分做得好？哪些部分可能需要改進？';
        } else {
          content = '請再多分享一些您的感受。這些感受對您的表現有什麼影響嗎？';
        }
        break;
        
      case 'evaluation':
        if (userLastMessage.length > 20) {
          nextStage = 'analysis';
          content = '您的評價很有洞察力。現在，讓我們更深入地分析：為什麼會出現這些情況？有哪些因素影響了對話的進行？';
        } else {
          content = '請嘗試更具體地評價您的表現。例如，您的提問技巧、傾聽能力或回應方式如何？';
        }
        break;
        
      case 'analysis':
        if (userLastMessage.length > 25) {
          nextStage = 'conclusion';
          content = '您的分析很深入。綜合以上所有反思，您從這次對話中學到了什麼？這些經驗對您未來的醫病溝通有什麼啟示？';
        } else {
          content = '請再深入思考一下。例如，您的溝通方式如何影響了病人的回應？環境或時間壓力是否也是因素？';
        }
        break;
        
      case 'conclusion':
        if (userLastMessage.length > 20) {
          nextStage = 'action';
          content = '很好的總結。最後，您計劃如何將這些學習應用到未來的實踐中？有什麼具體的改進策略或行動計劃嗎？';
        } else {
          content = '請嘗試總結一下您的主要收穫。這次經驗如何改變了您對醫病溝通的理解？';
        }
        break;
        
      case 'action':
        content = '感謝您完成這次深度反思！您的行動計劃非常具體且有建設性。持續的反思和實踐將幫助您成為更優秀的醫療專業人員。如果您已完成反思，可以點擊「完成反思」按鈕。';
        break;
        
      default:
        content = '請分享您對這次對話的想法和感受。';
    }
    
    // 在實際應用中，這裡應該調用 AI API
    // const aiResponse = await callAIService(messages, systemPrompt, reflectionCards);
    // return NextResponse.json(aiResponse);
    
    return NextResponse.json({
      content,
      nextStage
    });
    
  } catch (error) {
    console.error('反思 API 錯誤:', error);
    return NextResponse.json({ error: '處理反思請求失敗' }, { status: 500 });
  }
} 