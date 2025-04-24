import { PrismaClient } from '@prisma/client'

// 声明全局变量类型
declare global {
  var prisma: PrismaClient | undefined
}

// 创建 PrismaClient 实例
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
  })
}

// 使用全局变量或创建新实例
const prisma = globalThis.prisma ?? prismaClientSingleton()

// 在开发环境中将实例保存到全局变量中
if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

export { prisma }

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