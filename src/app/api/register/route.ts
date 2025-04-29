import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { NextResponse } from 'next/server';
import { signJWT } from '@/lib/jwt';

export async function POST(req: Request) {
  try {
    console.log('API 環境:', process.env.NODE_ENV);
    console.log('API 請求方法:', req.method);
    console.log('API 請求頭:', Object.fromEntries([...req.headers.entries()]));

    // 嘗試解析請求體
    const requestText = await req.text();
    console.log('API 請求體原始文本:', requestText);
    
    let requestData;
    try {
      requestData = JSON.parse(requestText);
      console.log('API 請求體解析後數據:', requestData);
    } catch (parseError) {
      console.error('解析請求 JSON 失敗:', parseError);
      return errorResponse('無效的 JSON 數據', 400);
    }
    
    const { username, nickname, email, password } = requestData;
    
    console.log('數據庫 URL 前綴:', process.env.DATABASE_URL?.split('://')[0]);
    console.log('數據庫 URL 是否存在:', !!process.env.DATABASE_URL);

    // 嘗試解析數據庫 URL
    try {
      const dbUrl = process.env.DATABASE_URL || '';
      const dbUrlObj = new URL(dbUrl);
      console.log('數據庫類型:', dbUrlObj.protocol);
      console.log('數據庫主機:', dbUrlObj.hostname);
      console.log('數據庫端口:', dbUrlObj.port);
      console.log('數據庫名稱:', dbUrlObj.pathname.substring(1));
    } catch (urlError) {
      console.error('解析數據庫 URL 失敗:', urlError);
    }
    
    console.log('收到註冊請求');
    console.log('註冊數據:', { username, nickname, email: email || '未提供', passwordLength: password?.length || 0 });
    
    // 檢查必要欄位
    if (!username || !password) {
      console.log('缺少必要欄位');
      return errorResponse('用戶名和密碼為必填項', 400);
    }
    
    // 檢查用戶名是否已存在
    console.log('檢查用戶名是否已存在:', username);
    const existingUsername = await prisma.user.findUnique({
      where: { username }
    });
    
    if (existingUsername) {
      console.log('用戶名已存在');
      return errorResponse('該用戶名已被使用', 400);
    }
    
    // 如果提供了電子郵件，檢查是否已存在
    if (email) {
      console.log('檢查電子郵件是否已存在:', email);
      const existingEmail = await prisma.user.findUnique({
        where: { email }
      });
      
      if (existingEmail) {
        console.log('電子郵件已存在');
        return errorResponse('該電子郵件已被註冊', 400);
      }
    }
    
    // 檢查數據庫連接
    console.log('檢查數據庫連接');
    try {
      // 執行一個簡單的查詢來測試連接
      const testResult = await prisma.$queryRaw`SELECT 1 as test`;
      console.log('數據庫連接測試結果:', testResult);
    } catch (dbError: unknown) {
      console.error('數據庫連接測試失敗:', dbError);
      return errorResponse('無法連接到數據庫', 500, { error: dbError instanceof Error ? dbError.message : String(dbError) });
    }
    
    // 加密密碼
    console.log('加密密碼');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // 如果沒有提供電子郵件，使用空字串
    const emailToUse = email || '';

    // 如果沒有提供暱稱，使用用戶名作為預設值
    const nicknameToUse = nickname || username;

    // 創建新用戶
    console.log('創建新用戶');

    const user = await prisma.user.create({
      data: {
        username,
        nickname: nicknameToUse,
        email: emailToUse,
        password: hashedPassword,
        role: 'NURSE', // 修改預設角色為護士
      },
    });
    
    console.log('用戶創建成功:', { id: user.id, username: user.username });
    
    // 創建 JWT 令牌
    console.log('創建 JWT 令牌');
    const token = signJWT({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });
    
    // 返回用戶信息和令牌
    console.log('返回用戶信息和令牌');
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (error: any) {
    console.error('處理請求時發生錯誤:', error);
    const errorMessage = error.message || '註冊過程中發生錯誤';
    const errorCode = error.code || 'UNKNOWN_ERROR';
    
    return errorResponse(errorMessage, 500, { code: errorCode, details: error.toString() });
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