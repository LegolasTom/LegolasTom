# -*- coding: utf-8 -*-
"""
实验项目介绍程序 API 调用应答库 测试程序

双维度闭环测试:
  A(数字人路由): 对每条问题, 让模型在 project_api 库中选最合适条目并原样返回 reply
  B(API一致性):  程序读取所选条目的 api_call, 经中间层真实 HTTP 调用本地实验项目介绍程序,
                 断言 ①api_call 与问题库期望一致 ②服务器返回的项目与 lab_projects.json 一致
  C(独立评分):   第二轮让模型对 路由命中/API一致性/质量 打分, 并叠加本地客观指标

用法:
  python lab_project_tester.py [--smoke] [--limit N]
  API Key 从环境变量读取: $env:LAB_API_KEY="sk-xxx"; python lab_project_tester.py
  本地服务自动探测/拉起: server.py --port 8077 (可用环境变量 LAB_API_BASE 覆盖)
"""
import json, os, re, subprocess, sys, time, urllib.request, urllib.parse
from datetime import datetime
from collections import Counter

API_URL = "https://tokenhub.landicorp.com/v1/chat/completions"
API_KEY = os.environ.get("LAB_API_KEY") or os.environ.get("DEEPSEEK_API_KEY") or ""
MODEL   = os.environ.get("LAB_MODEL", "deepseek-v4.1-flash-1017")
TIMEOUT = 60

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
LIB_FILE   = os.path.join(BASE_DIR, "lab_project_api_qa.json")
SETS_FILE  = os.path.join(BASE_DIR, "lab_project_test_questions.json")
SERVER_PY  = os.path.join(BASE_DIR, "server.py")
API_BASE   = os.environ.get("LAB_API_BASE", "http://127.0.0.1:8077/api/v1")

TS = datetime.now().strftime("%Y%m%d_%H%M%S")
LOG_PATH    = os.path.join(BASE_DIR, f"lab_project_test_log_{TS}.txt")
JSONL_OUT   = os.path.join(BASE_DIR, f"lab_project_test_run_{TS}.jsonl")
RESULT_JSON = os.path.join(BASE_DIR, f"lab_project_test_results_{TS}.json")


def call_deepseek(messages, temperature=0.2, retries=2):
    body = json.dumps({"model": MODEL, "messages": messages,
                       "temperature": temperature, "max_tokens": 4096},
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
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end > start:
        try:
            return json.loads(text[start:end + 1])
        except Exception:
            pass
    return None


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def http_json(url, timeout=5):
    req = urllib.request.Request(url, headers={"X-From": "lab-project-tester"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


# ---------------- 本地服务管理 ----------------
_spawned = []


def ensure_server():
    """探测 API 根节点; 不可达则拉起 server.py 子进程。返回是否由本进程拉起。"""
    port = re.search(r":(\d+)", API_BASE)
    if port:
        for _ in range(4):
            try:
                http_json(API_BASE, timeout=2)
                return False
            except Exception:  # noqa: BLE001
                time.sleep(0.4)
    args = [sys.executable, SERVER_PY, "--port", port.group(1) if port else "8077"]
    proc = subprocess.Popen(args, cwd=BASE_DIR,
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    _spawned.append(proc)
    for _ in range(20):
        try:
            http_json(API_BASE, timeout=2)
            return True
        except Exception:  # noqa: BLE001
            time.sleep(0.5)
    raise RuntimeError("本地实验项目介绍程序服务启动失败")


def shutdown_server():
    for p in _spawned:
        try:
            p.terminate()
        except Exception:  # noqa: BLE001
            pass


def exec_api_call(call):
    """中间层: 把 api_call 翻译为真实 HTTP 请求, 返回执行摘要。"""
    act = call.get("action")
    payload = call.get("payload") or {}
    try:
        if act == "show_project":
            pid = payload.get("id")
            d = http_json(f"{API_BASE}/projects/{urllib.parse.quote(str(pid))}")
            ok = d.get("status") == "ok" and d.get("project", {}).get("id") == pid
            return {"action": act, "ok": ok, "kind": "detail",
                    "ids": [pid] if ok else [], "total": 1 if ok else 0, "detail": d}
        params = []
        if payload.get("category"):
            params.append(("category", payload["category"]))
        if payload.get("keywords"):
            params.append(("q", " ".join(payload["keywords"])))
        qs = "&".join(f"{k}={urllib.parse.quote(v)}" for k, v in params)
        url = f"{API_BASE}/projects" + (f"?{qs}" if qs else "")
        d = http_json(url)
        ids = [p["id"] for p in d.get("projects", [])]
        return {"action": act, "ok": d.get("status") == "ok", "kind": "list",
                "ids": ids, "total": d.get("total", 0), "detail": d}
    except Exception as e:  # noqa: BLE001
        return {"action": act, "ok": False, "kind": "error", "ids": [], "total": 0, "detail": {"error": str(e)}}


# ---------------- 应答库 & 问题库 ----------------
def load_library():
    doc = load_json(LIB_FILE)
    entries = {}
    for it in doc["entries"]:
        entries[it["id"]] = it
    return doc["api_protocol"], entries


def compact_catalog(entries):
    lines = []
    for pid in entries:
        e = entries[pid]
        lines.append(f"[project_api|{e['id']}|{e['intent']}|{e['category']}] "
                     f"reply={e['reply']} (api_call: action={e['api_call']['action']} "
                     f"payload={json.dumps(e['api_call']['payload'], ensure_ascii=False)})")
    return "\n".join(lines)


ROUTE_SYS = ("你是实验项目介绍程序API调用应答库的路由模块。库条目格式为:\n"
             "[project_api|id|intent|分类] reply=回复原文 (api_call: action=动作 payload=载荷)\n"
             "{catalog}\n\n"
             "用户会给出一个参观者提问。你必须:\n"
             "1) 判断该提问是否属于实验项目介绍类(怎么做/有哪些/能测什么/项目筛选); 属于则在库中选一条最合适的条目;\n"
             "2) 原样返回该条目的 reply 原文, 绝对不得改写、拼凑或补充库外内容; api_call 由程序按所选条目自动携带, 你无需输出;\n"
             "3) 只输出一个 JSON 对象, 不要输出任何其他文字:\n"
             "{{\"kb\":\"project_api\", \"id\":\"条目id\", \"reply\":\"库内回复原文\"}}\n"
             "路由细则:\n"
             "- 问'怎么做/怎么测/怎么操作'类 → 选对应具体项目的 show_project 条目 (reply 含'我来调出具体介绍');\n"
             "- 问'有哪些/什么测试/能测什么/有没有'疑虑式筛选 → 选 filter_projects 或 show_projects 条目;\n"
             "- 提到明确分类名(气候/机械/电磁兼容EMC/电池/射频NFC/声学/自动化/失效分析) → 选对应分类的 filter 条目;\n"
             "- 没有明确类别与动作时, 选 pap_040(全部项目); 完全超出项目介绍类(如闲聊/人设)不计入本库。")

def route_and_pick(entries, question, qid):
    user = f"参观者提问(用例{qid}): {question}\n请按规则输出 JSON。"
    raw = call_deepseek([{"role": "system", "content": ROUTE_SYS.format(catalog=compact_catalog(entries))},
                         {"role": "user", "content": user}])
    obj = extract_json(raw)
    if not obj or not isinstance(obj, dict):
        raise ValueError(f"模型未返回合法 JSON: {raw[:200]}")
    return obj, raw


SCORE_SYS = ("你是实验项目问答+API调用评估员。系统会提供: 参观者提问、期望条目id、实际路由条目id、"
             "实际reply、api_call一致性判定、API真实执行结果。\n"
             "请输出 JSON:\n"
             "{{\"entry_match\":0或1, \"api_call_match\":0或1, \"api_ok\":0或1, \"quality\":1到5整数, \"note\":\"一句话点评\"}}\n"
             "判定规则:\n"
             "- entry_match = 1 当且仅当 实际条目id 与 期望条目id 一致;\n"
             "- api_call_match = 1 当且仅当 所选条目的 api_call 的 action 与 payload 同期望完全一致(载荷字段集合一致);\n"
             "- api_ok = 1 当且仅当 API 真实调用成功且返回项目与预期一致(兜底用例按'跳过'处理填 0 但不计差);\n"
             "- quality 表示该 reply+api_call 对参观者问题的合适程度: 5=完美 4=良好 3=可用 2=偏差 1=错误。")

def score_case(question, qid, expected, given):
    exp_call = expected["expected_api_call"]
    got_entry = given.get("got_entry")
    reply = given.get("reply")
    api_call = given.get("api_call") or {}
    api_result = given.get("api_result") or {}
    user = (f"参观者提问(用例{qid}): {question}\n"
            f"期望条目id: {expected.get('expected_entry')}\n"
            f"期望api_call: {json.dumps(exp_call, ensure_ascii=False)}\n"
            f"实际路由条目id: {got_entry}\n"
            f"实际reply: {reply}\n"
            f"实际api_call: {json.dumps(api_call, ensure_ascii=False)}\n"
            f"API真实执行结果: status={api_result.get('ok')} total={api_result.get('total')} ids={api_result.get('ids')}\n"
            f"请按规则输出 JSON。")
    raw = call_deepseek([{"role": "system", "content": SCORE_SYS},
                         {"role": "user", "content": user}])
    obj = extract_json(raw)
    return (obj if isinstance(obj, dict) else {"parse_error": raw[:200]}), raw


def log(msg):
    line = f"[{datetime.now().strftime('%H:%M:%S')}] {msg}"
    print(line)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def main():
    if not API_KEY:
        print("错误: 未检测到 API Key。请通过环境变量注入后运行, 例如:\n"
              "  PowerShell: $env:LAB_API_KEY=\"sk-xxx\"; python lab_project_tester.py\n"
              "脚本本身不保存任何凭据。")
        sys.exit(2)

    argv = sys.argv[1:]
    smoke = "--smoke" in argv
    limit = int(argv[argv.index("--limit") + 1]) if "--limit" in argv else None

    if smoke:
        log(f"[SMOKE] model={MODEL} url={API_URL} api_base={API_BASE}")
        reply = call_deepseek([{"role": "user", "content": "只回答两个字: 你好"}])
        log(f"[SMOKE] 模型连通成功: {reply}")
        try:
            d = http_json(API_BASE)
            log(f"[SMOKE] 本地服务连通成功: meta={json.dumps(d.get('meta', {}), ensure_ascii=False)[:80]}")
        except Exception as e:  # noqa: BLE001
            log(f"[SMOKE] 本地服务连通失败(将尝试拉起): {e}")
            ensure_server()
            log("[SMOKE] 本地服务已就绪")
        finally:
            shutdown_server()
        return

    ensure_server()
    log(f"本地实验项目介绍程序已就绪: {API_BASE}")
    _, entries = load_library()
    sets = load_json(SETS_FILE)
    cases = sets["cases"]
    if limit:
        cases = cases[:limit]
    log(f"加载完成: 问题库{len(cases)}条, 应答库{len(entries)}条")

    rows, errs = [], []
    for idx, c in enumerate(cases, 1):
        qid, question = c["id"], c["question"]
        row = {"id": qid, "group": c.get("group"), "question": question,
               "exp_entry": c["expected_entry"], "exp_api_call": c["expected_api_call"],
               "exp_ids": c.get("exp_ids", []), "exp_total": c.get("exp_total", 0),
               "assert_api_call": c.get("assert_api_call", True)}
        for attempt in (1, 2):
            try:
                got, raw = route_and_pick(entries, question, qid)
                row["got_entry"] = got.get("id")
                row["reply"] = got.get("reply")
                row["route_raw"] = raw
                break
            except Exception as e:  # noqa: BLE001
                if attempt == 2:
                    row["error"] = f"route_fail: {e}"
                    errs.append(qid)
                else:
                    log(f"{qid} 第一轮失败重试: {e}")

        # ---- API 中间层: 真实性调用 & 断言 ----
        entry = entries.get(row.get("got_entry"))
        if entry and not row.get("error"):
            row["api_call"] = entry["api_call"]
            row["reply_exact_local"] = 1 if row.get("reply") == entry["reply"] else 0
            row["api_result"] = exec_api_call(entry["api_call"])
        if row.get("assert_api_call") and not row.get("error"):
            # api_call 一致性(与问题库期望对比)
            a_call = row.get("api_call") or {}
            exp_call = c["expected_api_call"]
            same_action = a_call.get("action") == exp_call.get("action")
            p1, p2 = a_call.get("payload") or {}, exp_call.get("payload") or {}
            if "keywords" in p1 or "keywords" in p2:
                list1, list2 = p1.get("keywords"), p2.get("keywords")
                same_payload = set(list1 or []) == set(list2 or [])
            else:
                same_payload = p1 == p2
            row["api_call_match_local"] = 1 if (same_action and same_payload) else 0
            # API 真实执行断言
            total = row.get("api_result", {}).get("total", 0)
            ids = row.get("api_result", {}).get("ids", [])
            exp_ids = c.get("exp_ids", [])
            ids_ok = all(eid in ids for eid in exp_ids)
            total_ok = (total == c.get("exp_total", 0)) if exp_ids else True
            row["api_ok_local"] = 1 if (ids_ok and total_ok) else 0
        elif not row.get("error") and not row.get("assert_api_call"):
            row["api_ok_local"] = None      # 兜底用例: 不执行 API 断言
            row["api_call_match_local"] = None  # 兜底用例: 不比较 api_call 一致性

        rows.append(row)
        with open(JSONL_OUT, "a", encoding="utf-8") as f:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
        if row.get("error"):
            log(f"[{idx:02d}] {qid} {question[:18]!r} -> 路由失败 {row['error']}")
        else:
            api_ok = row.get("api_ok_local")
            api_txt = ("跳过" if api_ok is None else ("OK" if api_ok == 1 else "FAIL"))
            log(f"[{idx:02d}] {qid} {question[:20]!r} -> 条目={row.get('got_entry')} "
                f"api={row.get('api_result', {}).get('total', '-')}项/断言{api_txt}")

    log(f"第一轮完成({len(rows)}条), 开始评分…")
    for idx, row in enumerate(rows, 1):
        if row.get("error"):
            continue
        for attempt in (1, 2):
            try:
                sc, sc_raw = score_case(row["question"], row["id"], next(
                    c for c in (sets["cases"][:limit] if limit else sets["cases"]) if c["id"] == row["id"]))
                row["score"] = sc
                row["score_raw"] = sc_raw
                break
            except Exception as e:  # noqa: BLE001
                if attempt == 2:
                    row["score"] = {"error": str(e)}
                    errs.append(row["id"])
                else:
                    log(f"{row['id']} 评分失败重试: {e}")
        log(f"评分[{idx}/{len(rows)}] {row['id']} entry={row.get('score', {}).get('entry_match')} "
            f"api_call={row.get('score', {}).get('api_call_match')} quality={row.get('score', {}).get('quality')}")

    summary = {"ts": TS, "model": MODEL, "total": len(rows), "errors": errs}
    a1 = e1 = r1 = h1 = q_total = qn = n_skip = n_skip_call = 0
    m_total_n = 0
    for r in rows:
        if r.get("error"):
            continue
        h1 += 1 if r.get("got_entry") == r.get("exp_entry") else 0
        r1 += r.get("reply_exact_local", 0)
        m_total_n += 1
        c_match = r.get("api_call_match_local")
        if c_match is None:
            n_skip_call += 1
        else:
            a1 += 1 if c_match == 1 else 0
        e1_no = r.get("api_ok_local")
        if e1_no is not None:
            e1 += 1 if e1_no == 1 else 0
        else:
            n_skip += 1
        qv = (r.get("score") or {}).get("quality")
        if qv:
            q_total += qv
            qn += 1
    scorable = len(rows) - len(errs)
    api_scorable = max(1, len(rows) - len(errs) - n_skip)
    call_scorable = max(1, m_total_n - n_skip_call)
    summary.update({
        "route_hit_local": h1, "reply_exact_local": r1,
        "api_call_match_local": a1, "api_ok_local": e1,
        "api_skip": n_skip, "api_call_skip": n_skip_call, "scorable": scorable,
        "route_hit_rate": round(h1 / max(1, scorable), 3),
        "reply_exact_rate": round(r1 / max(1, scorable), 3),
        "api_call_match_rate": round(a1 / call_scorable, 3),
        "api_ok_rate": round(e1 / api_scorable, 3),
        "avg_quality_model": round(q_total / max(1, qn), 2),
    })
    with open(RESULT_JSON, "w", encoding="utf-8") as f:
        json.dump({"summary": summary, "cases": rows}, f, ensure_ascii=False, indent=2)
    shutdown_server()
    log(f"完成! 汇总已写入 {RESULT_JSON}  路由命中={h1}/{scorable} API断言通过={e1}/{api_scorable} 平均质量={summary['avg_quality_model']}")


if __name__ == "__main__":
    main()