import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/jwt';

export async function PATCH(request: Request) {
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
    
    // 獲取請求體
    const { name, email } = await request.json();
    
    // 更新用戶資訊
    const updatedUser = await prisma.user.update({
      where: { id: payload.userId },
      data: {
        name: name || undefined,
        email: email || undefined,
      },
    });
    
    // 返回更新後的用戶資訊
    return NextResponse.json({
      id: updatedUser.id,
      username: updatedUser.username,
      nickname: updatedUser.username, // 使用學號作為暱稱
      name: updatedUser.name,
      email: updatedUser.email || `${updatedUser.username}@stu.ypu.edu.tw`, // 使用更新後的郵箱或生成臨時郵箱
      role: 'NURSE',
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt
    });
  } catch (error) {
    console.error('更新用戶資訊錯誤:', error);
    return NextResponse.json(
      { error: '更新用戶資訊失敗' },
      { status: 500 }
    );
  }
} 