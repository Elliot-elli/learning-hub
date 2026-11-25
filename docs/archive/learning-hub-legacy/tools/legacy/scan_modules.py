"""扫描源文件，生成 assets/data/manifest.js。

卡片信息从源文件抽，不手写 —— 源文件改了题量，manifest 跟着变。
"""
from __future__ import annotations

import re
import time
from pathlib import Path

ROOT = Path(r"C:/Users/EDY/Desktop/产品侧/学术备战支持")
SITE = ROOT / "learning-hub"

# 描述文案手写（源文件里没有），其余元信息全部自动抽取
DESCRIPTIONS = {
    "sq-art-history": {
        "desc": "10 秒倒计时揭示式选择题：倒计时归零才揭晓正确选项，不判分不计分。",
        "badge": "SQ",
    },
    "ap-science-section1": {
        "desc": "AP 科学 Section 1 词汇闪卡，三态自评（会 / 不确定 / 不会）+ 章节断点续学。",
        "badge": "闪卡",
    },
    "ap-social-science-section1": {
        "desc": "AP 社科 Section 1 词汇闪卡，三态自评 + 待复查清单 + 章节断点续学。",
        "badge": "闪卡",
    },
}

SOURCES = [
    {
        "id": "sq-art-history",
        "type": "sq",
        "path": ROOT / "SQ/ad-art-history-quiz.html",
        "href": "modules/sq-art-history.html",
    },
    {
        "id": "ap-science-section1",
        "type": "flashcards",
        "path": ROOT / "AP_Flashcards/Science/section 1/ap-science-section1.html",
        "href": "modules/ap-science-section1.html",
    },
    {
        "id": "ap-social-science-section1",
        "type": "flashcards",
        "path": ROOT / "AP_Flashcards/SocialScience/AP_Social_Science_Section1.html",
        "href": "modules/ap-social-science-section1.html",
    },
]


def read(p: Path) -> str:
    return p.read_text(encoding="utf-8-sig")


def grab(pattern: str, text: str, default: str = "") -> str:
    m = re.search(pattern, text, re.S)
    return m.group(1).strip() if m else default


def scan(src: dict) -> dict:
    t = read(src["path"])
    out: dict = {"id": src["id"], "type": src["type"], "href": src["href"]}

    if src["type"] == "flashcards":
        out["title"] = grab(r"class=\"subject-line\">(.*?)</h2>", t) or grab(r"<title>(.*?)</title>", t)
        out["storeKey"] = grab(r"const STORE_KEY\s*=\s*'([^']+)'", t)
        cards = len(re.findall(r"\{\s*term:\s*'", t))
        levels = len(re.findall(r"id:\s*'\d+\.\d+'", t))
        out["meta"] = {"cards": cards, "chapters": levels}
        out["tracksProgress"] = True
    else:
        out["title"] = grab(r"class=\"question-label\">(.*?)</div>", t) or grab(r"<title>(.*?)</title>", t)
        out["storeKey"] = None
        questions = len(re.findall(r"\{\s*q:\s*'", t))
        out["meta"] = {"questions": questions, "chapters": 0}
        out["tracksProgress"] = False

    out["desc"] = DESCRIPTIONS[src["id"]]["desc"]
    out["badge"] = DESCRIPTIONS[src["id"]]["badge"]
    return out


def main() -> None:
    mods = [scan(s) for s in SOURCES]
    lines = [
        "// 模块清单 —— 由 tools/scan_modules.py 从源文件生成，不要手改。",
        "// 加模块：往 scan_modules.py 的 SOURCES 加一条，重跑本脚本。",
        "window.HUB_MANIFEST = {",
        f"  generated: '{time.strftime('%Y-%m-%d')}',",
        "  modules: [",
    ]
    for m in mods:
        meta = m["meta"]
        if m["type"] == "flashcards":
            meta_s = f"{{ cards: {meta['cards']}, chapters: {meta['chapters']} }}"
        else:
            meta_s = f"{{ questions: {meta['questions']}, chapters: {meta['chapters']} }}"
        store = f"'{m['storeKey']}'" if m["storeKey"] else "null"
        lines.append("    {")
        lines.append(f"      id: '{m['id']}',")
        lines.append(f"      type: '{m['type']}',")
        lines.append(f"      href: '{m['href']}',")
        lines.append(f"      title: '{m['title']}',")
        lines.append(f"      badge: '{m['badge']}',")
        lines.append(f"      desc: '{m['desc']}',")
        lines.append(f"      storeKey: {store},")
        lines.append(f"      meta: {meta_s},")
        lines.append(f"      tracksProgress: {'true' if m['tracksProgress'] else 'false'}")
        lines.append("    },")
    lines.append("  ]")
    lines.append("};")
    lines.append("")

    out = SITE / "assets/data/manifest.js"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines), encoding="utf-8", newline="\n")
    print(f"[OK] {out.relative_to(SITE)}  {out.stat().st_size:,} B")
    for m in mods:
        print(f"  · {m['id']:28} {m['title']:32} {m['meta']}")


if __name__ == "__main__":
    main()
