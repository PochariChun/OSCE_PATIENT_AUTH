import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { NextResponse } from 'next/server';
import { signJWT } from '@/lib/jwt';

export async function POST(req: Request) {
  try {
    console.log('登入 API 被調用');
    
    // 解析請求數據
    const requestText = await req.text();
    console.log('登入 API 請求體原始文本:', requestText);
    
    let requestData;
    try {
      requestData = JSON.parse(requestText);
      console.log('登入 API 請求體解析後數據:', { login: requestData.login, passwordLength: requestData.password?.length || 0 });
    } catch (parseError) {
      console.error('解析請求 JSON 失敗:', parseError);
      return errorResponse('無效的 JSON 數據', 400);
    }
    
    const { login, password } = requestData;
    
    if (!login || !password) {
      return errorResponse('用戶名/電子郵件和密碼為必填項', 400);
    }

    // 查找用戶 (支持使用 email 或 username 登入)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: login },
          ...(login.includes('@') ? [{ email: login }] : [])
        ]
      },
    });

    if (!user) {
      console.log('用戶不存在:', login);
      return errorResponse('用戶名或密碼不正確', 401);
    }

    // 驗證密碼
    console.log('驗證密碼');
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      console.log('密碼不匹配');
      return errorResponse('用戶名或密碼不正確', 401);
    }

    // 創建 JWT 令牌
    console.log('創建 JWT 令牌');
    const token = signJWT({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    // 返回用戶信息和令牌
    console.log('登入成功，返回用戶信息和令牌');
    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        email: user.email,
        role: user.role,
      },
      token
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
  } catch (error: any) {
    console.error('登入處理錯誤:', error);
    return errorResponse('登入處理錯誤', 500, error.toString());
  }
}

function errorResponse(message: string, status: number = 400, details?: any) {
  return NextResponse.json(
    { 
      success: false,
      error: message,
      details: process.env.NODE_ENV === 'development' ? details : undefined
    },
    { status }
  );
} 