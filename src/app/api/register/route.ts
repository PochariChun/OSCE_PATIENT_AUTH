import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { email, username, nickname, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json({ error: '帳號和密碼為必填' }, { status: 400 });
  }

  // 檢查 username 是否已存在
  const existingUsername = await prisma.user.findFirst({ where: { username } });
  if (existingUsername) {
    return NextResponse.json({ error: '帳號已存在' }, { status: 400 });
  }

  // 如果提供了電子郵件，檢查是否已存在
  if (email) {
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json({ error: '電子郵件已被註冊' }, { status: 400 });
    }
  }

  const hash = await bcrypt.hash(password, 10);

  // 創建用戶，使用隨機生成的電子郵件如果未提供
  const user = await prisma.user.create({
    data: { 
      email: email || '', // 如果未提供電子郵件，就保留空位
      username, 
      nickname: nickname || username, // 如果未提供暱稱，使用用戶名
      password: hash,
      role: 'nurse', // 預設角色
      name: username, // 使用 username 作為 name
    },
  });

  return NextResponse.json({ 
    message: '註冊成功', 
    user: { username: user.username, nickname: user.nickname } 
  });
} 