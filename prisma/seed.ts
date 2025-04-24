import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// 使用相對路徑導入，避免路徑解析問題
const prisma = new PrismaClient();

async function main() {
  console.log('開始資料庫種子填充...');

  // 清理現有資料（可選）
  // 注意：在生產環境中請謹慎使用
  await prisma.message.deleteMany();
  await prisma.reflectionMessage.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.scenario.deleteMany();
  await prisma.user.deleteMany();

  console.log('已清理現有資料');

  // 創建用戶
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const admin = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      username: 'admin',
      nickname: '管理員',
      password: passwordHash,
      role: 'admin',
      name: '管理員',
    },
  });

  const nurse1 = await prisma.user.create({
    data: {
      email: 'nurse1@example.com',
      username: 'nurse1',
      nickname: '護士小明',
      password: passwordHash,
      role: 'nurse',
      name: '護士小明',
    },
  });

  const nurse2 = await prisma.user.create({
    data: {
      email: 'nurse2@example.com',
      username: 'nurse2',
      nickname: '護士小紅',
      password: passwordHash,
      role: 'nurse',
      name: '護士小紅',
    },
  });

  console.log('已創建用戶');

  // 創建場景
  const scenario1 = await prisma.scenario.create({
    data: {
      title: '小兒腹瀉入院評估',
      description: '2歲男童因腹瀉、嘔吐3天入院，需要進行初步評估',
      scenarioCode: 'PEDS001',
      difficulty: 1,
      category: '兒科',
      patientName: '張小威',
      patientAge: 2,
      diagnosis: '急性腸胃炎',
      accompaniedBy: '母親',
      orderNPO: true,
      triggerStatements: [
        '請問你叫什麼名字？',
        '孩子有什麼症狀？',
        '症狀持續多久了？'
      ],
      keyTopics: ['發熱', '腹瀉', '嘔吐', '食慾', '尿量'],
      estimatedDuration: 8
    },
  });


  console.log('已創建場景');

  // 創建對話記錄
  const conversation1 = await prisma.conversation.create({
    data: {
      userId: nurse1.id,
      scenarioId: scenario1.id,
      startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 一週前
      endedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 1000), // 8分鐘後
      durationSec: 480,
      score: 85.5,
      overtime: false,
      reflection: '整體表現良好，但需要加強對患兒疼痛評估的技能',
      role: '護士',
      prompt: '請問孩子有什麼症狀？',
      response: '他一直拉肚子，昨天開始還發燒了',
      topic: '症狀評估',
      triggerType: '問句',
      orderIndex: 1,
      messages: {
        create: [
          {
            sender: 'user',
            text: '您好，我是護士小明，請問孩子叫什麼名字？',
            elapsedSeconds: 10,
            delayFromPrev: null,
            isDelayed: false,
            isCorrect: true,
            emotionLabel: 'neutral',
            emotionScore: 0.9
          },
          {
            sender: 'patient',
            text: '他叫張小威，今年2歲',
            elapsedSeconds: 15,
            delayFromPrev: 5,
            isDelayed: false,
            isCorrect: true,
            emotionLabel: 'neutral',
            emotionScore: 0.8
          }
        ]
      }
    }
  });

  console.log('已創建對話記錄');

  console.log('資料庫種子填充完成！');
}

main()
  .catch((e) => {
    console.error('種子填充過程中出錯:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
