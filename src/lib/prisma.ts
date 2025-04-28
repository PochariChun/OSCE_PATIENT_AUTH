import { PrismaClient } from '@prisma/client'

// 防止開發環境中創建多個 PrismaClient 實例
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma

// 添加一個簡單的測試函數
export async function testPrismaConnection() {
  try {
    // 嘗試執行一個簡單的查詢
    const result = await prisma.$queryRaw`SELECT 1 as result`
    console.log('Prisma 連接測試成功:', result)
    return true
  } catch (error) {
    console.error('Prisma 連接測試失敗:', error)
    return false
  }
} 