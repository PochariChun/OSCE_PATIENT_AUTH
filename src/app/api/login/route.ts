import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { NextResponse } from 'next/server';
import { signJWT } from '@/lib/jwt';

export async function POST(req: Request) {
  try {
    const { login, password } = await req.json();
    console.log('登入請求:', { login });

    if (!login || !password) {
      return NextResponse.json({ error: '帳號和密碼為必填項' }, { status: 400 });
    }

    // 檢查 login 是電子郵件還是用戶名
    const isEmail = login.includes('@');
    
    // 根據登入類型查詢用戶
    const user = await prisma.user.findFirst({
      where: isEmail 
        ? { email: login } 
        : { username: login },
    });

    if (!user) {
      return NextResponse.json({ error: '帳號不存在' }, { status: 401 });
    }


    // 所有用戶都使用 bcrypt 比較
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
        return NextResponse.json({ error: '密碼錯誤' }, { status: 401 });
    }
    

    // 不要返回密碼
    const { password: _, ...userWithoutPassword } = user;
    
    console.log('登入成功');
    
    // 簡化版本：不設置 JWT，直接返回用戶信息
    const response = NextResponse.json({
      message: '登入成功',
      user: userWithoutPassword,
    });

    // 生成 JWT 令牌
    const token = signJWT({ 
      id: user.id, 
      email: user.email,
      role: user.role 
    });

    // 設置 cookie
    response.cookies.set({
      name: 'auth_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 天
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('登入處理錯誤:', error);
    return NextResponse.json({ error: '登入處理錯誤' }, { status: 500 });
  }
} 