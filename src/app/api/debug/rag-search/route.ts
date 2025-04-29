import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { normalizeNames } from '@/lib/textUtils';

export async function POST(request: Request) {
  try {
    const { query } = await request.json();
    
    // 标准化名称
    const normalizedQuery = normalizeNames(query);
    
    // 加载问答数据
    const filePath = path.join(process.cwd(), 'src/lib/rag_lookup_data.jsonl');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    // 解析 JSONL 文件
    const qaData = fileContent.split('\n')
      .filter(line => line.trim() && !line.startsWith('//'))
      .map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return null;
        }
      })
      .filter(item => item !== null);
    
    // 计算所有问题的匹配分数
    const results = qaData.map(item => {
      // 简化的字符串匹配
      const processedQuery = normalizedQuery.toLowerCase().replace(/\s+/g, '');
      const processedQuestion = item.question.toLowerCase().replace(/\s+/g, '');
      
      let score = 0;
      
      // 精确匹配
      if (processedQuery === processedQuestion) {
        score = 1.0;
      }
      // 包含匹配
      else if (processedQuery.includes(processedQuestion)) {
        score = processedQuestion.length / processedQuery.length;
      }
      else if (processedQuestion.includes(processedQuery)) {
        score = processedQuery.length / processedQuestion.length;
      }
      
      return {
        question: item.question,
        answer: item.answer,
        tags: item.tags,
        score
      };
    });
    
    // 按分数排序
    results.sort((a, b) => b.score - a.score);
    
    // 返回前10个结果
    return NextResponse.json({ results: results.slice(0, 10) });
  } catch (error) {
    console.error('RAG 搜索错误:', error);
    return NextResponse.json(
      { error: '处理请求时出错' },
      { status: 500 }
    );
  }
} 