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

# 模擬的對話分析結果（實際應用中可由系統生成）
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

def test_gibbs_stage_guidance(stage, student_response=None):
    """測試特定 Gibbs 階段的引導"""
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

# 模擬學生回答
student_responses = {
    "描述": "在這次模擬中，我詢問了病童的媽媽關於孩子的症狀，包括腹瀉、發燒、嘔吐和進食情況。我發現孩子有腹瀉、高燒和嘔吐的症狀，而且食慾和飲水量都減少了。",
    "感受": "面對這種情況，我感到有些緊張，因為孩子的症狀看起來比較嚴重，特別是高燒和脫水的風險。我擔心自己是否問到了所有重要的問題，是否遺漏了什麼關鍵信息。",
    "評價": "我認為我在收集基本症狀信息方面做得還可以，但我沒有詢問更多關於尿量的問題，這對評估脫水程度很重要。另外，我也沒有詢問家長是否已經給孩子服用過任何藥物。",
    "分析": "我想我之所以遺漏這些問題，可能是因為我太專注於當前的症狀，而忽略了整體評估。對於腹瀉和嘔吐的病童，評估脫水狀態是非常重要的，而我沒有系統性地進行這方面的評估。",
    "結論": "通過這次模擬，我意識到在評估兒科病患時，需要更全面地考慮可能的併發症和風險因素。特別是對於有腹瀉和嘔吐症狀的孩子，脫水評估是必不可少的。"
}

# 測試每個 Gibbs 階段的引導
results = {}
gibbs_stages = ["描述", "感受", "評價", "分析", "結論", "行動計畫"]

for i, stage in enumerate(gibbs_stages):
    print(f"測試「{stage}」階段的引導...")
    
    # 如果不是第一個階段，使用前一個階段的學生回答
    prev_stage = gibbs_stages[i-1] if i > 0 else None
    student_response = student_responses.get(prev_stage) if prev_stage else None
    
    # 獲取引導
    guidance = test_gibbs_stage_guidance(stage, student_response)
    
    results[stage] = {
        "previous_response": student_response,
        "ai_guidance": guidance
    }
    
    print(f"AI引導:\n{guidance[:150]}...\n")

# 將結果保存到JSON文件
with open("src/lib/groq_test_results/gibbs_reflection_guidance.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)

print("測試完成，結果已保存到 src/lib/groq_test_results/gibbs_reflection_guidance.json")

# 模擬完整的反思對話流程
def simulate_complete_reflection_dialogue():
    """模擬完整的反思對話流程"""
    dialogue = []
    
    for stage in gibbs_stages:
        # 獲取AI引導
        ai_guidance = results[stage]["ai_guidance"]
        dialogue.append({"role": "assistant", "content": ai_guidance, "stage": stage})
        
        # 模擬學生回答
        student_response = student_responses.get(stage, "我會認真思考這個問題，謝謝您的引導。")
        dialogue.append({"role": "user", "content": student_response, "stage": stage})
    
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
    
    dialogue.append({"role": "assistant", "content": final_summary, "stage": "總結"})
    
    # 保存完整對話
    with open("src/lib/groq_test_results/complete_reflection_dialogue.json", "w", encoding="utf-8") as f:
        json.dump(dialogue, f, ensure_ascii=False, indent=2)
    
    print("完整反思對話模擬已保存到 src/lib/groq_test_results/complete_reflection_dialogue.json")

# 執行完整對話模擬
simulate_complete_reflection_dialogue() 