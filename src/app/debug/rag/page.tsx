'use client';

import { useState } from 'react';
import { Navbar } from '@/components/navbar';

export default function RagDebugPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/debug/rag-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      
      if (!response.ok) {
        throw new Error(`搜索失败: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setResults(data.results);
    } catch (error) {
      console.error('搜索出错:', error);
      alert('搜索出错，请查看控制台获取详细信息');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">RAG 系统调试</h1>
        
        <div className="mb-4">
          <div className="flex">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入问题..."
              className="flex-1 p-2 border rounded-l"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded-r"
            >
              {loading ? '搜索中...' : '搜索'}
            </button>
          </div>
        </div>
        
        {results.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-2">搜索结果</h2>
            
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border p-4 rounded">
                  <div className="font-bold">匹配分数: {result.score.toFixed(4)}</div>
                  <div><span className="font-semibold">问题:</span> {result.question}</div>
                  <div><span className="font-semibold">回答:</span> {result.answer}</div>
                  {result.tags && (
                    <div><span className="font-semibold">标签:</span> {result.tags.join(', ')}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 