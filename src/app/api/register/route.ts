import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { NextResponse } from 'next/server';
import { generateJWT } from '@/lib/jwt';

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();
    
    // 驗證輸入
    if (!name || !email || !password) {
      return NextResponse.json({ error: '姓名、電子郵件和密碼為必填項' }, { status: 400 });
    }
    
    // 檢查電子郵件是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      return NextResponse.json({ error: '該電子郵件已被註冊' }, { status: 409 });
    }
    
    // 加密密碼
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 創建用戶
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: 'student', // 預設角色
        isActive: true,
      },
    });
    
    // 生成 JWT
    const token = generateJWT({ id: user.id });
    
    // 創建響應
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
    
    // 設置 cookie
    response.cookies.set({
      name: 'auth-token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 天
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('註冊失敗:', error);
    return NextResponse.json({ error: '註冊失敗' }, { status: 500 });
  }
} 