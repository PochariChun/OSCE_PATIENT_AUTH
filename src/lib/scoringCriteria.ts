// 評分標準定義
export const scoringCriteria = {
    "Patient Identification": {
      "Confirm Bed Number": {
        score: 2,
        studentKeywords: ["床號", "病房號碼"],
        spKeywords: ["床"]
      },
      "Ask Patient Name": {
        score: 2,
        studentKeywords: ["名字", "叫什麼", "姓名", "怎麼稱呼"],
        spKeywords: ["張小威"]
      },
      "Ask Patient Age": {
        score: 2,
        studentKeywords: ["幾歲", "年紀", "年齡", "貴庚"],
        spKeywords: ["2歲"]
      },
      "Check Wristband or Ankle Band": {
        score: 2,
        studentKeywords: ["手圈", "手環", "腳圈"],
        spKeywords: ["手圈", "張小威"]
      },
      "Self Introduction and Purpose": {
        score: 2,
        studentKeywords: ["我是護生", "我是護理師", "我要做入院護理評估"],
        spKeywords: []
      }
    },
    "Patient Condition": {
      "Onset Time of Symptoms": {
        score: 4,
        studentKeywords: ["什麼時候開始", "什麼時候不舒服", "開始不舒服"],
        spKeywords: ["昨晚", "昨天", "腹瀉", "發燒"]
      },
      "Bowel Movement Details": {
        score: 10,
        studentKeywords: ["腹瀉", "大便", "解便", "便便", "次數", "性狀", "量", "血絲"],
        spKeywords: ["糊便", "水便", "血絲", "黃色"]
      },
      "Vomiting Details": {
        score: 10,
        studentKeywords: ["嘔吐", "吐了", "吐的次數", "內容", "顏色", "量"],
        spKeywords: ["稀飯", "水", "藥"]
      },
      "Appetite Status": {
        score: 6,
        studentKeywords: ["食慾", "吃了什麼", "吃什麼", "量多少"],
        spKeywords: ["沒有食慾", "稀飯"]
      },
      "Eating and Symptom Relation": {
        score: 4,
        studentKeywords: ["吃東西後有沒有比較好", "沒吃有比較好", "吃後變嚴重"],
        spKeywords: ["沒有再吐"]
      },
      "Fever History Evaluation": {
        score: 8,
        studentKeywords: ["發燒", "幾度", "最高溫度", "塞屁股", "退燒", "處置"],
        spKeywords: ["39.5", "塞屁股", "退燒"]
      },
      "Urination Status": {
        score: 4,
        studentKeywords: ["小便", "尿尿", "量", "顏色", "濃度"],
        spKeywords: ["深黃色", "尿少"]
      },
      "Medical Visit Process": {
        score: 6,
        studentKeywords: ["診所", "醫師說什麼", "診斷", "處置", "有去看醫生嗎"],
        spKeywords: ["感冒", "急性腸胃炎", "開藥"]
      }
    },
    "Assessment and Examinations": {
      "General Nursing Assessment": {
        score: 2,
        studentKeywords: ["一般護理資料", "護理評估"],
        spKeywords: []
      },
      "Vital Signs Measurement": {
        score: 2,
        studentKeywords: ["量體溫", "量脈搏", "測呼吸", "量血壓", "心尖脈"],
        spKeywords: []
      },
      "Abdominal Assessment": {
        score: 2,
        studentKeywords: ["腹部", "視診", "聽診", "扣診", "觸診"],
        spKeywords: []
      },
      "Abdominal Pain Evaluation": {
        score: 3,
        studentKeywords: ["肚子痛嗎", "肚肚痛", "臉譜量表", "行為量表", "皺眉", "哭"],
        spKeywords: ["皺眉", "扭動", "短暫哭泣"]
      }
    },
    "Nursing Instructions": {
      "Diarrhea Nursing Instruction": {
        score: 10,
        studentKeywords: ["記錄便便", "記錄顏色", "記錄性狀", "禁食", "皮膚護理", "BART", "香蕉", "蘋果", "米湯", "白吐司"],
        spKeywords: ["香蕉", "蘋果", "米湯", "白吐司"]
      }
    },
    "Documentation": {
      "Record Fever, Diarrhea, and Vomiting": {
        score: 15,
        studentKeywords: ["發燒開始時間", "最高溫度", "如何處理", "處理結果", "腹瀉開始", "頻率", "大便量", "性狀", "血絲", "嘔吐開始", "吐的頻率", "吐的量", "吐的性狀", "吐的顏色"],
        spKeywords: []
      }
    },
    "Overall Performance": {
      "Fluency of Nursing Assessment": {
        score: 2,
        studentKeywords: [],
        spKeywords: []
      },
      "Care for Patient and Family Reactions": {
        score: 2,
        studentKeywords: [],
        spKeywords: []
      },
      "Friendly Attitude and Tone": {
        score: 2,
        studentKeywords: [],
        spKeywords: []
      }
    }
  };
  

// 可以添加其他評分相關的輔助函數
export function calculateMaxPossibleScore() {
  let totalMaxScore = 0;
  
  for (const category in scoringCriteria) {
    for (const item in scoringCriteria[category]) {
      totalMaxScore += scoringCriteria[category][item].score;
    }
  }
  
  return totalMaxScore;
} 