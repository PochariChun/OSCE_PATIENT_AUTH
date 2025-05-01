import { PrismaClient } from '@prisma/client'

// 添加调试日志
const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: ['query', 'error', 'warn'],
  });
  
  // 测试连接
  client.$connect()
    .then(() => console.log('Prisma 連接成功'))
    .catch(e => console.error('Prisma 連接失敗:', e));
  
  return client;
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

// 防止開發環境中創建多個 PrismaClient 實例
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

// 導出 Prisma 客戶端實例
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

// 在非生產環境中將 prisma 附加到 global 對象上
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma

// 添加一個測試函數
export async function testPrismaConnection() {
  try {
    // 嘗試執行一個簡單的查詢
    const result = await prisma.$queryRaw`SELECT 1 as result`;
    console.log('Prisma 連接測試成功:', result);
    return true;
  } catch (error) {
    console.error('Prisma 連接測試失敗:', error);
    return false;
  }
}

// 在開發環境中自動測試連接
if (process.env.NODE_ENV === 'development') {
  testPrismaConnection()
    .then(success => {
      if (!success) {
        console.error('警告: Prisma 數據庫連接測試失敗');
      }
    })
    .catch(err => {
      console.error('Prisma 連接測試拋出異常:', err);
    });
} 