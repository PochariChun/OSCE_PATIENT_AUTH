import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/jwt';

export async function PUT(req: Request) {
  try {
    // 驗證用戶身份
    const token = req.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: '未授權' }, { status: 401 });
    }
    
    const payload = verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: '無效的令牌' }, { status: 401 });
    }
    
    // 解析請求數據
    const { name, nickname } = await req.json();
    
    // 更新用戶資料
    const updatedUser = await prisma.user.update({
      where: { id: payload.id },
      data: {
        ...(name !== undefined && { name }),
        ...(nickname !== undefined && { nickname }),
      },
    });
    
    // 返回更新後的用戶資料
    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        nickname: updatedUser.nickname,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    console.error('更新用戶資料失敗:', error);
    return NextResponse.json({
      success: false,
      error: '更新用戶資料失敗',
      details: process.env.NODE_ENV === 'development' ? error.toString() : undefined,
    }, { status: 500 });
  }
} 