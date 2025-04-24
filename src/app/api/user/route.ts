import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';

export async function GET(req: Request) {
  try {
    // 從請求頭中獲取 Cookie
    const cookieHeader = req.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map(cookie => {
        const [name, value] = cookie.split('=');
        return [name, value];
      })
    );
    
    const token = cookies['auth-token'];
    
    if (!token) {
      return NextResponse.json({ error: '未授權' }, { status: 401 });
    }
    
    // 驗證 token
    const payload = verifyJWT<{ id: number }>(token);
    if (!payload) {
      return NextResponse.json({ error: '無效的令牌' }, { status: 401 });
    }
    
    // 獲取用戶信息
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    if (!user) {
      return NextResponse.json({ error: '用戶不存在' }, { status: 404 });
    }
    
    return NextResponse.json({ user });
  } catch (error) {
    console.error('獲取用戶信息錯誤:', error);
    return NextResponse.json({ error: '獲取用戶信息失敗' }, { status: 500 });
  }
} 