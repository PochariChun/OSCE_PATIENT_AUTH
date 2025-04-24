import { PrismaClient } from '@prisma/client'

// 防止开发环境中创建多个 PrismaClient 实例
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma

// 添加一个简单的测试函数
export async function testPrismaConnection() {
  try {
    // 尝试执行一个简单的查询
    const result = await prisma.$queryRaw`SELECT 1 as result`
    console.log('Prisma 连接测试成功:', result)
    return true
  } catch (error) {
    console.error('Prisma 连接测试失败:', error)
    return false
  }
} 