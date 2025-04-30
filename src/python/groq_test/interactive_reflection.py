import requests
import json
import os

# Groq API密鑰
api_key = "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"

# API端點
url = "https://api.groq.com/openai/v1/chat/completions"

# 設置請求頭
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

# 模擬的對話片段
sample_conversation = """
護士: 您好，我是護理師小林，請問您是張小威的媽媽嗎？
媽媽: 是的，我是他媽媽。
護士: 小威現在有什麼不舒服的症狀呢？
媽媽: 他從昨天開始一直拉肚子，今天又開始發燒了。
護士: 大約拉了幾次呢？大便性狀如何？
媽媽: 昨天拉了五六次，大便很稀，今天已經拉了三次了。
護士: 發燒大約是幾度？有沒有測量過體溫？
媽媽: 早上量了一次是38.5度，剛才又量是39度了。
護士: 小威有沒有嘔吐的情況？
媽媽: 早上吐了一次，中午又吐了一次。
護士: 小威的食慾和喝水情況如何？
媽媽: 他不太想吃東西，喝水也喝得很少。
"""

# 模擬的對話分析結果
conversation_analysis = {
    "missing_questions": [
        "未詢問病人過去是否有腹痛病史",
        "未確認病童目前是否有腹痛症狀",
        "未詢問尿量情況",
        "未詢問是否已服用藥物"
    ],
    "response_delays": [
        {"after_statement": "肚子痛兩天", "delay_seconds": 5},
        {"after_statement": "早上吐了一次", "delay_seconds": 3}
    ],
    "missed_keywords": ["脫水", "尿量", "藥物史", "過敏史"],
    "overall_score": 75
}

# Gibbs六階段模型的引導提示
gibbs_prompts = {
    "描述": """你是一位護理教育反思教練，正在引導學生進行 Gibbs 反思模型的「描述」階段。

學生剛完成一段模擬護理練習，以下是對話片段：
{conversation}

系統分析發現以下可能遺漏的部分：
{missing_questions}

請根據這些資訊，生成一段引導語，鼓勵學生描述整個情境，並提醒他們可能遺漏的部分。語氣應該是鼓勵性的，而非批評。請使用繁體中文回覆。""",

    "感受": """你是一位護理教育反思教練，正在引導學生進行 Gibbs 反思模型的「感受」階段。

學生剛完成一段模擬護理練習，以下是對話片段：
{conversation}

學生在「描述」階段的回答是：
{student_response}

請生成一段引導語，鼓勵學生分享在這個過程中的情緒和感受，包括緊張、安心、困惑或懊惱等。語氣應該是溫暖且支持性的。請使用繁體中文回覆。""",

    "評價": """你是一位護理教育反思教練，正在引導學生進行 Gibbs 反思模型的「評價」階段。

學生剛完成一段模擬護理練習，以下是對話片段：
{conversation}

學生在「感受」階段的回答是：
{student_response}

系統評分：{overall_score}/100

請生成一段引導語，鼓勵學生評價自己的表現，思考哪些部分做得好、哪些部分可以改進。請引導他們進行自評，而非直接給予評價。請使用繁體中文回覆。""",

    "分析": """你是一位護理教育反思教練，正在引導學生進行 Gibbs 反思模型的「分析」階段。

學生剛完成一段模擬護理練習，以下是對話片段：
{conversation}

學生在「評價」階段的回答是：
{student_response}

系統分析發現以下問題：
- 回應延遲：{response_delays}
- 未命中關鍵詞：{missed_keywords}

請生成一段引導語，幫助學生分析問題發生的原因，理解為什麼會有這些表現。引導應該是思考性的，幫助學生深入探索根本原因。請使用繁體中文回覆。""",

    "結論": """你是一位護理教育反思教練，正在引導學生進行 Gibbs 反思模型的「結論」階段。

學生剛完成一段模擬護理練習，以下是對話片段：
{conversation}

學生在「分析」階段的回答是：
{student_response}

請生成一段引導語，鼓勵學生從這次經驗中總結學到的內容，提煉出個人成長點。引導應該是正向且鼓勵性的，幫助學生看到自己的進步空間。請使用繁體中文回覆。""",

    "行動計畫": """你是一位護理教育反思教練，正在引導學生進行 Gibbs 反思模型的「行動計畫」階段。

學生剛完成一段模擬護理練習，以下是對話片段：
{conversation}

學生在「結論」階段的回答是：
{student_response}

請生成一段引導語，協助學生制定具體的行動計畫，將反思轉化為實際改進措施。提供一些可行的建議範例，但鼓勵學生自己制定最終計畫。請使用繁體中文回覆。"""
}

def get_guidance(stage, student_response=None):
    """獲取特定 Gibbs 階段的引導"""
    # 構建請求體
    prompt = gibbs_prompts[stage]
    
    # 準備格式化參數
    format_params = {
        "conversation": sample_conversation,
        "student_response": student_response or "我不確定該如何回答這個問題。",
        "missing_questions": "\n".join([f"👉 {q}" for q in conversation_analysis["missing_questions"]]),
        "response_delays": "\n".join([f"- 當病人提到 '{d['after_statement']}' 後，你停頓了 {d['delay_seconds']} 秒" for d in conversation_analysis["response_delays"]]),
        "missed_keywords": ", ".join(conversation_analysis["missed_keywords"]),
        "overall_score": conversation_analysis["overall_score"]
    }
    
    # 格式化提示
    formatted_prompt = prompt.format(**format_params)
    
    data = {
        "model": "llama3-70b-8192",  # 使用Llama 3模型
        "messages": [
            {
                "role": "system",
                "content": formatted_prompt
            }
        ],
        "temperature": 0.7,
        "max_tokens": 1000
    }
    
    # 發送請求
    response = requests.post(url, headers=headers, json=data)
    
    # 檢查響應
    if response.status_code == 200:
        result = response.json()
        answer = result["choices"][0]["message"]["content"]
        return answer
    else:
        return f"錯誤: {response.status_code}, {response.text}"

# 創建輸出目錄
os.makedirs("src/lib/groq_test_results", exist_ok=True)

def interactive_reflection_dialogue():
    """互動式反思對話流程"""
    dialogue = []
    student_responses = {}
    
    gibbs_stages = ["描述", "感受", "評價", "分析", "結論", "行動計畫"]
    
    print("\n===== 歡迎使用 Gibbs 反思模型引導系統 =====\n")
    print("以下是模擬的護理對話片段：")
    print(sample_conversation)
    print("\n現在將開始引導您完成 Gibbs 六階段反思模型。\n")
    
    for i, stage in enumerate(gibbs_stages):
        print(f"\n===== 第 {i+1} 階段：{stage} =====\n")
        
        # 如果不是第一個階段，使用前一個階段的學生回答
        prev_stage = gibbs_stages[i-1] if i > 0 else None
        prev_response = student_responses.get(prev_stage) if prev_stage else None
        
        # 獲取引導
        guidance = get_guidance(stage, prev_response)
        print(guidance)
        dialogue.append({"role": "assistant", "content": guidance, "stage": stage})
        
        # 獲取學生輸入
        print("\n請輸入您的反思回答 (輸入完成後按Enter，輸入'q'結束)：")
        lines = []
        while True:
            line = input()
            if line.lower() == 'q':
                break
            lines.append(line)
        
        student_response = "\n".join(lines)
        student_responses[stage] = student_response
        dialogue.append({"role": "user", "content": student_response, "stage": stage})
        
        print("\n感謝您的回答！正在進入下一階段...\n")
    
    # 添加最終總結
    final_summary = """感謝你完成了這次完整的 Gibbs 反思循環！

你已經成功地：
✅ 描述了臨床情境
✅ 探索了你的感受
✅ 評價了自己的表現
✅ 分析了問題根源
✅ 得出了有價值的結論
✅ 制定了具體的行動計畫

這種反思能力將幫助你在護理實踐中不斷成長。你的行動計畫非常具體且可行，希望你能夠堅持執行，並在下次模擬中看到進步！

你有任何其他問題或需要進一步的支持嗎？"""
    
    print("\n===== 反思完成 =====\n")
    print(final_summary)
    dialogue.append({"role": "assistant", "content": final_summary, "stage": "總結"})
    
    # 保存完整對話
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"src/lib/groq_test_results/reflection_dialogue_{timestamp}.json"
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(dialogue, f, ensure_ascii=False, indent=2)
    
    print(f"\n您的反思對話已保存到 {filename}")
    return dialogue

if __name__ == "__main__":
    import datetime
    interactive_reflection_dialogue() 