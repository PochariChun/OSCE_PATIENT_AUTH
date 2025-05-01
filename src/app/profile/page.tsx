'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// 定义用户类型
interface User {
  id: number;
  username: string;
  nickname?: string;
  email: string;
  role: string;
}

export default function ProfilePage() {
  // 将所有 hooks 移到组件函数内部
  const [user, setUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    nickname: '',
    email: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    
    // 从 localStorage 获取用户信息
    const fetchUserData = () => {
      try {
        const userJson = localStorage.getItem('user');
        if (!userJson) {
          console.error('未登录');
          router.push('/login');
          return;
        }
        
        const userData = JSON.parse(userJson);
        setUser(userData);
        
        // 初始化表单数据
        setFormData({
          nickname: userData.nickname || '',
          email: userData.email || ''
        });
      } catch (error) {
        console.error('获取用户信息失败', error);
        router.push('/login');
      }
    };

    fetchUserData();
  }, [router]);

  // 处理表单输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/user/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '更新失败');
      }
      
      // 更新本地存储的用户信息
      if (user) {
        const updatedUser = {
          ...user,
          ...formData
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      }
      
      alert('个人资料已更新');
    } catch (error) {
      setError(error instanceof Error ? error.message : '更新失败');
    } finally {
      setLoading(false);
    }
  };

  // 避免服务器端和客户端渲染不匹配
  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Navbar user={user} />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            个人资料
          </h1>
          
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="username">
                学号
              </label>
              <Input
                id="username"
                name="username"
                value={user?.username || ''}
                disabled
                className="bg-gray-100 dark:bg-gray-700"
              />
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                学号不可修改
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="nickname">
                昵称
              </label>
              <Input
                id="nickname"
                name="nickname"
                value={formData.nickname}
                onChange={handleInputChange}
                placeholder="请输入您的昵称"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 dark:text-gray-300 mb-2" htmlFor="email">
                电子邮箱
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="请输入您的电子邮箱"
              />
            </div>
            
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/')}
              >
                返回首页
              </Button>
              
              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? '保存中...' : '保存修改'}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
} 