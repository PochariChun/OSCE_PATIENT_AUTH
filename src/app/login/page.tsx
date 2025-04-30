'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Navbar } from '@/components/navbar';
import { ErrorBoundary } from '@/components/error-boundary';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('開始登入流程，提交數據:', { username });
      
      // 檢查輸入數據
      if (!username) {
        setError('學號不能為空');
        setLoading(false);
        return;
      }
      
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });
      
      const responseText = await response.text();
      console.log('登入 API 響應原始文本:', responseText);
      
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
        console.log('登入 API 響應解析後數據:', data);
      } catch (parseError) {
        console.error('解析 JSON 失敗:', parseError);
        setError('伺服器返回無效的 JSON 數據');
        return;
      }
      
      if (!response.ok) {
        let errorMessage = '登入失敗';
        
        if (data && typeof data.error === 'string') {
          errorMessage = data.error;
        }
        
        // 針對特定錯誤提供更友好的提示
        if (errorMessage.includes('不存在') || errorMessage.includes('找不到')) {
          errorMessage = '此學號不存在，請檢查或註冊新帳號';
        }
        
        setError(errorMessage);
        return;
      }
      
      console.log('登入成功，保存用戶資料');
      
      // 保存用戶資料到 localStorage
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // 如果有令牌，也保存
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      
      console.log('重定向到首頁');
      
      // 重定向到首頁
      router.push('/');
      
    } catch (error: any) {
      console.error('登入過程中發生錯誤:', error);
      console.error('錯誤堆疊:', error.stack);
      setError(error.message || '登入過程中發生錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Navbar />
      <ErrorBoundary>
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
              <div className="rounded-md shadow-sm">
                <div>
                  <label htmlFor="username" className="sr-only">
                    學號
                  </label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    required
                    className="rounded-md"
                    placeholder="學號"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
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
      </ErrorBoundary>
    </div>
  );
} 