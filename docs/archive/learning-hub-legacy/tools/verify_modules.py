"""校验题库、存档 key 与引擎结构。

用法：
    python tools/verify_modules.py

纯标准库。任一断言失败退出码 1。
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(r"C:/Users/EDY/Desktop/产品侧/学术备战支持")
SITE = ROOT / "测试demo/learning-hub"

# SQ 源文件已删除，其题库无法回源比对；改由站内存档自身对账。
SRC = {
    "ap-science-section1": ROOT / "闪卡/AP_Flashcards/Science/section 1/ap-science-section1.html",
    "ap-social-science-section1": ROOT / "闪卡/AP_Flashcards/SocialScience/AP_Social_Science_Section1.html",
}

FLASH_ENGINE_FUNCS = [
    "loadStore", "saveStore", "markCleared", "clearedCount", "renderLevels", "refreshHome",
    "resetState", "render", "startLevel", "startGame", "openLevels", "reveal", "advance",
    "choose", "finish", "snapshot", "restoreSnapshot", "goPrev", "openExitDialog",
    "closeExitDialog", "confirmExit", "leaveRound", "migrateLegacyIds", "saveProgress",
    "restoreProgress", "definitionOverflows", "textOverflows", "shrinkToFit", "fitDefinition",
    "fitText", "markReviewed", "markMastered", "pendingRound", "pendingHistory", "openReview",
    "closeReview", "renderReview", "mountHubLinks",
]

SQ_ENGINE_FUNCS = [
    "paintMeter", "paintState", "saveTimer", "restoreTimer", "timerFrame", "timerStart",
    "timerStop", "timerReset", "revealAnswer", "render", "next", "prev", "startReview",
    "finish", "hideExitPanel", "showExitPanel", "requestExit", "cancelExit", "confirmExit",
]

rows: list[tuple[str, bool, str]] = []


def check(label: str, ok: bool, detail: str = "") -> None:
    rows.append((label, ok, detail))


def read(p: Path) -> str:
    return p.read_text(encoding="utf-8-sig")


def cards_of(text: str) -> list[tuple[str, str]]:
    return re.findall(r"\{\s*term:\s*'((?:[^'\\]|\\.)*)',\s*definition:\s*'((?:[^'\\]|\\.)*)'\s*\}", text)


def data_cards_of(text: str) -> list[tuple[str, str]]:
    return re.findall(r"\{\s*term:\s*'((?:[^'\\]|\\.)*)',\s*definition:\s*'((?:[^'\\]|\\.)*)'\s*\}", text)


def questions_of(text: str) -> list[tuple[str, int, bool]]:
    """返回 [(题干, 正确下标, 有无解析)]。

    只在题库段落内切分 —— 全文搜索会把别处的 e: 也算进来。
    源文件用 const questions 标记，数据文件用 questions: 标记。
    """
    i = text.find("const questions")
    if i >= 0:
        j = text.find("const state", i)
        seg = text[i:j] if j > i else text[i:]
    else:
        i = text.find("questions:")
        if i < 0:
            return []
        seg = text[i:]
    out = []
    starts = [m.start() for m in re.finditer(r"\{\s*q:\s*'", seg)]
    for k, s in enumerate(starts):
        chunk = seg[s:starts[k + 1] if k + 1 < len(starts) else len(seg)]
        qm = re.match(r"\{\s*q:\s*'((?:[^'\\]|\\.)*)'", chunk)
        am = re.search(r"a:\s*(\d+)", chunk)
        em = re.search(r"(?<![a-zA-Z])e:\s*'((?:[^'\\]|\\.)*)'", chunk)
        if qm and am:
            out.append((qm.group(1), int(am.group(1)), em is not None))
    return out


def main() -> int:
    # ---- A1/A2/A3：闪卡数据一致 ----
    for mod_id, src_path in SRC.items():
        src = read(src_path)
        data = read(SITE / f"assets/data/{mod_id}.js")

        src_key = re.search(r"const STORE_KEY\s*=\s*'([^']+)'", src).group(1)
        data_key = re.search(r"storeKey:\s*'([^']+)'", data).group(1)
        check(f"A1 {mod_id} STORE_KEY 与源文件逐字符一致", src_key == data_key,
              f"源 {src_key} / 新 {data_key}")

        sc, dc = cards_of(src), data_cards_of(data)
        check(f"A2 {mod_id} 题库逐条一致（{len(sc)} 条）", sc == dc,
              f"源 {len(sc)} 条 / 新 {len(dc)} 条"
              + ("" if sc == dc else "，首个差异：" + str(next((i for i, (a, b) in enumerate(zip(sc, dc)) if a != b), "长度不同"))))

        sl = re.findall(r"id:\s*'(\d+\.\d+)'", src)
        dl = re.findall(r"id:\s*'(\d+\.\d+)'", data)
        check(f"A3 {mod_id} 章节结构一致（{len(sl)} 章）", sl == dl, f"源 {sl} / 新 {dl}")

    # ---- A4/A5：SQ 数据自证（源文件已删除，无法回源比对）----
    sq_data = read(SITE / "assets/data/sq-art-history.js")
    sq_data_q = questions_of(sq_data)
    check(f"A4 SQ 题目数为 5（{len(sq_data_q)} 题）", len(sq_data_q) == 5,
          f"站内存档 {len(sq_data_q)} 题")
    check("A4b SQ 每题都有题干与正确项",
          all(q[0] and q[1] >= 0 for q in sq_data_q), "")
    data_e = sum(1 for q in sq_data_q if q[2])
    check(f"A5 SQ 解析字段保留（{data_e} 条）", data_e == 3, f"站内存档 {data_e} 条")

    # ---- A6：DOM id 未丢 ----
    for mod_id, src_path in SRC.items():
        src_body = re.search(r"<body[^>]*>(.*?)<script", src_path.read_text(encoding="utf-8-sig"), re.S).group(1)
        src_ids = set(re.findall(r'id="([^"]+)"', src_body))
        shell = read(SITE / f"modules/{mod_id}.html")
        shell_ids = set(re.findall(r'id="([^"]+)"', shell))
        missing = src_ids - shell_ids
        check(f"A6 {mod_id} DOM id 未丢（{len(src_ids)} 个）", not missing,
              f"缺失 {sorted(missing)[:5]}" if missing else f"{len(src_ids)} 个全在")

    # SQ 壳页：DOM id 齐全（源文件已删除，按引擎所需 id 清单核对）
    sq_shell = read(SITE / "modules/sq-art-history.html")
    sq_ids = set(re.findall(r'id="([^"]+)"', sq_shell))
    sq_required = {"welcomeView", "gameView", "resultView", "startBtn", "questionText",
                   "options", "nextBtn", "prevBtn", "timerBtn", "timerNum", "timerFill",
                   "exitPanel", "exitConfirmBtn", "exitStayBtn", "welcomeCount"}
    missing = sq_required - sq_ids
    check(f"A6b SQ 壳页 DOM id 齐全（{len(sq_required)} 个）", not missing,
          f"缺失 {sorted(missing)[:5]}" if missing else "全在")

    # ---- A7/A8：引擎函数齐全 ----
    eng = read(SITE / "assets/engine.js")
    missing = [f for f in FLASH_ENGINE_FUNCS if f"function {f}(" not in eng]
    check(f"A7 闪卡引擎函数齐全（{len(FLASH_ENGINE_FUNCS)} 个）", not missing,
          f"缺 {missing}" if missing else "全在")

    sq_eng = read(SITE / "assets/sq-engine.js")
    missing = [f for f in SQ_ENGINE_FUNCS if f"function {f}(" not in sq_eng]
    check(f"A8 SQ 引擎函数齐全（{len(SQ_ENGINE_FUNCS)} 个）", not missing,
          f"缺 {missing}" if missing else "全在")

    # ---- A9：无外部资源 ----
    for p in sorted(SITE.rglob("*.html")) + sorted((SITE / "assets").rglob("*.js")) + \
             sorted((SITE / "assets").rglob("*.css")):
        t = read(p)
        hits = re.findall(r"https?://[^\s\"')]+", t) + re.findall(r'src="//[^"]+', t)
        rel = p.relative_to(SITE)
        if hits:
            check(f"A9 {rel} 无外部资源引用", False, f"{len(hits)} 处：{hits[:3]}")
    check("A9 全部文件无外部资源引用", True, "")

    # ---- 附加：结构安全 ----
    for mod_id in list(SRC) + ["sq-art-history"]:
        shell = read(SITE / f"modules/{mod_id}.html")
        check(f"附加 {mod_id} 有 data-module", f'data-module="{mod_id}"' in shell, "")
        check(f"附加 {mod_id} 无内联 script", "<script>" not in shell, "")
    eng_all = read(SITE / "assets/engine.js")
    check("附加 闪卡引擎用 MOD.storeKey 而非硬编码", "fx_fc_v1:" not in eng_all, "")
    check("附加 旧全局名已全部消除", "__interactionState" not in eng_all and "__interactionState" not in sq_eng, "")

    # ---- 输出 ----
    print(f"# 校验 {SITE.name}")
    print()
    passed = sum(1 for _, ok, _ in rows if ok)
    failed = [r for r in rows if not r[1]]
    for label, ok, detail in rows:
        mark = "PASS" if ok else "FAIL"
        print(f"[{mark}] {label}" + (f"：{detail}" if detail and not ok else ""))
    print()
    print(f"合计：{passed} PASS / {len(failed)} FAIL")
    if failed:
        print("[FAIL] 存在未通过项")
        return 1
    print("[OK] 全部通过")
    return 0


if __name__ == "__main__":
    sys.exit(main())
