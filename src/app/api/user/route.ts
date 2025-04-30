import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';

export async function GET(request: Request) {
  try {
    // 從 cookie 獲取令牌
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) {
      return NextResponse.json(
        { error: '未授權訪問' },
        { status: 401 }
      );
    }
    
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);
    
    const token = cookies['auth_token'];
    if (!token) {
      return NextResponse.json(
        { error: '未授權訪問' },
        { status: 401 }
      );
    }
    
    // 驗證令牌
    const payload = await verifyJWT(token);
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: '無效的令牌' },
        { status: 401 }
      );
    }
    
    // 查詢用戶
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: '找不到用戶' },
        { status: 404 }
      );
    }
    
    // 返回用戶資訊
    return NextResponse.json({
      id: user.id,
      username: user.username,
      nickname: user.username, // 使用學號作為暱稱
      email: `${user.username}@stu.ypu.edu.tw`, // 生成臨時郵箱
      role: 'NURSE',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    console.error('獲取用戶資訊錯誤:', error);
    return NextResponse.json(
      { error: '獲取用戶資訊失敗' },
      { status: 500 }
    );
  }
} 