'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Navbar } from '@/components/navbar';
import { setCookie } from 'cookies-next';

export default function LoginPage() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ login, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '登入失敗');
        return; // 提前返回，不執行後續代碼
      }
      
      console.log('登入成功，準備重定向...');
      
      // 儲存 token 到 cookie
      if (data.token) {
        setCookie('auth_token', data.token, { maxAge: 60 * 60 * 24 }); // 24小時
      }
      
      // 儲存用戶資訊到 localStorage
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      // 重定向到首頁
      router.push('/');
    } catch (err: any) {
      console.error('登入錯誤:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Navbar user={null} />
      <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
              登入您的帳號
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
              或{' '}
              <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                註冊新帳號
              </Link>
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="login" className="sr-only">
                  帳號或電子郵件
                </label>
                <Input
                  id="login"
                  name="login"
                  type="text"
                  required
                  className="rounded-t-md rounded-b-none"
                  placeholder="帳號或電子郵件"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  密碼
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="rounded-t-none rounded-b-md"
                  placeholder="密碼"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 dark:text-red-400 text-sm text-center">{error}</div>
            )}

            <div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? '登入中...' : '登入'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 