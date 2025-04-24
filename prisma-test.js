const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$queryRaw`SELECT 1 as result`;
    console.log('Prisma 连接测试成功:', result);
  } catch (error) {
    console.error('Prisma 连接测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 