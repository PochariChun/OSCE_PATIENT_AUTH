const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // 更新现有场景数据
  await prisma.scenario.update({
    where: { scenarioCode: 'gastro' },
    data: {
      patientName: '張小威',
      patientAge: 2,
      diagnosis: 'Acute Gastroenteritis',
      accompaniedBy: '母親',
      orderNPO: true,
      triggerStatements: [
        '請問你叫什麼名字？幾歲？',
        '什麼時候開始不舒服？',
        '請問今天大便幾次？性狀是怎樣？',
        '有沒有嘔吐？什麼時候？吐了什麼？',
        '有沒有發燒？最高溫度多少？怎麼處理的？',
        '有小便嗎？量多嗎？顏色呢？',
        '今天有就醫嗎？醫師怎麼說？'
      ],
      keyTopics: ['腹瀉', '嘔吐', '發燒', '飲食', '尿量', '就醫經過'],
      estimatedDuration: 8
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