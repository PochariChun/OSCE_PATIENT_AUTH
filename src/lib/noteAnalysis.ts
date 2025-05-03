// 关键术语匹配规则
const keyTermPatterns = [
  { code: 'fever_start', pattern: /(发烧|發燒|体温升高|體溫升高).{0,10}(开始|開始|起始).{0,10}(时间|時間|点|點)/ },
  { code: 'fever_max', pattern: /(最高|最大).{0,5}(体温|體溫)/ },
  { code: 'vomiting', pattern: /(呕吐|嘔吐|吐|嘔)/ },
  { code: 'pain_location', pattern: /(疼痛|痛).{0,10}(位置|部位|处|處)/ },
  { code: 'pain_scale', pattern: /(疼痛|痛).{0,5}(程度|等级|等級|分数|分數)/ },
  { code: 'vital_signs', pattern: /(生命征象|生命徵象|血压|血壓|脉搏|脈搏|呼吸|体温|體溫)/ },
  { code: 'medication', pattern: /(用药|用藥|服药|服藥|给药|給藥|药物|藥物)/ },
  { code: 'allergy', pattern: /(过敏|過敏|敏感)/ },
  { code: 'npo', pattern: /(禁食|禁水|禁飲食|NPO)/ },
  { code: 'iv_fluid', pattern: /(静脉|靜脈|IV|输液|輸液)/ },
  { code: 'consciousness', pattern: /(意识|意識|清醒|昏迷|嗜睡)/ },
  { code: 'skin_condition', pattern: /(皮肤|皮膚|出疹|皮疹)/ },
  { code: 'bowel_movement', pattern: /(排便|大便|腹泻|腹瀉)/ },
  { code: 'urination', pattern: /(排尿|小便|尿量|尿频|尿頻)/ },
  { code: 'mobility', pattern: /(活动|活動|行走|走路|移动|移動)/ },
  { code: 'nutrition', pattern: /(营养|營養|饮食|飲食|进食|進食)/ },
  { code: 'hydration', pattern: /(水分|补水|補水|脱水|脫水)/ },
  { code: 'respiratory', pattern: /(呼吸|喘|气促|氣促)/ },
  { code: 'sleep', pattern: /(睡眠|入睡|失眠)/ },
  { code: 'family_support', pattern: /(家属|家屬|家人|亲人|親人)/ },
];

/**
 * 分析护理记录文本，提取关键术语
 * @param text 护理记录文本
 * @returns 匹配到的关键术语代码数组
 */
export async function extractKeyTerms(text: string): Promise<string[]> {
  const matchedCodes: string[] = [];
  
  // 对每个模式进行匹配
  keyTermPatterns.forEach(({ code, pattern }) => {
    if (pattern.test(text)) {
      matchedCodes.push(code);
    }
  });
  
  return matchedCodes;
} 