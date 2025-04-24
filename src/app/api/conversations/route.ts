import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
    }
    
    // 查询数据库获取对话历史
    const conversations = await prisma.conversation.findMany({
      where: {
        userId: parseInt(userId)
      },
      orderBy: {
        startedAt: 'desc'
      },
      take: 10 // 只获取最近的10条记录
    });
    
    // 将数据库记录转换为前端需要的格式
    const history = conversations.map((conv: any) => ({
      id: conv.id,
      title: `