// 这个文件负责创建文本的嵌入向量

// 使用 fetch 代替 axios
export async function createEmbedding(text: string): Promise<number[]> {
  try {
    // 使用OpenAI的嵌入API
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-ada-002'
      })
    });
    
    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('创建嵌入向量时出错:', error);
    // 返回一个空向量作为后备
    return new Array(128).fill(0);
  }
} 