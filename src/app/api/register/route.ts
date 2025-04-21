import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const { email, name, password } = await req.json();

  if (!email || !password || !name) {
    return NextResponse.json({ error: '所有欄位皆為必填' }, { status: 400 });
  }

  // 檢查 email 是否已存在
  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    return NextResponse.json({ error: '電子郵件已被註冊' }, { status: 400 });
  }

  // 檢查 name 是否已存在
  const existingName = await prisma.user.findFirst({ where: { name } });
  if (existingName) {
    return NextResponse.json({ error: '帳號已存在' }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: { email, name, password: hash },
  });

  return NextResponse.json({ 
    message: '註冊成功', 
    user: { name: user.name } 
  });
} 