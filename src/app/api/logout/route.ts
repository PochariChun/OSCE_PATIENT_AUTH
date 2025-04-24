import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  // 清除 auth_token cookie
  cookies().delete('auth_token');
  
  return NextResponse.json({ message: '登出成功' });
} 