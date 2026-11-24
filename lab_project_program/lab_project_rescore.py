# -*- coding: utf-8 -*-
"""对已运行的测试结果重新评分(修复版提示词, 含实际路由/实际reply/API执行结果)。
用法: $env:LAB_API_KEY="sk-xxx"; python lab_project_rescore.py <results.json>
输出: lab_project_test_rescore_{TS}.json
"""
import json, os, re, sys, time, urllib.request
from datetime import datetime

API_URL = "https://tokenhub.landicorp.com/v1/chat/completions"
API_KEY = os.environ.get("LAB_API_KEY") or os.environ.get("DEEPSEEK_API_KEY") or ""
MODEL   = os.environ.get("LAB_MODEL", "deepseek-v4.1-flash-1017")
TIMEOUT = 60
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

SCORE_SYS = ("你是实验项目问答+API调用评估员。系统会提供: 参观者提问、期望条目id、期望api_call、"
             "实际路由条目id、实际reply、实际api_call、API真实执行结果。\n"
             "请输出 JSON:\n"
             "{{\"entry_match\":0或1, \"api_call_match\":0或1, \"api_ok\":0或1, \"quality\":1到5整数, \"note\":\"一句话点评\"}}\n"
             "判定规则:\n"
             "- entry_match = 1 当且仅当 实际条目id 与 期望条目id 一致;\n"
             "- api_call_match = 1 当且仅当 实际api_call 与 期望api_call 的 action 与 payload 完全一致(载荷字段集合一致);\n"
             "- api_ok = 1 当且仅当 API 真实执行成功(ok=true)且 total/ids 与预期相符;\n"
             "- quality 表示该 reply+api_call 对问题的合适程度: 5=完美 4=良好 3=可用 2=偏差 1=错误。\n"
             "若 api_ok 对应兜底用例(题目本身无对应项目), 可对本维度填 0 并备注跳过。")


def call_deepseek(messages, temperature=0.1, retries=2):
    body = json.dumps({"model": MODEL, "messages": messages,
                       "temperature": temperature, "max_tokens": 1024},
                      ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(API_URL, data=body, headers={
        "Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"})
    last_err = None
    for attempt in range(retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"].strip()
        except Exception as e:  # noqa: BLE001
            last_err = e
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"DeepSeek 调用失败: {last_err}")


def extract_json(text):
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except Exception:
        pass
    norm = text.replace("{{", "{").replace("}}", "}")
    if norm != text:
        try:
            return json.loads(norm)
        except Exception:
            pass
    s, e = text.find("{"), text.rfind("}")
    if s != -1 and e > s:
        try:
            return json.loads(text[s:e + 1])
        except Exception:
            pass
    return None


def score_one(row, expected):
    api_result = row.get("api_result") or {}
    user = (f"参观者提问(用例{row['id']}): {row['question']}\n"
            f"期望条目id: {row.get('exp_entry')}\n"
            f"期望api_call: {json.dumps(expected if expected is not None else row.get('exp_api_call'), ensure_ascii=False)}\n"
            f"实际路由条目id: {row.get('got_entry')}\n"
            f"实际reply: {row.get('reply')}\n"
            f"实际api_call: {json.dumps(row.get('api_call') or {}, ensure_ascii=False)}\n"
            f"API真实执行结果: status={api_result.get('ok')} total={api_result.get('total')} ids={api_result.get('ids')}\n"
            f"请按规则输出 JSON。")
    raw = call_deepseek([{"role": "system", "content": SCORE_SYS},
                         {"role": "user", "content": user}])
    obj = extract_json(raw)
    if not isinstance(obj, dict):
        obj = {"parse_error": raw[:200]}
    return obj, raw


def main():
    if not API_KEY:
        print("错误: 未检测到 API Key。PowerShell: $env:LAB_API_KEY=\"sk-xxx\"; python lab_project_rescore.py <file>")
        sys.exit(2)
    if len(sys.argv) < 2:
        print("用法: python lab_project_rescore.py <lab_project_test_results_*.json>")
        sys.exit(2)
    src = sys.argv[1]
    data = json.load(open(src, encoding="utf-8"))
    rows = data["cases"]
    usable = [r for r in rows if not r.get("error")]
    print(f"重新评分 {len(usable)}/{len(rows)} 条…")
    TS = datetime.now().strftime("%Y%m%d_%H%M%S")
    for i, r in enumerate(usable, 1):
        expected = r.get("exp_api_call")
        for attempt in (1, 2):
            try:
                sc, sc_raw = score_one(r, expected)
                r["score"] = sc
                r["score_raw"] = sc_raw
                break
            except Exception as e:  # noqa: BLE001
                if attempt == 2:
                    r["score"] = {"error": str(e)}
                else:
                    print(f"{r['id']} 重试: {e}")
        time.sleep(0.2)
        print(f"[{i}/{len(usable)}] {r['id']} entry={r.get('score',{}).get('entry_match')} "
              f"api_call={r.get('score',{}).get('api_call_match')} api_ok={r.get('score',{}).get('api_ok')} quality={r.get('score',{}).get('quality')}")
    # 汇总
    n = len(usable)
    em = sum(1 for r in usable if (r.get("score") or {}).get("entry_match") == 1)
    ac = sum(1 for r in usable if (r.get("score") or {}).get("api_call_match") == 1)
    ao = sum(1 for r in usable if (r.get("score") or {}).get("api_ok") == 1)
    qs = [(r.get("score") or {}).get("quality") for r in usable]
    qv = [q for q in qs if isinstance(q, (int, float))]
    avg_q = round(sum(qv) / len(qv), 2) if qv else None
    summary = {
        "ts": TS, "model": MODEL, "source": src,
        "scored": n, "entry_match": em, "api_call_match": ac, "api_ok": ao,
        "entry_match_rate": round(em / max(1, n), 3),
        "api_call_match_rate": round(ac / max(1, n), 3),
        "api_ok_rate": round(ao / max(1, n), 3),
        "avg_quality_model": avg_q,
    }
    out = os.path.join(BASE_DIR, f"lab_project_test_rescore_{TS}.json")
    json.dump({"summary": summary, "cases": rows}, open(out, "w", encoding="utf-8"),
              ensure_ascii=False, indent=2)
    print(f"\n完成! 汇总: {json.dumps(summary, ensure_ascii=False)}\n写入 {out}")


if __name__ == "__main__":
    main()