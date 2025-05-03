// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 開始資料庫種子填充...');

  // 1. 建立使用者
  const passwordHash = await bcrypt.hash('test1234', 10);
  const user = await prisma.user.upsert({
    where: { email: 'nurse1@example.com' },
    update: {},
    create: {
      email: 'nurse1@example.com',
      username: 'nurse1',
      password: passwordHash,
      nickname: '小林護理師',
    },
  });

  // 2. 建立場景
  const scenario = await prisma.scenario.upsert({
    where: { scenarioCode: 'PEDS001' },
    update: {},
    create: {
      scenarioCode: 'PEDS001',
      title: '兒童入院評估',
      category: '兒童',
      description: '模擬腸胃道不適的就診情境',
    },
  });

  // 3. 建立 ScoringItem
  await prisma.scoringItem.createMany({
    data: [
      { category: '病人辨識', subcategory: '確認床號', score: 2, code: 'A11' },
      { category: '病人辨識', subcategory: '詢問病人姓名', score: 2, code: 'A12' },
      { category: '病人辨識', subcategory: '核對病人手圈或腳圈', score: 2, code: 'A13' },
      { category: '病人辨識', subcategory: '自我介紹與說明目的', score: 2, code: 'A14' },
      { category: '病人情況', subcategory: '開始不舒服的時間', score: 2, code: 'B10' },
      { category: '病人情況', subcategory: '大便主訴症狀', score: 2, code: 'B20' },
      { category: '病人情況', subcategory: '大便情況.次數', score: 2, code: 'B21' },
      { category: '病人情況', subcategory: '大便情況.性狀', score: 3, code: 'B22' },
      { category: '病人情況', subcategory: '大便情況.量', score: 3, code: 'B23' },
      { category: '病人情況', subcategory: '大便情況.有無血絲', score: 2, code: 'B24' },
      { category: '病人情況', subcategory: '嘔吐情況.次數', score: 2, code: 'B31' },
      { category: '病人情況', subcategory: '嘔吐情況.內容', score: 3, code: 'B32' },
      { category: '病人情況', subcategory: '嘔吐情況.顏色', score: 3, code: 'B33' },
      { category: '病人情況', subcategory: '嘔吐情況.量', score: 2, code: 'B34' },
      { category: '病人情況', subcategory: '食慾.減少', score: 2, code: 'B41' },
      { category: '病人情況', subcategory: '食慾.吃什麼', score: 2, code: 'B42' },
      { category: '病人情況', subcategory: '食慾.量', score: 2, code: 'B43' },
      { category: '病人情況', subcategory: '進食與症狀的關聯', score: 2, code: 'B50' },
      { category: '病人情況', subcategory: '發燒史評估.開始時間', score: 2, code: 'B61' },
      { category: '病人情況', subcategory: '發燒史評估.最高體溫', score: 2, code: 'B62' },
      { category: '病人情況', subcategory: '發燒史評估.處置及方式', score: 2, code: 'B63' },
      { category: '病人情況', subcategory: '發燒史評估.退燒情形', score: 2, code: 'B64' },
      { category: '病人情況', subcategory: '小便情況.量', score: 2, code: 'B78' },
      { category: '病人情況', subcategory: '小便情況.濃度', score: 2, code: 'B79' },
      { category: '病人情況', subcategory: '就醫過程.診所', score: 2, code: 'B81' },
      { category: '病人情況', subcategory: '就醫過程.診斷', score: 2, code: 'B82' },
      { category: '病人情況', subcategory: '就醫過程.醫師處置', score: 2, code: 'B83' },
      { category: '評估檢查', subcategory: '一般護理評估', score: 2, code: 'C11' },
      { category: '評估檢查', subcategory: '測量生命徵象', score: 2, code: 'C12' },
      { category: '評估檢查', subcategory: '腹部評估', score: 2, code: 'C13' },
      { category: '評估檢查', subcategory: '腹痛評估', score: 3, code: 'C14' },
      { category: '護理指導', subcategory: '腹瀉護理指導.記錄顏色', score: 2, code: 'D11' },
      { category: '護理指導', subcategory: '腹瀉護理指導.記錄性質', score: 2, code: 'D12' },
      { category: '護理指導', subcategory: '腹瀉護理指導.必要時禁食', score: 2, code: 'D13' },
      { category: '護理指導', subcategory: '腹瀉護理指導.皮膚護理', score: 2, code: 'D14' },
      { category: '護理指導', subcategory: '腹瀉護理指導.飲食選擇BART', score: 2, code: 'D15' },
      { category: '記錄', subcategory: '發燒.開始時間', score: 1, code: 'E11' },
      { category: '記錄', subcategory: '發燒.最高溫度', score: 1, code: 'E12' },
      { category: '記錄', subcategory: '發燒.處理方式', score: 1, code: 'E13' },
      { category: '記錄', subcategory: '發燒.處理結果', score: 1, code: 'E14' },
      { category: '記錄', subcategory: '腹瀉.開始時間', score: 1, code: 'E21' },
      { category: '記錄', subcategory: '腹瀉.頻率', score: 1, code: 'E22' },
      { category: '記錄', subcategory: '腹瀉.量', score: 1, code: 'E23' },
      { category: '記錄', subcategory: '腹瀉.性狀', score: 1, code: 'E24' },
      { category: '記錄', subcategory: '腹瀉.顏色', score: 1, code: 'E25' },
      { category: '記錄', subcategory: '腹瀉.有無血絲', score: 1, code: 'E26' },
      { category: '記錄', subcategory: '嘔吐.開始時間', score: 1, code: 'E31' },
      { category: '記錄', subcategory: '嘔吐.頻率', score: 1, code: 'E32' },
      { category: '記錄', subcategory: '嘔吐.量', score: 1, code: 'E33' },
      { category: '記錄', subcategory: '嘔吐.性狀', score: 1, code: 'E34' },
      { category: '記錄', subcategory: '嘔吐.顏色', score: 1, code: 'E35' },
      { category: '綜合性表現', subcategory: '護理評估流暢度', score: 1, code: 'F11' },
      { category: '綜合性表現', subcategory: '全程關心病童及家屬反應 ', score: 1, code: 'F12' },
      { category: '綜合性表現', subcategory: '態度及語調表現親切', score: 1, code: 'F13' }
    ],
    skipDuplicates: true,
  });

  // 4. 查詢需要關聯的 scoringItems
  const neededCodes = ['A12', 'F11'];
  const scoringItems = await prisma.scoringItem.findMany({
    where: {
      code: { in: neededCodes },
    },
  });

  const scoringMap = new Map<string, number>();
  scoringItems.forEach(item => scoringMap.set(item.code, item.id));

  // 5. 建立對話
  const conversation = await prisma.conversation.create({
    data: {
      userId: user.id,
      scenarioId: scenario.id,
    },
  });

  // 6. 建立訊息並關聯 scoringItems
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      sender: 'patient',
      text: '小朋友叫張小威，今年兩歲。',
      timestamp: new Date(),
      elapsedSeconds: 5,
      scoringItems: {
        connect: neededCodes.map(code => ({ id: scoringMap.get(code)! })),
      },
    },
  });

  console.log('✅ Seeding 完成！');
}

main()
  .catch((e) => {
    console.error('❌ 執行失敗:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
