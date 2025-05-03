// src/lib/jwt.ts
import jwt, { SignOptions } from 'jsonwebtoken';

// 確保使用正確的密鑰
const JWT_SECRET: string = process.env.JWT_SECRET || 'your-secret-key';

// 你可以定義 payload 的型別
export interface JWTPayload {
  userId: number;
  role?: string;
}

// 簽署 JWT 令牌
export function signJWT<T extends Record<string, any>>(payload: T, expiresIn: string = '7d') {
  return jwt.sign(payload as object, JWT_SECRET, {
    expiresIn: expiresIn as any // 🔥 加上這行斷言即可繞過錯誤
  });
}

// 驗證 JWT 令牌
export function verifyJWT<T extends object = JWTPayload>(token: string): T {
  return jwt.verify(token, JWT_SECRET) as T;
}

// 添加一個測試函數
export function testJWT() {
  try {
    const testPayload = { test: 'data' };
    const token = signJWT(testPayload);
    const decoded = verifyJWT(token);

    console.log('JWT 測試成功:', decoded);
    return true;
  } catch (error) {
    console.error('JWT 測試失敗:', error);
    return false;
  }
}

// 在開發環境中自動測試 JWT
if (process.env.NODE_ENV === 'development') {
  testJWT();
} 