import jwt from 'jsonwebtoken';

// 從環境變量獲取 JWT 密鑰，或使用默認值
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 生成 JWT 令牌
export function signJWT(payload: any, expiresIn = '1d') {
  if (!JWT_SECRET) {
    console.error('警告: JWT_SECRET 未設置');
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

// 驗證 JWT 令牌
export function verifyJWT<T>(token: string): T | null {
  try {
    if (!JWT_SECRET) {
      console.error('警告: JWT_SECRET 未設置');
      return null;
    }
    return jwt.verify(token, JWT_SECRET) as T;
  } catch (error) {
    console.error('JWT 驗證錯誤:', error);
    return null;
  }
} 