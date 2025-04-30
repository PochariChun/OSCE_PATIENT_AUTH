// import { NextRequest, NextResponse } from 'next/server';
// import { prisma } from '@/lib/prisma';

// // 添加動態配置
// export const dynamic = 'force-dynamic';

// export async function POST(
//   request: NextRequest,
//   context: { params: { id: string } }
// ) {
//   try {
//     // 從 URL 路徑獲取對話 ID
//     const conversationId = parseInt(context.params.id);
    
//     if (isNaN(conversationId)) {
//       return NextResponse.json({ error: '無效的對話ID' }, { status: 400 });
//     }

//     // 獲取對話詳情
//     const conversation = await prisma.conversation.findUnique({
//       where: {
//         id: conversationId,
//       },
//       include: {
//         messages: {
//           orderBy: {
//             timestamp: 'asc',
//           },
//           select: {
//             id: true,
//             sender: true,
//             text: true,
//             timestamp: true,
//           },
//         },
//       },
//     });

//     if (!conversation) {
//       return NextResponse.json({ error: '對話不存在' }, { status: 404 });
//     }



//     // 更新對話的分數
//     await prisma.conversation.update({
//       where: { id: conversationId },
//       data: { score },
//     });

//     // 返回評分結果
//     return NextResponse.json({
//       score,
//       evaluationDetails,
//     });
//   } catch (error) {
//     console.error('評分對話失敗:', error);
//     return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
//   }
// } 

try {
  const { id } = params;
  const conversationId = parseInt(id as string);
  
  if (isNaN(conversationId)) {
    return NextResponse.json({ error: '無效的對話 ID' }, { status: 400 });
  }
  
  const requestData = await req.json();
  const { score } = requestData;
  
  if (typeof score !== 'number' || score < 0 || score > 100) {
    return NextResponse.json({ error: '分數必須是 0-100 之間的數字' }, { status: 400 });
  }
  
  // 更新對話分數
  const updatedConversation = await prisma.conversation.update({
    where: { id: conversationId },
    data: { score }
  });
  
  return NextResponse.json(updatedConversation);
} catch (error) {
  console.error('更新對話分數時發生錯誤:', error);
  return NextResponse.json({ error: '更新分數失敗' }, { status: 500 });
} 