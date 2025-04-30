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
    
    // 檢查用戶是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: '此學號已註冊' },
        { status: 409 }
      );
    }
    
    // 創建新用戶
    const newUser = await prisma.user.create({
      data: {
        username,
        isActive: true,
      },
    });
    
    // 生成 JWT 令牌
    const token = await signJWT({ userId: newUser.id });
    
    // 設置 cookie 並返回用戶資訊
    const response = NextResponse.json(
      { 
        message: '註冊成功',
        user: {
          id: newUser.id,
          username: newUser.username,
          nickname: newUser.username, // 使用學號作為暱稱
          email: `${newUser.username}@stu.ypu.edu.tw`, // 生成臨時郵箱
          role: 'NURSE',
          createdAt: newUser.createdAt,
          updatedAt: newUser.updatedAt
        },
        token
      },
      { status: 201 }
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
    console.error('註冊處理錯誤:', error);
    return NextResponse.json(
      { error: '註冊失敗，請稍後再試' },
      { status: 500 }
    );
  }
} 