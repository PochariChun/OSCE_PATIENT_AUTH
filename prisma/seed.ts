// prisma/seed.ts

// rm -rf node_modules/.prisma
// npx prisma migrate dev 
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
      category: '兒童,腸胃道',
      description: '模擬媽媽帶腸胃道不適的兒童就診情境',
    },
  });
  // 1️⃣ 清空資料表（會刪掉所有 scoringItem）
  await prisma.scoringItem.deleteMany({});
  console.log('✅ 所有 scoringItem 資料已清空');
  // 3. 建立 ScoringItem
  await prisma.scoringItem.createMany({
    data: [
      { category: '病人辨識', subcategory: '確認床號', score: 2, code: 'A11' },
      { category: '病人辨識', subcategory: '詢問病人姓名', score: 2, code: 'A12' },
      { category: '病人辨識', subcategory: '核對病人手圈或腳圈', score: 2, code: 'A13' },
      { category: '病人辨識', subcategory: '自我介紹與說明目的', score: 2, code: 'A14' },
      { category: '病人情況', subcategory: '開始不舒服的時間', score: 2, code: 'B10' },
      { category: '病人情況', subcategory: '大便主訴症狀', score: 2, code: 'C0' },
      { category: '病人情況', subcategory: '大便情況.次數', score: 2, code: 'C1' },
      { category: '病人情況', subcategory: '大便情況.性狀', score: 3, code: 'C2' },
      { category: '病人情況', subcategory: '大便情況.量', score: 3, code: 'C3' },
      { category: '病人情況', subcategory: '大便情況.有無血絲', score: 2, code: 'C4' },
      { category: '病人情況', subcategory: '嘔吐情況.次數', score: 2, code: 'D1' },
      { category: '病人情況', subcategory: '嘔吐情況.內容', score: 3, code: 'D2' },
      { category: '病人情況', subcategory: '嘔吐情況.顏色', score: 3, code: 'D3' },
      { category: '病人情況', subcategory: '嘔吐情況.量', score: 2, code: 'D4' },
      { category: '病人情況', subcategory: '食慾.減少', score: 2, code: 'E1' },
      { category: '病人情況', subcategory: '食慾.吃什麼', score: 2, code: 'E2' },
      { category: '病人情況', subcategory: '食慾.量', score: 2, code: 'E3' },
      { category: '病人情況', subcategory: '進食與症狀的關聯', score: 2, code: 'F0' },
      { category: '病人情況', subcategory: '發燒史評估.開始時間', score: 2, code: 'G1' },
      { category: '病人情況', subcategory: '發燒史評估.最高體溫', score: 2, code: 'G2' },
      { category: '病人情況', subcategory: '發燒史評估.處置及方式', score: 2, code: 'G3' },
      { category: '病人情況', subcategory: '發燒史評估.退燒情形', score: 2, code: 'G4' },
      { category: '病人情況', subcategory: '小便情況.量', score: 2, code: 'H8' },
      { category: '病人情況', subcategory: '小便情況.濃度', score: 2, code: 'H9' },
      { category: '病人情況', subcategory: '就醫過程.診所', score: 2, code: 'I1' },
      { category: '病人情況', subcategory: '就醫過程.診斷', score: 2, code: 'I2' },
      { category: '病人情況', subcategory: '就醫過程.醫師處置', score: 2, code: 'I3' },
      { category: '評估檢查', subcategory: '一般護理評估', score: 2, code: 'J1' },
      { category: '評估檢查', subcategory: '測量生命徵象', score: 2, code: 'J2' },
      { category: '評估檢查', subcategory: '腹部評估', score: 2, code: 'J3' },
      { category: '評估檢查', subcategory: '腹痛評估', score: 3, code: 'J4' },
      { category: '護理指導', subcategory: '腹瀉護理指導.記錄顏色', score: 2, code: 'K1' },
      { category: '護理指導', subcategory: '腹瀉護理指導.記錄性質', score: 2, code: 'K2' },
      { category: '護理指導', subcategory: '腹瀉護理指導.必要時禁食', score: 2, code: 'K3' },
      { category: '護理指導', subcategory: '腹瀉護理指導.皮膚護理', score: 2, code: 'K4' },
      { category: '護理指導', subcategory: '腹瀉護理指導.飲食選擇BART', score: 2, code: 'K5' },
      { category: '記錄', subcategory: '發燒.開始時間', score: 1, code: 'L11' },
      { category: '記錄', subcategory: '發燒.最高溫度', score: 1, code: 'L12' },
      { category: '記錄', subcategory: '發燒.處理方式', score: 1, code: 'L13' },
      { category: '記錄', subcategory: '發燒.處理結果', score: 1, code: 'L14' },
      { category: '記錄', subcategory: '腹瀉.開始時間', score: 1, code: 'L21' },
      { category: '記錄', subcategory: '腹瀉.頻率', score: 1, code: 'L22' },
      { category: '記錄', subcategory: '腹瀉.量', score: 1, code: 'L23' },
      { category: '記錄', subcategory: '腹瀉.性狀', score: 1, code: 'L24' },
      { category: '記錄', subcategory: '腹瀉.顏色', score: 1, code: 'L25' },
      { category: '記錄', subcategory: '腹瀉.有無血絲', score: 1, code: 'L26' },
      { category: '記錄', subcategory: '嘔吐.開始時間', score: 1, code: 'L31' },
      { category: '記錄', subcategory: '嘔吐.頻率', score: 1, code: 'L32' },
      { category: '記錄', subcategory: '嘔吐.量', score: 1, code: 'L33' },
      { category: '記錄', subcategory: '嘔吐.性狀', score: 1, code: 'L34' },
      { category: '記錄', subcategory: '嘔吐.顏色', score: 1, code: 'L35' },
      { category: '綜合性表現', subcategory: '全程關心病童及家屬反應 ', score: 1, code: 'M2' },
      { category: '綜合性表現', subcategory: '態度及語調表現親切', score: 1, code: 'M3' }
    ],
    skipDuplicates: true,
  });

  // 4. 查詢需要關聯的 scoringItems
  const neededCodes = ['A12', 'M1'];
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
      fluency: true,
      score: 100,
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
