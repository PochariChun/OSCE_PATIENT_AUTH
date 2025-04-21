import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const { name, password } = await req.json();

  if (!name || !password) {
    return NextResponse.json({ error: '用戶名和密碼為必填項' }, { status: 400 });
  }

  const users = await prisma.user.findMany({ where: { name } });
  if (users.length === 0) {
    return NextResponse.json({ error: '帳號不存在' }, { status: 401 });
  }

  // 檢查所有同名用戶的密碼
  for (const user of users) {
    const isValid = await bcrypt.compare(password, user.password);
    if (isValid) {
      return NextResponse.json({
        message: '登入成功',
        user: { name: user.name },
      });
    }
  }

  return NextResponse.json({ error: '密碼錯誤' }, { status: 401 });
} 