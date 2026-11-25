"""从 3 个源文件抽取内容，生成站点的资源与数据文件。

只做搬运与结构化，不改写题库文本。产物是站点资源，不是最终交付。
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(r"C:/Users/EDY/Desktop/产品侧/学术备战支持")
SITE = ROOT / "learning-hub"

SRC_SCI = ROOT / "AP_Flashcards/Science/section 1/ap-science-section1.html"
SRC_SOC = ROOT / "AP_Flashcards/SocialScience/AP_Social_Science_Section1.html"
SRC_SQ = ROOT / "SQ/ad-art-history-quiz.html"


def read(p: Path) -> str:
    return p.read_text(encoding="utf-8-sig")


def style_of(t: str) -> str:
    m = re.search(r"<style>(.*?)</style>", t, re.S)
    if not m:
        raise SystemExit("找不到 <style>")
    return m.group(1).strip("\n")


def body_of(t: str) -> str:
    """取 <body> 到 <script> 之间的结构（不含 script）。"""
    m = re.search(r"<body[^>]*>(.*?)<script", t, re.S)
    if not m:
        raise SystemExit("找不到 body")
    return m.group(1).strip("\n")


def js_of(t: str) -> str:
    """取最后一个 <script> ... </script> 的内容（内联 JS）。"""
    m = re.search(r"<script>(.*?)</script>", t, re.S)
    if not m:
        raise SystemExit("找不到内联 script")
    return m.group(1)


def game_block(t: str) -> str:
    """抽 const GAME = { ... }; 的内部结构（不含 const GAME 与结尾分号）。"""
    m = re.search(r"const GAME\s*=\s*\{(.*?)\n\s*\};", t, re.S)
    if not m:
        raise SystemExit("找不到 GAME 块")
    return m.group(1).rstrip()


def cards_of(t: str) -> list[tuple[str, str]]:
    return re.findall(r"\{\s*term:\s*'((?:[^'\\]|\\.)*)',\s*definition:\s*'((?:[^'\\]|\\.)*)'\s*\}", t)


def levels_of(t: str) -> list[tuple[str, int]]:
    """返回 [(level id, 卡片数)]，按出现顺序。"""
    out: list[tuple[str, int]] = []
    for m in re.finditer(r"id:\s*'(\d+\.\d+)'[^{]*?cards:\s*\[(.*?)\n\s*\]", t, re.S):
        n = len(re.findall(r"\{\s*term:\s*'", m.group(2)))
        out.append((m.group(1), n))
    return out


def sections_of(t: str) -> list[tuple[int, str]]:
    return [(int(a), b) for a, b in re.findall(r"num:\s*(\d+),\s*label:\s*'([^']*)'", t)]


def questions_of(t: str) -> list[dict]:
    """抽 SQ 的 { q, o:[...], a, e? } 题库。

    逐题切分（按 q: 字段起头），不跨题做贪婪匹配 ——
    用单个大正则时 a 后的可选 e 字段会触发回溯，把下一题的选项吞进本题。
    """
    m = re.search(r"const questions\s*=\s*\[(.*?)\n\s*\];", t, re.S)
    if not m:
        raise SystemExit("找不到 questions 块")
    body = m.group(1)
    # 以 "{ q: " 作为题与题的分界
    starts = [mm.start() for mm in re.finditer(r"\{\s*q:\s*'", body)]
    out: list[dict] = []
    for i, s in enumerate(starts):
        e = starts[i + 1] if i + 1 < len(starts) else len(body)
        chunk = body[s:e]
        qm = re.match(r"\{\s*q:\s*'((?:[^'\\]|\\.)*)'", chunk)
        om = re.search(r"o:\s*\[(.*?)\]", chunk, re.S)
        am = re.search(r"a:\s*(\d+)", chunk)
        em = re.search(r"e:\s*'((?:[^'\\]|\\.)*)'", chunk)
        if not (qm and om and am):
            continue
        opts = re.findall(r"'((?:[^'\\]|\\.)*)'", om.group(1))
        out.append({
            "q": qm.group(1),
            "o": opts,
            "a": int(am.group(1)),
            "e": em.group(1) if em else None,
        })
    return out


def js_str(s: str) -> str:
    """把 Python 字符串安全地写成 JS 单引号字面量。"""
    return s.replace("\\", "\\\\").replace("'", "\\'")


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")
    print(f"[OK] {path.relative_to(SITE)}  {len(text.encode('utf-8')):,} B")


# ---------------------------------------------------------------- 闪卡数据
def build_flashcard_data(src: Path, mod_id: str, subject_line: str) -> str:
    t = read(src)
    store_key = re.search(r"const STORE_KEY\s*=\s*'([^']+)'", t).group(1)
    title = re.search(r"title:\s*'([^']*)',", game_block(t)).group(1)
    secs = sections_of(game_block(t))
    lvls = levels_of(game_block(t))
    cards = cards_of(game_block(t))
    total = sum(n for _, n in lvls)

    lines = [
        "// 题库数据（由 tools/extract.py 从源文件逐字抽取）",
        "// term / definition 未做任何改写，源文件里的标点与引号保持原样",
        "window.AP_MODULES = window.AP_MODULES || {};",
        f"window.AP_MODULES['{mod_id}'] = {{",
        f"  id: '{mod_id}',",
        "  type: 'flashcards',",
        f"  title: '{js_str(title)}',",
        f"  subjectLine: '{js_str(subject_line)}',",
        f"  storeKey: '{store_key}',",
        "  sections: [",
    ]
    idx = 0
    for num, label in secs:
        lines.append("    {")
        lines.append(f"      num: {num},")
        lines.append(f"      label: '{js_str(label)}',")
        lines.append("      levels: [")
        for lid, n in lvls:
            if idx >= total:
                break
            lines.append("        {")
            lines.append(f"          id: '{lid}',")
            lines.append("          cards: [")
            for _ in range(n):
                term, definition = cards[idx]
                lines.append(f"            {{ term: '{js_str(term)}', definition: '{js_str(definition)}' }},")
                idx += 1
            lines.append("          ]")
            lines.append("        },")
        lines.append("      ]")
        lines.append("    },")
    lines.append("  ]")
    lines.append("};")
    lines.append("")

    assert idx == total, f"{mod_id}: 卡片抽取数 {idx} != {total}"
    print(f"  · {mod_id}: {total} 卡 / {len(lvls)} 章 / storeKey={store_key}")
    return "\n".join(lines)


# ---------------------------------------------------------------- SQ 数据
def build_sq_data(mod_id: str) -> str:
    t = read(SRC_SQ)
    qs = questions_of(t)
    subject = re.search(r"const SUBJECT\s*=\s*'([^']*)'", t).group(1)
    timer_seconds = re.search(r"const TIMER_SECONDS\s*=\s*(\d+)", t).group(1)

    lines = [
        "// 题库数据（由 tools/extract.py 从源文件逐字抽取）",
        "// e 是源文件里就有的解析字段，当前 UI 未渲染，保留原样不删",
        "window.AP_MODULES = window.AP_MODULES || {};",
        f"window.AP_MODULES['{mod_id}'] = {{",
        f"  id: '{mod_id}',",
        "  type: 'sq',",
        f"  title: '{js_str(subject)}',",
        f"  subject: '{js_str(subject)}',",
        f"  timerSeconds: {timer_seconds},",
        "  questions: [",
    ]
    for q in qs:
        opts = ", ".join(f"'{js_str(o)}'" for o in q["o"])
        line = f"    {{ q: '{js_str(q['q'])}', o: [{opts}], a: {q['a']}"
        if q["e"] is not None:
            line += f", e: '{js_str(q['e'])}'"
        line += " },"
        lines.append(line)
    lines.append("  ]")
    lines.append("};")
    lines.append("")
    print(f"  · {mod_id}: {len(qs)} 题 / 解析字段 {sum(1 for q in qs if q['e'])} 条")
    return "\n".join(lines)


def main() -> None:
    print("=== 抽数据 ===")
    write(SITE / "assets/data/ap-science-section1.js",
          build_flashcard_data(SRC_SCI, "ap-science-section1", "AP Science Section 1"))
    write(SITE / "assets/data/ap-social-science-section1.js",
          build_flashcard_data(SRC_SOC, "ap-social-science-section1", "AP Social Science Section 1"))
    write(SITE / "assets/data/sq-art-history.js", build_sq_data("sq-art-history"))


if __name__ == "__main__":
    main()
