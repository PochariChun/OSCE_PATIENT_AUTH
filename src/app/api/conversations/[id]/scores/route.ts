// ✅ 新增 API：/api/conversations/[id]/scores/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getScoringItemStatus } from '@/lib/scoring';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = parseInt(params.id);
    if (isNaN(conversationId)) {
      return NextResponse.json({ error: '無效的 conversation ID' }, { status: 400 });
    }

    const { scoredItems, missedItems } = await getScoringItemStatus(conversationId);

    const scoredList = [...new Set(scoredItems.map(item => `${item.category}_${item.subcategory}`))];
    const unscoredList = [...new Set(missedItems.map(item => `${item.category}_${item.subcategory}`))];
    const recordedList = scoredItems.filter(item => item.category === '紀錄').map(item => `${item.category}_${item.subcategory}`);
    const unrecordedList = missedItems.filter(item => item.category === '紀錄').map(item => `${item.category}_${item.subcategory}`);

    return NextResponse.json({
      scoredList,
      unscoredList,
      recordedList,
      unrecordedList
    });
  } catch (error) {
    return NextResponse.json({ error: '取得分數項目失敗', details: (error as Error).message }, { status: 500 });
  }
}
