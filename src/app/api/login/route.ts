import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { signJWT } from '@/lib/jwt';

export async function POST(request: Request) {
  try {
    const { username } = await request.json();
    
    if (!username) {
      return NextResponse.json(
        { error: '請提供學號' },
        { status: 400 }
      );
    }
    
    // 查詢用戶
    const user = await prisma.user.findUnique({
      where: { username },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: '找不到此學號的用戶' },
        { status: 404 }
      );
    }
    
    // 生成 JWT 令牌
    const token = await signJWT({ userId: user.id });
    
    // 設置 cookie
    const response = NextResponse.json(
      { 
        message: '登入成功',
        user: {
          id: user.id,
          username: user.username,
          nickname: user.username, // 使用學號作為暱稱
          email: `${user.username}@stu.ypu.edu.tw`, // 生成臨時郵箱
          role: 'NURSE',
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        token
      },
      { status: 200 }
    );
    
    // 設置 cookie (7天過期)
    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    
    return response;
  } catch (error) {
    console.error('登入處理錯誤:', error);
    return NextResponse.json(
      { error: '登入失敗，請稍後再試' },
      { status: 500 }
    );
  }
} 