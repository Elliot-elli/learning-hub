"""检查引擎文件语法与结构。

用法：
    python tools/check_syntax.py
"""
import re
import subprocess
import sys
from pathlib import Path

SITE = Path(r"C:/Users/EDY/Desktop/产品侧/学术备战支持/测试demo/learning-hub")
NODE = Path(r"C:/Users/EDY/.workbuddy/binaries/node/versions/22.22.2-6/node.exe")

files = [
    SITE / "assets/engine.js",
    SITE / "assets/sq-engine.js",
    SITE / "assets/data/ap-science-section1.js",
    SITE / "assets/data/ap-social-science-section1.js",
    SITE / "assets/data/sq-art-history.js",
]

fails = 0
for f in files:
    if not f.exists():
        print(f"[FAIL] {f.name} 不存在")
        fails += 1
        continue
    proc = subprocess.run([str(NODE), "--check", str(f)], capture_output=True, text=True)
    if proc.returncode == 0:
        print(f"[OK] {f.name} 语法正确  {f.stat().st_size:,} B")
    else:
        fails += 1
        print(f"[FAIL] {f.name}")
        print(proc.stderr[:900])

# 引擎结构核对：函数名与数据来源
print()
eng = (SITE / "assets/engine.js").read_text(encoding="utf-8")
sq = (SITE / "assets/sq-engine.js").read_text(encoding="utf-8")

checks = [
    ("engine: IIFE 包裹", eng.strip().endswith("})();") and "(() => {" in eng),
    ("engine: 题库来自 MOD", "const GAME = { title: MOD.title, sections: MOD.sections };" in eng),
    ("engine: STORE_KEY 来自 MOD", "const STORE_KEY = MOD.storeKey;" in eng),
    ("engine: 内联题库已删", "const GAME = {\n  title: 'AP Science'" not in eng),
    ("engine: 旧全局已改命名空间", "__interactionState" not in eng),
    ("engine: LearningHub 已注册", "window.LearningHub.modules[MOD.id]" in eng),
    ("engine: mountHubLinks 已注入", "function mountHubLinks()" in eng),
    ("engine: mountHubLinks 已调用", "mountHubLinks();" in eng),
    ("engine: 新版文字缩放在", "function fitText()" in eng and "function shrinkToFit(" in eng),
    ("engine: 旧版溢出检测已不在", "function fitDefinition()" in eng and "textOverflows" in eng),
    ("sq: IIFE 包裹", sq.strip().endswith("})();") and "(function(){" in sq),
    ("sq: 题库来自 MOD", "const questions = MOD.questions;" in sq),
    ("sq: SUBJECT 来自 MOD", "const SUBJECT = MOD.subject;" in sq),
    ("sq: 计时来自 MOD", "const TIMER_SECONDS = MOD.timerSeconds;" in sq),
    ("sq: 长条宽度由 paintMeter 写", "'timerFill').style.width" in sq),
    ("sq: 学科色映射已删（站点 --subject-soft 生效）", "SUBJECT_TINT" not in sq),
    ("sq: 旧全局已改命名空间", "__interactionState" not in sq),
    ("sq: LearningHub 已注册", "window.LearningHub.modules[MOD.id]" in sq),
    ("sq: getter 列表保留", "get timerRemaining(){ return timer.remaining; }" in sq),
    ("sq: 核心函数齐全", all(f"function {n}(" in sq for n in
        ["paintMeter", "paintState", "saveTimer", "restoreTimer", "timerFrame", "timerStart",
         "timerStop", "timerReset", "revealAnswer", "render", "next", "prev", "startReview",
         "finish", "hideExitPanel", "showExitPanel", "requestExit", "cancelExit", "confirmExit"])),
]

for label, ok in checks:
    print(f"[{'OK' if ok else 'FAIL'}] {label}")
    if not ok:
        fails += 1

# 壳页检查：模块绑定与返回入口数
print()
for name, mod_id, expect_links in [
    ("ap-science-section1.html", "ap-science-section1", 0),
    ("ap-social-science-section1.html", "ap-social-science-section1", 0),
    ("sq-art-history.html", "sq-art-history", 3),
]:
    p = SITE / "modules" / name
    t = p.read_text(encoding="utf-8")
    n = t.count('data-hub-back')
    ok = f'data-module="{mod_id}"' in t and n == expect_links
    print(f"[{'OK' if ok else 'FAIL'}] {name}  data-module 与返回入口数 {n}/{expect_links}")
    if not ok:
        fails += 1

print()
print(f"失败 {fails} 项")
sys.exit(1 if fails else 0)
