import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 更新现有场景数据
  await prisma.scenario.update({
    where: { scenarioCode: 'gastro' },
    data: {
      patientName: '林先生',
      patientAge: 50,
      diagnosis: '急性腸胃炎',
      accompaniedBy: '無',
      orderNPO: false,
      triggerStatements: ['您好，我是護理師，請問您現在感覺如何？'],
      keyTopics: ['腹痛', '腹瀉', '發熱', '飲食'],
      estimatedDuration: 10
    }
  });
  
  console.log('场景数据已更新');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 