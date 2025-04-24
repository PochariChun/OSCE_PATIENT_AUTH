import { SignJWT, jwtVerify } from 'jose';

// 從環境變量獲取 JWT 密鑰，或使用默認值
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 將字符串轉換為 Uint8Array
const textEncoder = new TextEncoder();
const secretKey = textEncoder.encode(JWT_SECRET);

// 生成 JWT 令牌
export async function signJWTEdge(payload: any, expiresIn = '1d') {
  try {
    const expirationTime = expiresIn === '1d' ? '24h' : expiresIn;
    
    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(expirationTime)
      .sign(secretKey);
    
    return jwt;
  } catch (error) {
    console.error('JWT 簽名錯誤:', error);
    throw error;
  }
}

// 驗證 JWT 令牌
export async function verifyJWTEdge<T>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as T;
  } catch (error) {
    console.error('JWT 驗證錯誤:', error);
    return null;
  }
} 