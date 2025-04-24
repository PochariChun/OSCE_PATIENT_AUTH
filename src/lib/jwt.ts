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
export async function verifyJWT(token: string) {
  try {
    // 使用與簽名令牌相同的密鑰
    const secret = process.env.JWT_SECRET || 'your-fallback-secret';
    
    // 驗證令牌
    const payload = jwt.verify(token, secret);
    return payload;
  } catch (error) {
    console.error('JWT 驗證失敗:', error);
    return null;
  }
} 