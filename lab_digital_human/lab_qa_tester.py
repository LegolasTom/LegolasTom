# -*- coding: utf-8 -*-
"""
实验室数字人\"小联\"问答知识库测试程序

流程:
  A. 遍历 lab_test_question_sets.json 中每条问题
  B. 调用 DeepSeek 判断该问题归属哪个库(主库/人设库/边界库), 并从该库选出最合适的\"原文本回答\"
     (模型必须原样返回库内 answer, 不得掺入库外内容; 每轮独立, 不带任何历史上下文)
  C. 逐步追加结果到 log (纯文本) 与 jsonl
  D. 全部跑完后, 对每个问答再次调用 DeepSeek 评分(选库是否正确/回答是否出自库内原文/质量)
  E. 评分合并后写出汇总 json 便于分析

用法:
  python lab_qa_tester.py                      # 完整跑
  python lab_qa_tester.py --smoke              # 仅调 1 次接口验证连通
  python lab_qa_tester.py --limit 5            # 只跑前 5 条(开发调试)
  python lab_qa_tester.py --model deepseek-chat

接口凭据说明:
  不在此文件中写入任何密钥。API Key 从环境变量读取:
    $env:LAB_API_KEY=\"sk-xxx\"; python lab_qa_tester.py
  缺失时程序直接报错给出指引。
"""
import json, os, re, sys, time, urllib.request, urllib.error
from datetime import datetime
from collections import Counter

# ---------------- 接口配置（共享配置文件 > 环境变量） ----------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_CFG_FILE = (os.environ.get("LAB_LLM_CONFIG")
             or os.path.join(os.path.dirname(BASE_DIR), "lab_persona_engine", "config", "llm_config.json"))


def _load_llm_cfg():
    """优先读取 lab_persona_engine/config/llm_config.json，缺失时回到环境变量。"""
    if _CFG_FILE and os.path.isfile(_CFG_FILE):
        try:
            with open(_CFG_FILE, encoding="utf-8-sig") as f:
                return json.load(f)
        except Exception:  # noqa: BLE001
            pass
    return {}


_LLM_CFG = _load_llm_cfg()
API_URL = str(_LLM_CFG.get("api_url") or os.environ.get("LAB_LLM_URL")
              or "https://api.deepseek.com/v1/chat/completions").strip()
API_KEY = str(_LLM_CFG.get("api_key") or os.environ.get("LAB_API_KEY")
              or os.environ.get("DEEPSEEK_API_KEY") or "").strip()
MODEL = str(_LLM_CFG.get("model") or os.environ.get("LAB_MODEL") or "deepseek-chat").strip()
try:
    TIMEOUT = int(_LLM_CFG.get("timeout") or os.environ.get("LAB_LLM_TIMEOUT") or 60)
except (TypeError, ValueError):
    TIMEOUT = 60

SETS_FILE = os.path.join(BASE_DIR, "lab_test_question_sets.json")
LIB_FILES = {
    "main":      os.path.join(BASE_DIR, "lab_qa_knowledge_base.json"),
    "persona":   os.path.join(BASE_DIR, "lab_persona_qa.json"),
    "guardrail": os.path.join(BASE_DIR, "lab_guardrail_qa.json"),
}
TS = datetime.now().strftime("%Y%m%d_%H%M%S")
LOG_PATH  = os.path.join(BASE_DIR, f"lab_test_log_{TS}.txt")
JSONL_OUT = os.path.join(BASE_DIR, f"lab_test_run_{TS}.jsonl")
RESULT_JSON = os.path.join(BASE_DIR, f"lab_test_results_{TS}.json")


def call_deepseek(messages, temperature=0.2, retries=2):
    """调用 DeepSeek(OpenAI 兼容协议), 返回文本; 失败重试后抛出末尾异常。"""
    body = json.dumps({
        "model": MODEL,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": 4096,
    }, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        API_URL, data=body,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {API_KEY}"})
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
    """从模型输出中稳健地抽取 JSON 对象。"""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except Exception:
        pass
    # 容错: 模型偶发输出空字符/双花括号包裹, 归一后重试
    norm = text.replace("{{", "{").replace("}}", "}")
    if norm != text:
        try:
            return json.loads(norm)
        except Exception:
            pass
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except Exception:
            pass
    return None


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_library_catalog():
    """加载三个库, 返回 {kb: [条目]} 及 {answer: (kb,id)} 反查表(用于原文校验)。"""
    catalog, answer_owner = {}, {}
    for kb, path in LIB_FILES.items():
        doc = load_json(path)
        items = []
        for q in doc["qa_knowledge_base"]:
            item = {"id": q["id"], "intent": q["intent"], "category": q.get("category", ""),
                    "question": q.get("question", ""), "answer": q.get("answer", "")}
            items.append(item)
            answer_owner[q.get("answer", "")] = (kb, q.get("id", ""))
        catalog[kb] = items
    return catalog, answer_owner


def compact_catalog(catalog):
    """把三个库整理成给模型的紧凑文本(仅 id/intent/category/answer, 节省 token)。"""
    lines = []
    for kb in ("main", "persona", "guardrail"):
        lines.append(f"===== 库[{kb}] =====")
        for it in catalog[kb]:
            lines.append(f"[{kb}|{it['id']}|{it['intent']}|{it['category']}] {it['answer']}")
    return "\n".join(lines)


ROUTE_SYS = ("你是福建省联迪移动支付研究与应用重点实验室数字人讲解员\"小联\"的问答路由模块。"
             "三个知识库的条目格式为 [库名|id|intent|分类] 回答原文:\n"
             "{catalog}\n\n"
             "用户会给出一个参观者提问。你必须:\n"
             "1) 判断该提问属于哪个库: main=实验室业务/技术/科研成果等, persona=人设/相貌恭维/合理调戏/撒娇/被索吻后的温和拒绝, guardrail=越界违规(色情/隐私窥探/人身攻击/持续骚扰)、超纲无关话题、外语引导;\n"
             "2) 从该库中选一条最合适的条目, 原样返回其回答原文, 绝对不得改写、拼凑或补充任何库外内容;\n"
             "3) 只输出一个 JSON 对象, 不要输出任何其他文字:\n"
             "{{\"kb\":\"main|persona|guardrail\", \"id\":\"条目id\", \"answer\":\"库内回答原文\"}}\n"
             "路由细则:\n"
             "- 索吻、求亲、求抱等越界撒娇 → persona 的 boundary_kiss 条目, 温和拒绝并划清界限; 只有露骨色情内容(黄段子/裸聊/陪你睡/偷拍)才走 guardrail;\n"
             "- 外文提问: 打招呼、请求英文介绍、或无对应业务条目可答时 → guardrail 外语引导条目; 若外文背后有明确业务问题(专利数量、技术原理、检测设备、合作参观等) → 直接选 main 对应条目回答;\n"
             "- 若多个库都有可匹配条目, 按 main→persona→guardrail 优先级取最先合适者。")

def route_and_answer(catalog, question, qid):
    """第一轮: 判断归属库并取原文回答。返回 (obj, raw_text)。"""
    user = f"参观者提问(用例{qid}): {question}\n请按规则输出 JSON。"
    raw = call_deepseek([{"role": "system", "content": ROUTE_SYS.format(catalog=compact_catalog(catalog))},
                         {"role": "user", "content": user}])
    obj = extract_json(raw)
    if not obj or not isinstance(obj, dict):
        raise ValueError(f"模型未返回合法 JSON: {raw[:200]}")
    return obj, raw


SCORE_SYS = ("你是对话质量评估员。系统会提供四件事: 参观者提问、期望路由(正确答案来源)、系统实际路由、系统给你的回复。\n"
             "请输出 JSON:\n"
             "{{\"kb_match\":0或1, \"answer_exact\":0或1, \"quality\":1到5整数, \"note\":\"一句话点评\"}}\n"
             "判定规则:\n"
             "- kb_match = 1 当且仅当 系统实际路由的库(kb) 与 期望路由的库(kb) 完全一致, 否则为 0;\n"
             "- answer_exact = 1 当且仅当 系统回复 与 系统实际路由所指条目的回答原文 逐字一致(不含任何改写、增删、拼接、解释), 否则为 0;\n"
             "- quality 表示该回复对参观者问题的合适程度: 5=完美 4=良好 3=可用 2=偏差 1=错误。")


def resolve_item(catalog, kb, item_id):
    """按 id 在指定库中查找条目, 找不到返回 None。"""
    return next((it for it in catalog.get(kb, []) if it["id"] == item_id), None)


def score_answer(catalog, answer_owner, question, qid, exp_kb, got):
    """第二轮: 评分。got = {kb,id,answer}。返回 (score_dict, raw)。"""
    got_item = resolve_item(catalog, got.get("kb"), got.get("id"))
    item_text = f"库={got['kb']}, id={got.get('id')}\n原文: {got_item['answer']}" if got_item else "未找到该条目"
    user = (f"参观者提问(用例{qid}): {question}\n"
            f"期望路由: kb={exp_kb}\n"
            f"系统实际路由: 库={got.get('kb')}, 条目id={got.get('id')}\n"
            f"系统回复: {got.get('answer')}\n"
            f"系统路由所选条目的回答原文:\n{item_text}\n"
            f"请按规则输出 JSON。")
    raw = call_deepseek([{"role": "system", "content": SCORE_SYS},
                         {"role": "user", "content": user}])
    obj = extract_json(raw)
    if not obj or not isinstance(obj, dict):
        obj = {"parse_error": raw[:200]}
    obj["answer_exact_local"] = 1 if (got_item and got_item["answer"] == got.get("answer")) else 0
    owner = answer_owner.get(got.get("answer"))
    obj["answer_owner_auto"] = f"{owner[0]}:{owner[1]}" if owner else None
    obj["kb_match_local"] = 1 if got.get("kb") == exp_kb else 0
    return obj, raw


def log(msg):
    line = f"[{datetime.now().strftime('%H:%M:%S')}] {msg}"
    print(line)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def main():
    if not API_KEY:
        print("错误: 未检测到 API Key。请通过环境变量注入后运行, 例如:\n"
              "  PowerShell: $env:LAB_API_KEY=\"sk-xxx\"; python lab_qa_tester.py\n"
              "脚本本身不保存任何凭据。")
        sys.exit(2)

    argv = sys.argv[1:]
    smoke = "--smoke" in argv
    limit = None
    if "--limit" in argv:
        limit = int(argv[argv.index("--limit") + 1])

    if smoke:
        log(f"[SMOKE] model={MODEL} url={API_URL}")
        reply = call_deepseek([{"role": "user", "content": "只回答两个字: 你好"}])
        log(f"[SMOKE] 连通成功, 模型回复: {reply}")
        return

    sets = load_json(SETS_FILE)
    catalog, answer_owner = load_library_catalog()
    log(f"加载完成: 用例{len([q for p in sets['profiles'] for q in p['questions']])}条, "
        f"库条目 主库={len(catalog['main'])} 人设={len(catalog['persona'])} 边界={len(catalog['guardrail'])}")

    rows, errs = [], []
    counter = 0
    for prof in sets["profiles"]:
        for qs in prof["questions"]:
            qid, question, typ, exp = qs["id"], qs["question"], qs["type"], qs["expected"]
            if limit and counter >= limit:
                break
            counter += 1
            row = {"id": qid, "profile": prof["id"], "age": prof["age_group"],
                   "gender": prof["gender"], "nationality": prof["nationality"],
                   "personality": prof["personality"], "question": question,
                   "type": typ, "exp_kb": exp["kb"], "exp_intent": exp.get("intent"), "exp_action": exp.get("action")}
            for attempt in (1, 2):
                try:
                    got, raw = route_and_answer(catalog, question, qid)
                    row["got_kb"] = got.get("kb")
                    row["got_id"] = got.get("id")
                    row["answer"] = got.get("answer")
                    row["route_raw"] = raw
                    break
                except Exception as e:  # noqa: BLE001
                    if attempt == 2:
                        row["error"] = f"route_fail: {e}"
                        errs.append(qid)
                    else:
                        log(f"{qid} 第一轮失败重试: {e}")
            rows.append(row)
            with open(JSONL_OUT, "a", encoding="utf-8") as f:
                f.write(json.dumps(row, ensure_ascii=False) + "\n")

            if row.get("error"):
                log(f"[{counter:03d}] {qid} {question[:20]!r} -> 路由失败 {row['error']}")
            else:
                log(f"[{counter:03d}] {qid} {question[:24]!r} -> 库={row['got_kb']} id={row['got_id']} "
                    f"答={row['answer'][:28]!r}")

    log(f"第一轮完成({len(rows)}条), 开始评分…")
    for idx, row in enumerate(rows, 1):
        if row.get("error"):
            continue
        for attempt in (1, 2):
            try:
                got = {"kb": row.get("got_kb"), "id": row.get("got_id"), "answer": row.get("answer")}
                sc, sc_raw = score_answer(catalog, answer_owner, row["question"], row["id"],
                                          row["exp_kb"], got)
                row["score"] = sc
                row["score_raw"] = sc_raw
                break
            except Exception as e:  # noqa: BLE001
                if attempt == 2:
                    row["score"] = {"error": str(e)}
                    errs.append(row["id"])
                else:
                    log(f"{row['id']} 评分失败重试: {e}")
        log(f"评分[{idx}/{len(rows)}] {row['id']} kb_match={row.get('score', {}).get('kb_match')} "
            f"exact={row.get('score', {}).get('answer_exact')} quality={row.get('score', {}).get('quality')}")

    summary = {
        "ts": TS, "model": MODEL, "total": len(rows), "errors": errs,
        "route_kb_counter": dict(Counter(r.get("got_kb") for r in rows)),
    }
    kb_ok = k = exact = q_total = qn = 0
    for r in rows:
        if r.get("error"):
            continue
        s = r.get("score", {})
        kb_ok += s.get("kb_match_local", 0)
        k += 1 if r.get("got_id") else 0
        exact += s.get("answer_exact_local", 0)
        if s.get("quality"):
            q_total += s["quality"]
            qn += 1
    log('''=== 第二轮统计结束, 生成汇总中 ===''')
    scored = qn or 1
    summary.update({
        "kb_route_hit_local": kb_ok, "got_answer": k,
        "exact_answer_local": exact,
        "avg_quality_model": round(q_total / scored, 2),
        "hit_rate_kb": round(kb_ok / len(rows), 3),
        "exact_rate": round(exact / len(rows), 3),
    })
    with open(RESULT_JSON, "w", encoding="utf-8") as f:
        json.dump({"summary": summary, "cases": rows}, f, ensure_ascii=False, indent=2)
    log(f"完成! 汇总已写入 {RESULT_JSON}")


if __name__ == "__main__":
    main()