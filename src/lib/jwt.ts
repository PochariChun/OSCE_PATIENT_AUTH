import jwt from 'jsonwebtoken';

// 確保使用正確的密鑰
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 簽署 JWT 令牌
export function signJWT(payload: any, expiresIn: string = '7d') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

// 驗證 JWT 令牌
export function verifyJWT(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// 添加一個測試函數
export function testJWT() {
  try {
    const testPayload = { test: 'data' };
    const token = signJWT(testPayload);
    const decoded = verifyJWT(token);
    
    if (!decoded) {
      console.error('JWT 測試失敗: 無法驗證令牌');
      return false;
    }
    
    console.log('JWT 測試成功');
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