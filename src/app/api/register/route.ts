// src/app/api/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signJWT } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    const { username, gender }: { username: string; gender?: string } = await request.json();
    
    // 只檢查用戶名是否提供
    if (!username) {
      return NextResponse.json(
        { error: '請提供學號' },
        { status: 400 }
      );
    }
    
    // 檢查用戶名是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: '此學號已註冊' },
        { status: 409 }
      );
    }
    
    // 創建新用戶 - 使用默認值
    const newUser = await prisma.user.create({
      data: {
        username,
        email: `${username}@stu.ypu.edu.tw`, // 生成臨時郵箱
        password: '', // 空密碼，因為不需要密碼登錄
        nickname: username, // 使用學號作為名稱
        gender: gender,
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
          nickname: newUser.nickname, // 使用學號作為暱稱
          email: newUser.email,
          role: newUser.role,
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