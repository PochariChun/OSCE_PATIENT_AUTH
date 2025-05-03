// src/lib/auth.ts
import { cookies } from 'next/headers';
import { JWTPayload, verifyJWT } from './jwt';

export async function getCurrentUser(): Promise<JWTPayload | null> {
    const token = (await cookies()).get('auth_token')?.value;
    if (!token) return null;
  
    try {
      const payload = verifyJWT(token);
      if (typeof payload === 'object' && 'userId' in payload) {
        return payload as JWTPayload;
      }
      return null;
    } catch {
      return null;
    }
  }
  
