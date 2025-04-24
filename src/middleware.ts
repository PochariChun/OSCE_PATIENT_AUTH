import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 需要身份驗證的路徑
const protectedPaths = ['/', '/profile'];

export async function middleware(request: NextRequest) {
  // 暫時禁用中間件，直接允許所有請求通過
  return NextResponse.next();
  
  /* 原始代碼（已注釋掉）
  const path = request.nextUrl.pathname;
  
  // 檢查路徑是否需要保護
  const isProtectedPath = protectedPaths.some(protectedPath => 
    path === protectedPath || path.startsWith(`${protectedPath}/`)
  );
  
  if (!isProtectedPath) {
    return NextResponse.next();
  }
  
  // 獲取 auth-token cookie
  const token = request.cookies.get('auth-token')?.value;
  
  // 驗證 token
  if (!token || !(await verifyJWTEdge(token))) {
    // 重定向到登入頁面
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', path);
    return NextResponse.redirect(loginUrl);
  }
  
  return NextResponse.next();
  */
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login|register).*)'],
}; 