import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const faiss = require('faiss-node');

// 加载RAG数据
const loadRagData = () => {
  const filePath = path.join(process.cwd(), 'src/lib/rag_lookup_data.jsonl');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  
  return fileContent.split('\n')
    .filter(line => line.trim() && !line.startsWith('//'))
    .map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        console.error('解析JSONL行时出错:', line);
        return null;
      }
    })
    .filter(item => item !== null);
};

// 初始化向量数据库
let index;
let ragData;

const initVectorDB = async () => {
  if (index) return;
  
  ragData = loadRagData();
  
  // 假设我们已经有了预先计算好的embeddings
  // 在实际应用中，您需要为每个问题生成embedding
  const embeddingsPath = path.join(process.cwd(), 'src/lib/question_embeddings.bin');
  
  if (fs.existsSync(embeddingsPath)) {
    index = await faiss.IndexFlatL2.load(embeddingsPath);
  } else {
    // 如果没有预先计算的embeddings，需要创建它们
    // 这里需要调用embedding API为每个问题生成向量
    // ...
  }
};

// 计算两个向量之间的余弦相似度
const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

// 搜索相似问题
export const searchSimilarQuestions = async (queryEmbedding: number[]) => {
  // 加载RAG数据
  const ragData = loadRagData();
  
  // 由于我们没有预先计算的嵌入向量，这里使用简单的文本匹配
  // 在实际应用中，您应该使用真实的向量搜索
  
  // 为每个问题计算一个模拟的相似度分数
  const results = ragData.map((item, index) => {
    // 在实际应用中，您应该比较查询嵌入向量和预先计算的问题嵌入向量
    // 这里我们使用一个简单的模拟实现
    
    // 创建一个模拟的问题嵌入向量
    const questionEmbedding = new Array(128).fill(0).map((_, i) => {
      let value = 0;
      for (let j = 0; j < item.question.length; j++) {
        value += item.question.charCodeAt(j) * (i + 1) * (j + 1);
      }
      return Math.sin(value % 10000 / 1000);
    });
    
    // 计算余弦相似度
    const score = cosineSimilarity(queryEmbedding, questionEmbedding);
    
    return {
      ...item,
      id: index,
      score
    };
  });
  
  // 按相似度分数排序
  results.sort((a, b) => b.score - a.score);
  
  // 返回前5个结果
  return results.slice(0, 5);
}; 