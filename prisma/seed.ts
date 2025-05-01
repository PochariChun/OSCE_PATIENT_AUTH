import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 開始資料庫種子填充...');

  // 清空表（按依賴關係反向刪除）
  await prisma.message.deleteMany();
  await prisma.reflectionMessage.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.user.deleteMany();
  await prisma.scenario.deleteMany();
  await prisma.scoringItem.deleteMany();

  // 建立使用者帳號
  const passwordHash = await bcrypt.hash('test1234', 10);
  const user = await prisma.user.create({
    data: {
      email: 'nurse1@example.com',
      username: 'nurse1',
      password: passwordHash,
      nickname: '小林護理師',
    },
  });

  // 建立情境
  const scenario = await prisma.scenario.create({
    data: {
      title: '兒童入院評估',
      description: '針對2歲病童進行腸胃道入院初評',
      scenarioCode: 'SC001',
      difficulty: 2,
      category: '入院',
      patientName: '張小威',
      patientAge: 2,
      diagnosis: '急性腸胃炎',
      accompaniedBy: '媽媽',
      triggerStatements: ['請問你叫什麼名字？'],
      keyTopics: ['病人辨識', '發燒', '腹瀉'],
      estimatedDuration: 8,
    },
  });

  // 建立 ScoringItem
  const scoringItems = await prisma.$transaction([
    prisma.scoringItem.create({
      data: {
        code: "A11",
        category: "病人辨識",
        subcategory: "確認床號",
        score: 2
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "A12",
        category: "病人辨識",
        subcategory: "詢問病人姓名",
        score: 2
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "A13",
        category: "病人辨識",
        subcategory: "核對病人手圈或腳圈",
        score: 2
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "A14",
        category: "病人辨識",
        subcategory: "自我介紹與說明目的",
        score: 2
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "B10",
        category: "病人情況",
        subcategory: "開始不舒服的時間",
        score: 2
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "B21",
        category: "病人情況",
        subcategory: "大便情況.次數",
        score: 2
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "B22",
        category: "病人情況",
        subcategory: "大便情況.性狀",
        score: 3
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "B23",
        category: "病人情況",
        subcategory: "大便情況.量",
        score: 3
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "B24",
        category: "病人情況",
        subcategory: "大便情況.有無血絲",
        score: 2
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "B31",
        category: "病人情況",
        subcategory: "嘔吐情況.次數",
        score: 2
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "B32",
        category: "病人情況",
        subcategory: "嘔吐情況.內容",
        score: 3
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "B33",
        category: "病人情況",
        subcategory: "嘔吐情況.顏色",
        score: 3
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "B34",
        category: "病人情況",
        subcategory: "嘔吐情況.量",
        score: 2
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "B41",
        category: "病人情況",
        subcategory: "食慾.減少",
        score: 2
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "B42",
        category: "病人情況",
        subcategory: "食慾.吃什麼",
        score: 2
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "B43",
        category: "病人情況",
        subcategory: "食慾.量",
        score: 2
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "B50",
        category: "病人情況",
        subcategory: "進食與症狀的關聯",
        score: 2
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "B61",
        category: "病人情況",
        subcategory: "發燒史評估.開始時間",
        score: 2
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "B62",
        category: "病人情況",
        subcategory: "發燒史評估.最高體溫",
        score: 2
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "B63",
        category: "病人情況",
        subcategory: "發燒史評估.處置及方式",
        score: 2
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "B64",
        category: "病人情況",
        subcategory: "發燒史評估.退燒情形",
        score: 2
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "B78",
        category: "病人情況",
        subcategory: "小便情況.量",
        score: 2
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "B79",
        category: "病人情況",
        subcategory: "小便情況.濃度",
        score: 2
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "B81",
        category: "病人情況",
        subcategory: "就醫過程.診所",
        score: 2
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "B82",
        category: "病人情況",
        subcategory: "就醫過程.診斷",
        score: 2
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "B83",
        category: "病人情況",
        subcategory: "就醫過程.醫師處置",
        score: 2
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "C11",
        category: "評估檢查",
        subcategory: "一般護理評估",
        score: 2
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "C12",
        category: "評估檢查",
        subcategory: "測量生命徵象",
        score: 2
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "C13",
        category: "評估檢查",
        subcategory: "腹部評估",
        score: 2
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "C14",
        category: "評估檢查",
        subcategory: "腹痛評估",
        score: 3
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "D11",
        category: "護理指導",
        subcategory: "腹瀉護理指導.記錄顏色",
        score: 2
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "D12",
        category: "護理指導",
        subcategory: "腹瀉護理指導.記錄性質",
        score: 2
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "D13",
        category: "護理指導",
        subcategory: "腹瀉護理指導.必要時禁食",
        score: 2
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "D14",
        category: "護理指導",
        subcategory: "腹瀉護理指導.皮膚護理",
        score: 2
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "D15",
        category: "護理指導",
        subcategory: "腹瀉護理指導.飲食選擇BART",
        score: 2
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "E11",
        category: "記錄",
        subcategory: "發燒.開始時間",
        score: 1
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "E12",
        category: "記錄",
        subcategory: "發燒.最高溫度",
        score: 1
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "E13",
        category: "記錄",
        subcategory: "發燒.處理方式",
        score: 1
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "E14",
        category: "記錄",
        subcategory: "發燒.處理結果",
        score: 1
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "E21",
        category: "記錄",
        subcategory: "腹瀉.開始時間",
        score: 1
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "E22",
        category: "記錄",
        subcategory: "腹瀉.頻率",
        score: 1
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "E23",
        category: "記錄",
        subcategory: "腹瀉.量",
        score: 1
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "E24",
        category: "記錄",
        subcategory: "腹瀉.性狀",
        score: 1
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "E25",
        category: "記錄",
        subcategory: "腹瀉.顏色",
        score: 1
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "E26",
        category: "記錄",
        subcategory: "腹瀉.有無血絲",
        score: 1
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "E31",
        category: "記錄",
        subcategory: "嘔吐.開始時間",
        score: 1
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "E32",
        category: "記錄",
        subcategory: "嘔吐.頻率",
        score: 1
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "E33",
        category: "記錄",
        subcategory: "嘔吐.量",
        score: 1
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "E34",
        category: "記錄",
        subcategory: "嘔吐.性狀",
        score: 1
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "E35",
        category: "記錄",
        subcategory: "嘔吐.顏色",
        score: 1
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "F11",
        category: "綜合性表現",
        subcategory: "護理評估流暢度",
        score: 1
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "F12",
        category: "綜合性表現",
        subcategory: "全程關心病童及家屬反應 ",
        score: 1
      }
    }),
    prisma.scoringItem.create({
      data: {
        code: "F13",
        category: "綜合性表現",
        subcategory: "態度及語調表現親切",
        score: 1
      }
    })
  ]);

  // 建立 ScoringId 對照表
  const scoringMap = new Map();
  scoringItems.forEach(item => scoringMap.set(item.code, item.id));

  // 建立對話紀錄與訊息
  const conversation = await prisma.conversation.create({
    data: {
      userId: user.id,
      scenarioId: scenario.id,
      startedAt: new Date(),
      messages: {
        create: [
          {
            sender: 'user',
            text: '請問你叫什麼名字？',
            timestamp: new Date(),
            elapsedSeconds: 0,
            ScoringId: scoringMap.get('A12'),
          },
          {
            sender: 'patient',
            text: '我叫張小威。',
            timestamp: new Date(),
            elapsedSeconds: 5,
          },
        ],
      },
    },
    include: {
      messages: true,
    },
  });

  console.log('✅ 種子資料填充完成');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
