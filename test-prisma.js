// 直接使用相对路径导入生成的客户端
const { PrismaClient } = require('./node_modules/.prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$queryRaw`SELECT 1 as result`;
    console.log('Prisma 连接测试成功:', result);
  } catch (error) {
    console.error('Prisma 连接测试失败:', error);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 