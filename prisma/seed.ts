import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

// 使用相對路徑導入，避免路徑解析問題
const prisma = new PrismaClient();

// 读取评分标准文件
const scoringCriteriaPath = path.join(__dirname, '../src/lib/scoringCriteria.jsonl');
const scoringCriteriaLines = fs.readFileSync(scoringCriteriaPath, 'utf8').split('\n').filter(Boolean);
const scoringCriteria = scoringCriteriaLines.map(line => JSON.parse(line));

async function main() {
  console.log('開始資料庫種子填充...');

  // 清理現有資料（可選）
  // 注意：在生產環境中請謹慎使用
  await prisma.scoringItemMessage.deleteMany();
  await prisma.scoringItem.deleteMany();
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


  // 創建對話記錄1 - 小兒腹瀉入院評估
  const conversation1 = await prisma.conversation.create({
    data: {
      userId: nurse1.id,
      scenarioId: scenario1.id,
      startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 一週前
      endedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 1000), // 8分鐘後
      durationSec: 480,
      score: 85,
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
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 10 * 1000),
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
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 15 * 1000),
            elapsedSeconds: 15,
            delayFromPrev: 5,
            isDelayed: false,
            isCorrect: true,
            emotionLabel: 'neutral',
            emotionScore: 0.8
          },
          {
            sender: 'user',
            text: '請問孩子有什麼症狀？是什麼原因來醫院的？',
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 30 * 1000),
            elapsedSeconds: 30,
            delayFromPrev: 15,
            isDelayed: true,
            isCorrect: true,
            emotionLabel: 'concern',
            emotionScore: 0.7
          },
          {
            sender: 'patient',
            text: '他從三天前開始一直拉肚子，昨天還開始發燒，今天早上量體溫有38.5度',
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 45 * 1000),
            elapsedSeconds: 45,
            delayFromPrev: 15,
            isDelayed: false,
            isCorrect: true,
            emotionLabel: 'worry',
            emotionScore: 0.6
          },
          {
            sender: 'user',
            text: '孩子一天大概拉幾次？大便的性狀是怎樣的？',
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 60 * 1000),
            elapsedSeconds: 60,
            delayFromPrev: 15,
            isDelayed: false,
            isCorrect: true,
            emotionLabel: 'neutral',
            emotionScore: 0.9
          },
          {
            sender: 'patient',
            text: '一天至少拉5-6次，都是水狀的，有時候還帶一點黏液',
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 75 * 1000),
            elapsedSeconds: 75,
            delayFromPrev: 15,
            isDelayed: false,
            isCorrect: true,
            emotionLabel: 'worry',
            emotionScore: 0.7
          },
          {
            sender: 'user',
            text: '孩子有沒有嘔吐的情況？',
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 95 * 1000),
            elapsedSeconds: 95,
            delayFromPrev: 20,
            isDelayed: true,
            isCorrect: true,
            emotionLabel: 'neutral',
            emotionScore: 0.8
          },
          {
            sender: 'patient',
            text: '有，昨天嘔吐了兩次，今天早上又吐了一次',
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 105 * 1000),
            elapsedSeconds: 105,
            delayFromPrev: 10,
            isDelayed: false,
            isCorrect: true,
            emotionLabel: 'worry',
            emotionScore: 0.7
          },
          {
            sender: 'user',
            text: '孩子的食慾和喝水情況如何？',
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 120 * 1000),
            elapsedSeconds: 120,
            delayFromPrev: 15,
            isDelayed: false,
            isCorrect: true,
            emotionLabel: 'concern',
            emotionScore: 0.8
          },
          {
            sender: 'patient',
            text: '他幾乎不想吃東西，喝水也很少，我很擔心他會脫水',
            timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 135 * 1000),
            elapsedSeconds: 135,
            delayFromPrev: 15,
            isDelayed: false,
            isCorrect: true,
            emotionLabel: 'anxiety',
            emotionScore: 0.6
          }
        ]
      }
    }
  });

  

  // 創建對話記錄3 - 小兒腹瀉入院評估（護士小紅）
  const conversation3 = await prisma.conversation.create({
    data: {
      userId: nurse2.id,
      scenarioId: scenario1.id,
      startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 五天前
      endedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000), // 10分鐘後
      durationSec: 600,
      score: 78,
      overtime: false,
      reflection: '需要加強對兒童腹瀉脫水評估的技能，問診順序可以更有邏輯性',
      role: '護士',
      prompt: '孩子的症狀是什麼？',
      response: '他已經腹瀉三天了，今天開始發燒',
      topic: '症狀評估',
      triggerType: '問句',
      orderIndex: 1,
      messages: {
        create: [
          {
            sender: 'user',
            text: '您好，我是護士小紅。請問您帶孩子來是因為什麼症狀？',
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 15 * 1000),
            elapsedSeconds: 15,
            delayFromPrev: null,
            isDelayed: false,
            isCorrect: true,
            emotionLabel: 'professional',
            emotionScore: 0.8
          },
          {
            sender: 'patient',
            text: '我兒子小威已經腹瀉三天了，今天早上開始發燒',
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 30 * 1000),
            elapsedSeconds: 30,
            delayFromPrev: 15,
            isDelayed: false,
            isCorrect: true,
            emotionLabel: 'worry',
            emotionScore: 0.7
          },
          {
            sender: 'user',
            text: '孩子今年幾歲了？',
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 45 * 1000),
            elapsedSeconds: 45,
            delayFromPrev: 15,
            isDelayed: false,
            isCorrect: true,
            emotionLabel: 'neutral',
            emotionScore: 0.9
          },
          {
            sender: 'patient',
            text: '他今年2歲',
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 55 * 1000),
            elapsedSeconds: 55,
            delayFromPrev: 10,
            isDelayed: false,
            isCorrect: true,
            emotionLabel: 'neutral',
            emotionScore: 0.9
          },
          {
            sender: 'user',
            text: '他的體溫是多少？',
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 80 * 1000),
            elapsedSeconds: 80,
            delayFromPrev: 25,
            isDelayed: true,
            isCorrect: true,
            emotionLabel: 'concern',
            emotionScore: 0.7
          },
          {
            sender: 'patient',
            text: '今天早上量了38.7度',
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 95 * 1000),
            elapsedSeconds: 95,
            delayFromPrev: 15,
            isDelayed: false,
            isCorrect: true,
            emotionLabel: 'worry',
            emotionScore: 0.8
          },
          {
            sender: 'user',
            text: '腹瀉的次數大概是多少？大便性狀如何？',
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 125 * 1000),
            elapsedSeconds: 125,
            delayFromPrev: 30,
            isDelayed: true,
            isCorrect: true,
            emotionLabel: 'professional',
            emotionScore: 0.8
          },
          {
            sender: 'patient',
            text: '一天至少6-7次，都是水樣便，有時候帶一點綠色',
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 140 * 1000),
            elapsedSeconds: 140,
            delayFromPrev: 15,
            isDelayed: false,
            isCorrect: true,
            emotionLabel: 'distress',
            emotionScore: 0.6
          }
        ]
      }
    }
  });

  console.log('已創建對話記錄');

  // 获取对话1的消息
  const conversation1Messages = await prisma.message.findMany({
    where: { conversationId: conversation1.id },
    orderBy: { timestamp: 'asc' }
  });

  // 获取对话3的消息
  const conversation3Messages = await prisma.message.findMany({
    where: { conversationId: conversation3.id },
    orderBy: { timestamp: 'asc' }
  });

  // 为对话1创建所有评分项目
  console.log('為對話1創建所有評分項目...');
  for (const criteria of scoringCriteria) {
    await prisma.scoringItem.create({
      data: {
        conversationId: conversation1.id,
        category: criteria.category,
        subcategory: criteria.subcategory,
        code: criteria.code,
        score: criteria.score,
        achieved: false, // 默认未达成
      }
    });
  }

  // 为对话3创建所有评分项目
  console.log('為對話3創建所有評分項目...');
  for (const criteria of scoringCriteria) {
    await prisma.scoringItem.create({
      data: {
        conversationId: conversation3.id,
        category: criteria.category,
        subcategory: criteria.subcategory,
        code: criteria.code,
        score: criteria.score,
        achieved: false, // 默认未达成
      }
    });
  }

  // 更新对话1中学生实际获得的评分项目
  console.log('更新對話1中學生實際獲得的評分項目...');
  const conversation1AchievedItems = [
    { code: 'A12', messageIds: [conversation1Messages[0].id] },
    { code: 'B21', messageIds: [conversation1Messages[4].id] },
    { code: 'B22', messageIds: [conversation1Messages[4].id] },
    { code: 'B31', messageIds: [conversation1Messages[6].id] },
    { code: 'B41', messageIds: [conversation1Messages[8].id] }
  ];

  for (const item of conversation1AchievedItems) {
    const scoringItem = await prisma.scoringItem.findFirst({
      where: {
        conversationId: conversation1.id,
        code: item.code
      }
    });
    
    if (scoringItem) {
      await prisma.scoringItem.update({
        where: { id: scoringItem.id },
        data: { achieved: true }
      });
      
      for (const messageId of item.messageIds) {
        await prisma.scoringItemMessage.create({
          data: {
            scoringItemId: scoringItem.id,
            messageId: messageId
          }
        });
      }
    }
  }

  // 更新对话3中学生实际获得的评分项目
  console.log('更新對話3中學生實際獲得的評分項目...');
  const conversation3AchievedItems = [
    { code: 'B10', messageIds: [conversation3Messages[0].id] },
    { code: 'B21', messageIds: [conversation3Messages[6].id] },
    { code: 'B22', messageIds: [conversation3Messages[6].id] },
    { code: 'B62', messageIds: [conversation3Messages[4].id] }
  ];

  for (const item of conversation3AchievedItems) {
    const scoringItem = await prisma.scoringItem.findFirst({
      where: {
        conversationId: conversation3.id,
        code: item.code
      }
    });
    
    if (scoringItem) {
      await prisma.scoringItem.update({
        where: { id: scoringItem.id },
        data: { achieved: true }
      });
      
      for (const messageId of item.messageIds) {
        await prisma.scoringItemMessage.create({
          data: {
            scoringItemId: scoringItem.id,
            messageId: messageId
          }
        });
      }
    }
  }

  console.log('已創建並更新評分項目');
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
