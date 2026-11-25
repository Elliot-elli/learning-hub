"""从源文件切出站点资源：闪卡 CSS / 闪卡引擎 / SQ CSS / SQ 引擎 / 模块壳页。

引擎做定点手术，其余逐字保留 —— 行为与原文件一致是硬要求。
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(r"C:/Users/EDY/Desktop/产品侧/学术备战支持")
SITE = ROOT / "learning-hub"

SRC_SCI = ROOT / "AP_Flashcards/Science/section 1/ap-science-section1.html"
SRC_SOC = ROOT / "AP_Flashcards/SocialScience/AP_Social_Science_Section1.html"
SRC_SQ = ROOT / "SQ/ad-art-history-quiz.html"


def read(p: Path) -> str:
    return p.read_text(encoding="utf-8-sig")


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")
    print(f"[OK] {path.relative_to(SITE)}  {len(text.encode('utf-8')):,} B")


def style_of(t: str) -> str:
    return re.search(r"<style>(.*?)</style>", t, re.S).group(1).strip("\n")


def body_of(t: str) -> str:
    return re.search(r"<body[^>]*>(.*?)<script", t, re.S).group(1).strip("\n")


def inner_js(t: str) -> str:
    """内联 <script> 的内容。"""
    return re.search(r"<script>(.*?)</script>", t, re.S).group(1)


def balanced_span(text: str, start_marker: str) -> tuple[int, int]:
    """从 start_marker 处的括号开始做配平，返回 (块起, 块止) 偏移。

    不能用非贪婪正则找结尾 —— 嵌套对象里也有 };，会在中途停下。
    """
    i = text.index(start_marker) + len(start_marker) - 1
    opener = text[i]
    if opener not in "{[":
        raise SystemExit(f"标记后不是开括号：{start_marker}")
    closer = "}" if opener == "{" else "]"
    depth = 0
    in_str = False
    quote = ""
    while i < len(text):
        ch = text[i]
        if in_str:
            if ch == "\\":
                i += 2
                continue
            if ch == quote:
                in_str = False
        else:
            if ch in ("'", '"'):
                in_str = True
                quote = ch
            elif ch == opener:
                depth += 1
            elif ch == closer:
                depth -= 1
                if depth == 0:
                    return text.index(start_marker), i + 1
        i += 1
    raise SystemExit(f"括号配平未闭合：{start_marker}")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f"[FAIL] 定位失败：{label}\n  找的是：{old[:120]!r}")
    if text.count(old) != 1:
        raise SystemExit(f"[FAIL] 定位不唯一：{label}（出现 {text.count(old)} 次）")
    return text.replace(old, new, 1)


# ==================================================================== 闪卡
HUB_CSS = """

/* ---- 学习站导航链接（整合时新增） ----
   非激活视图的 .view 是 opacity:0，链接仍会被读到并抢走点击，
   所以这里跟随 .view 的 active 状态一起切换可见性。 */
.view:not(.active) [data-hub-back]{visibility:hidden;pointer-events:none}
.hub-back-float{
  position:absolute;top:20px;left:clamp(22px,6vw,80px);z-index:6;
  display:inline-flex;align-items:center;gap:6px;
  padding:8px 14px;border:1px solid var(--line-strong);border-radius:10px;
  background:var(--surface);color:var(--muted);text-decoration:none;
  font-size:.8rem;font-weight:650;letter-spacing:.03em;
  transition:color .2s,border-color .2s,background .2s;
}
.hub-back-float:hover{color:var(--ink);border-color:var(--primary);background:var(--surface-alt)}
.hub-back-inline{
  border:1px solid var(--line-strong);border-radius:10px;padding:8px 16px;
  background:transparent;color:var(--ink);text-decoration:none;
  font-size:.82rem;font-weight:650;
  transition:color .2s,background .2s,border-color .2s;
}
.hub-back-inline:hover{background:var(--surface-alt);border-color:var(--primary)}
.hub-link{
  display:block;margin-bottom:6px;color:var(--muted);text-decoration:none;
  font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;transition:color .2s;
}
.hub-link:hover{color:var(--primary)}
@media (max-width:760px){
  .hub-back-float{top:12px;left:14px;padding:6px 10px;font-size:.74rem}
}
"""


def build_flashcards_css() -> str:
    """Science 的 CSS 原样搬运 + 站点导航链接样式。"""
    css = style_of(read(SRC_SCI))
    return css + HUB_CSS


def build_engine() -> str:
    """从 Science 抽出引擎，做 6 处定点手术。"""
    src = read(SRC_SCI)
    js = inner_js(src)

    # 手术 1：删内联题库，改读模块注册表
    g_start, g_end = balanced_span(js, "const GAME = {")
    # 连同前导换行与结尾分号一起切掉
    lead = g_start
    while lead > 0 and js[lead - 1] in " \n":
        lead -= 1
    tail = g_end
    while tail < len(js) and js[tail] in " \n":
        tail += 1
    if tail < len(js) and js[tail] == ";":
        tail += 1
    js = replace_once(
        js,
        js[lead:tail],
        """
  // 题库来自 assets/data/<module>.js，由 data-module 属性定位。
  // 结构与源文件内联的 GAME 完全一致，引擎代码无需分支。
  const MOD_ID = new URLSearchParams(location.search).get('m') || document.body.dataset.module;
  const MOD = (window.AP_MODULES || {})[MOD_ID];
  if (!MOD) {
    console.error('[learning-hub] 未知模块：' + MOD_ID);
    return;
  }
  const GAME = { title: MOD.title, sections: MOD.sections };
""",
        "手术1 删内联题库",
    )

    # 手术 2：STORE_KEY 由数据提供
    js = replace_once(
        js,
        "  const STORE_KEY = 'fx_fc_v1:ap-science-section1';",
        "  const STORE_KEY = MOD.storeKey;",
        "手术2 STORE_KEY",
    )

    # 手术 3：copy 文案可覆盖
    js = replace_once(
        js,
        "  const copy = { hintBefore: 'Choose a state after you reveal the term.', hintAfter: 'Take your time, then continue when ready.' };",
        "  const copy = Object.assign({\n"
        "    hintBefore: 'Choose a state after you reveal the term.',\n"
        "    hintAfter: 'Take your time, then continue when ready.'\n"
        "  }, MOD.copy || {});",
        "手术3 copy",
    )

    # 手术 4：全局泄漏改命名空间
    js = replace_once(
        js,
        "  window.__interactionState = state;",
        "  // 对外只暴露一个命名空间，避免多模块塞进同一文档时撞名\n"
        "  window.LearningHub = window.LearningHub || { modules: {} };\n"
        "  window.LearningHub.modules[MOD.id] = { id: MOD.id, type: 'flashcards', state: state, store: store, GAME: GAME };",
        "手术4 命名空间",
    )

    # 手术 5：注入返回主目录入口
    mount = """
  // ---- 学习站导航：返回主目录（整合时新增） ----
  function mountHubLinks(){
    var HREF = '../index.html';
    function mk(cls, label){
      var a = document.createElement('a');
      a.className = cls; a.href = HREF; a.textContent = label;
      a.setAttribute('data-hub-back', '');
      return a;
    }
    // welcome：左上角浮层
    if (welcomeView) welcomeView.appendChild(mk('hub-back hub-back-float', '← Learning Hub'));
    // levels：顶栏 Back 之后追加
    if ($('levelsBackBtn') && $('levelsBackBtn').parentNode){
      $('levelsBackBtn').parentNode.appendChild(mk('hub-back-inline', 'Hub'));
    }
    // game：标题块上方，不与右上角 Exit 打架
    var wrap = document.querySelector('.game-title-wrap');
    if (wrap) wrap.insertBefore(mk('hub-link', '← Learning Hub'), wrap.firstChild);
    // summary：动作区追加
    if ($('summaryLevelsBtn') && $('summaryLevelsBtn').parentNode){
      $('summaryLevelsBtn').parentNode.appendChild(mk('hub-back-inline', 'Hub'));
    }
    // review：顶栏追加
    if ($('reviewBackBtn') && $('reviewBackBtn').parentNode){
      $('reviewBackBtn').parentNode.appendChild(mk('hub-back-inline', 'Hub'));
    }
  }
"""
    js = replace_once(
        js,
        "  // ---- boot ----\n",
        mount + "\n  // ---- boot ----\n",
        "手术5 注入 mountHubLinks",
    )
    js = replace_once(
        js,
        "  refreshHome();\n  renderLevels();\n",
        "  refreshHome();\n  renderLevels();\n  mountHubLinks();\n",
        "手术5 调用 mountHubLinks",
    )

    # 手术 6：文件头注释（只在最外层 IIFE 前加）
    head = "/* 闪卡共享引擎 —— 由 tools/extract.py 从 ap-science-section1.html 抽取。\n" \
           "   引擎逻辑逐字保留，只改了题库来源、STORE_KEY、copy、全局暴露与导航注入。\n" \
           "   长文本自适应采用源文件里较新的实现（offsetHeight/clientHeight 比对）。 */\n"
    idx = js.index("(() => {")
    js = js[:idx] + head + js[idx:]
    return js


def subject_line_of(src: Path) -> str:
    """取源文件里的学科名，保持原样不改写。"""
    return re.search(r'class="subject-line">(.*?)</h2>', read(src), re.S).group(1).strip()


def build_flashcard_shell(mod_id: str, title: str, data_file: str, subject_line: str) -> str:
    """模块壳页：body 逐字搬运 + 两个 script src。

    学科名按模块替换 —— 两个源文件的 body 只差这一行。
    """
    body = body_of(read(SRC_SCI))
    body = replace_once(
        body,
        '<h2 class="subject-line">AP Science Section 1</h2>',
        f'<h2 class="subject-line">{subject_line}</h2>',
        f"{mod_id} 学科名",
    )
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<link rel="stylesheet" href="../assets/flashcards.css">
</head>
<body data-module="{mod_id}">
{body}
<script src="../assets/data/{data_file}"></script>
<script src="../assets/engine.js"></script>
</body>
</html>
"""


# ==================================================================== SQ
SQ_TOKENS = """:root{
  /* ---- 站点标准令牌（唯一真源，与闪卡一致） ---- */
  --canvas:#F7F6F3; --surface:#FFFFFF; --surface-alt:#F1EFE9;
  --ink:#24231F; --muted:#817B70; --primary:#8C4E3D; --primary-deep:#6F3C30;
  --sage:#D7E5D9; --line:#DED9D0; --line-strong:#CBC3B4;
  --positive:#6F7F52; --attention:#A85D45;
  --success-soft:#E7F1E9; --error-soft:#F6E7E5;
  --shadow:0 14px 32px rgba(60,48,37,.08);
  /* ---- SQ 兼容别名：SQ 的变量名接到标准令牌，SQ 的规则一行不用改 ---- */
  --paper:var(--canvas);
  --card:var(--surface);
  --accent:var(--primary);
  --accent-strong:var(--primary-deep);
  --subject-soft:var(--sage);
  --success:var(--positive);
  --error:var(--attention);
  /* 选项字母徽章四色：取站点柔和底色，保持站点调性 */
  --pastel-blue:var(--surface-alt);
  --pastel-green:var(--sage);
  --pastel-lilac:#E9E5DC;
  --pastel-blush:#E4E0D8;
}"""

SQ_HUB_CSS = """
/* ---- 学习站导航（整合时新增） ---- */
.view{position:relative}
.sq-nav-left{display:flex;align-items:center;gap:14px}.sq-hub-float{
  position:absolute;top:16px;left:clamp(18px,6vw,80px);z-index:6;
  display:inline-flex;align-items:center;gap:6px;
  padding:8px 13px;border:1px solid var(--line);border-radius:10px;
  background:var(--card);color:var(--muted);text-decoration:none;
  font-size:.8rem;font-weight:650;transition:color .2s,border-color .2s;
}
.sq-hub-float:hover{color:var(--ink);border-color:var(--accent)}
.sq-hub-inline{
  font-size:.82rem;letter-spacing:.02em;color:var(--muted);text-decoration:none;
  border:1px solid var(--line);border-radius:11px;padding:9px 14px;font-weight:700;
  transition:color .2s,border-color .2s,background .2s;
}
.sq-hub-inline:hover{color:var(--ink);border-color:var(--accent);background:var(--card)}
.sq-btn-secondary{
  border:1px solid var(--line);background:transparent;color:var(--ink);
  border-radius:12px;min-height:48px;padding:12px 20px;cursor:pointer;font-weight:700;
  text-decoration:none;display:inline-flex;align-items:center;justify-content:center;
}
.sq-btn-secondary:hover{background:var(--card)}
@media (max-width:760px){
  .sq-hub-float{top:12px;left:14px;padding:6px 10px;font-size:.74rem}
}
"""


def build_sq_css() -> str:
    """SQ 的 CSS 规则逐字保留，只把 :root 块换成令牌别名层。"""
    css = style_of(read(SRC_SQ))
    css = re.sub(r"^:root\{.*?\n\}", SQ_TOKENS, css, count=1, flags=re.S)
    if ":root{" not in css:
        raise SystemExit("SQ 的 :root 块替换失败")
    return css + SQ_HUB_CSS


def build_sq_engine() -> str:
    """SQ 引擎：整段搬入并包 IIFE，只改常量来源与全局暴露。"""
    src = read(SRC_SQ)
    js = inner_js(src)

    # 题库改为从模块数据读
    q_start, q_end = balanced_span(js, "const questions = [")
    lead = q_start
    while lead > 0 and js[lead - 1] in " \n":
        lead -= 1
    tail = q_end
    while tail < len(js) and js[tail] in " \n":
        tail += 1
    if tail < len(js) and js[tail] == ";":
        tail += 1
    js = replace_once(
        js,
        js[lead:tail],
        """
  // 题库来自 assets/data/sq-art-history.js
  const questions = MOD.questions;
""",
        "SQ 手术1 题库",
    )

    # 头部：源文件是裸顶层脚本，这里包一层 IIFE 并读模块数据
    # 定位用实际的声明行，不用字符偏移 —— 偏移切法容易把声明截断成残留片段
    js = replace_once(
        js,
        "const SUBJECT = 'Art history';",
        "const SUBJECT = MOD.subject;",
        "SQ 手术2 SUBJECT",
    )
    js = replace_once(
        js,
        "const TIMER_SECONDS = 10;",
        "const TIMER_SECONDS = MOD.timerSeconds;",
        "SQ 手术3 TIMER_SECONDS",
    )
    # 学科色：站点统一由 --subject-soft 决定（别名到站点 --sage）。
    # 源文件里的 SUBJECT_TINT 映射会在运行时 setProperty 覆盖站点色，
    # 把整块（映射表 + 取色 + 写回）删掉，站点调色才生效。
    i_start, i_end = balanced_span(js, "const SUBJECT_TINT = {")
    lead = js.rfind("\n", 0, i_start) + 1
    m_comment = re.search(r"//[^\n]*\n$", js[:lead])
    if m_comment:
        lead = m_comment.start()
    m_tail = re.match(r"\s*;\s*const subjectTint = [^;]+;\s*if \(subjectTint\)[^;]*;",
                      js[i_end:])
    tail = i_end + (m_tail.end() if m_tail else 0)
    js = js[:lead] + js[tail:]
    if "SUBJECT_TINT" in js:
        raise SystemExit("SQ 的 SUBJECT_TINT 未删除（会覆盖站点学科色）")
    # 全局暴露改命名空间（原文件是 getter 对象，用括号配平定位）
    i_start, i_end = balanced_span(js, "window.__interactionState = {")
    old_block = js[i_start:i_end]
    # getter 列表逐字保留，只换外层名字与挂载位置
    getters = old_block[old_block.index("{") + 1:old_block.rindex("}")]
    new_block = (
        "window.LearningHub = window.LearningHub || { modules: {} };\n"
        "  window.LearningHub.modules[MOD.id] = { id: MOD.id, type: 'sq',"
        + getters + "};"
    )
    lead = i_start
    while lead > 0 and js[lead - 1] in " \n":
        lead -= 1
    tail = i_end
    while tail < len(js) and js[tail] in " \n":
        tail += 1
    if tail < len(js) and js[tail] == ";":
        tail += 1
    js = replace_once(
        js,
        js[lead:tail],
        new_block,
        "SQ 全局暴露",
    )
    if "__interactionState" in js:
        raise SystemExit("SQ 的 __interactionState 未替换")

    head = """/* SQ 倒计时测验引擎 —— 由 tools/extract_assets.py 从 ad-art-history-quiz.html 抽取。
   玩法逻辑逐字保留（10 秒倒计时归零才揭晓正确选项），只改了题库来源、
   常量来源与全局暴露。源文件是裸顶层脚本，这里包一层 IIFE 防止全局泄漏。 */
(function(){
  const MOD_ID = new URLSearchParams(location.search).get('m') || document.body.dataset.module;
  const MOD = (window.AP_MODULES || {})[MOD_ID];
  if (!MOD) {
    console.error('[learning-hub] 未知模块：' + MOD_ID);
    return;
  }
"""
    js = head + js
    return js + "\n})();\n"

    # 头部：源文件是裸顶层脚本，这里包一层 IIFE 并读模块数据
    return js + "\n})();\n"


def build_sq_shell() -> str:
    """SQ 模块页：body 逐字搬运 + 3 处返回主目录入口。"""
    src = read(SRC_SQ)
    body = body_of(src)

    # welcome：左上角浮层
    body = replace_once(
        body,
        '    <div class="welcome-copy">',
        '    <a class="sq-hub-float" href="../index.html" data-hub-back>← Learning Hub</a>\n'
        '    <div class="welcome-copy">',
        "SQ 壳页 welcome 入口",
    )

    # game：Exit 按钮左侧组内追加 Hub
    body = replace_once(
        body,
        '        <button id="quitBtn" class="nav-btn" type="button">Exit</button>',
        '        <div class="sq-nav-left">\n'
        '          <button id="quitBtn" class="nav-btn" type="button">Exit</button>\n'
        '          <a class="sq-hub-inline" href="../index.html" data-hub-back>Hub</a>\n'
        '        </div>',
        "SQ 壳页 game 入口",
    )

    # result：动作区追加
    body = replace_once(
        body,
        '          <button id="againBtn" class="primary-btn" type="button">Back to start</button>',
        '          <button id="againBtn" class="primary-btn" type="button">Back to start</button>\n'
        '          <a class="sq-btn-secondary" href="../index.html" data-hub-back>Back to Hub</a>',
        "SQ 壳页 result 入口",
    )

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Learning Lab — Art history</title>
<link rel="stylesheet" href="../assets/sq.css">
</head>
<body data-module="sq-art-history">
{body}
<script src="../assets/data/sq-art-history.js"></script>
<script src="../assets/sq-engine.js"></script>
</body>
</html>
"""


def main() -> None:
    print("=== 抽资源 ===")
    write(SITE / "assets/flashcards.css", build_flashcards_css())
    write(SITE / "assets/engine.js", build_engine())
    write(SITE / "assets/sq.css", build_sq_css())
    write(SITE / "assets/sq-engine.js", build_sq_engine())

    print("=== 生成模块壳页 ===")
    write(SITE / "modules/ap-science-section1.html",
          build_flashcard_shell("ap-science-section1", "AP Science Section 1 — Flashcards",
                                "ap-science-section1.js", subject_line_of(SRC_SCI)))
    write(SITE / "modules/ap-social-science-section1.html",
          build_flashcard_shell("ap-social-science-section1", "AP Social Science Section 1 — Flashcards",
                                "ap-social-science-section1.js", subject_line_of(SRC_SOC)))
    write(SITE / "modules/sq-art-history.html", build_sq_shell())


if __name__ == "__main__":
    main()
