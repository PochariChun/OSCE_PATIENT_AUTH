import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  // 創建響應
  const response = NextResponse.json({
    success: true,
    message: '已成功登出',
  });
  
  // 清除 cookie
  response.cookies.set({
    name: 'auth_token',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0, // 立即過期
  });
  
  return response;
} 