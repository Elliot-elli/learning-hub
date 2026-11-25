# Learning Hub — 续接上下文

后续会话**先读这一份**，不必重新翻代码。所有事实已于 2026-11-24 与真源逐条核对。

---

## 1. 一句话定位

两个**完全独立**的学习网站（AP / AD），共用一套前端与闪卡引擎，各自独立部署。

站点根目录 `learning-hub-v2/` 就是工作区。

| 站点 | 入口 | 内容 |
|---|---|---|
| AP Learning Hub | `dist/ap/index.html` | Science（39 卡）、Social Science（84 卡） |
| AD Learning Hub | `dist/ad/index.html` | Art History（5 卡） |

---

## 2. 已拍板的决定（不要再问、不要再改）

1. **不要 AD/AP 选择页** —— 每个站直接开自己的 Overview。
2. **Flashcards 是唯一可见的学习活动** —— Quiz / Matching / MCQ 不显示，也未预留入口。
3. **Super Quiz 已删除** —— AD 原本只有它一个模块，5 道艺术史题已转成闪卡卡片
   （背面 = 正确选项原文，正面 = 题干 + 解析；原题干、四选项、答案下标、解析全在 `source` 字段）。
4. **侧栏三个并列一级页** —— Overview / Courses / Review。
5. **四级导航，四级都是独立文档**（不是 hash 路由）：
   `Overview(index.html) → Courses(courses.html) → Subject(subject.html?subject=X) → Flashcards(flashcards.html?m=Y)`。
   Section 点击**直接开 Flashcards**，没有活动选择页。
6. **返回控件一律纯图标**（箭头 SVG），不附文字；`aria-label` 留给读屏。

---

## 3. 架构约束

```
content/     唯一真源：sites/*.json（站点配置）+ modules/*.json（题库）
assets/      共享前端：css/ + js/（engine.js 是游戏资产，字节不改）
templates/   页面模板
tools/       构建与校验脚本
      ↓ python tools/build.py
dist/ap/     自包含部署单元（独立上传）
dist/ad/     自包含部署单元（独立上传）
```

**为什么 JSON 编译成同步 `<script src>` 而不是 `fetch()`**：
引擎在执行时同步读 `window.AP_MODULES`，改成 fetch 会改变绑定时机，
导致学生已有存档失联，且 `file://` 下 fetch 被 CORS 拦。

**为什么引擎字节不改**：引擎与闪卡样式由游戏生成技能产出，整合层不得改动。
sha256 基线在 `tools/game-baseline.json`，校验脚本会逐份比对。

---

## 4. 内容与存档契约（🔴 改了就是让学生的进度失联）

| 牌组 | storeKey | 卡片 | 章节 |
|---|---|---|---|
| AP Science | `fx_fc_v1:ap-science-section1` | 39 | 2 |
| AP Social Science | `fx_fc_v1:ap-social-science-section1` | 84 | 4 |
| AD Art History | `fx_fc_v1:ad-art-history-section1` | 5 | 1 |

- 章节编号**全局按牌组顺序** `chapter1`、`chapter2`……，**不是** `2.1` / `2.2`。
- 三个 storeKey 与 v2 逐字符相同 → v2 时期学生的复习进度直接可用。

---

## 5. 路由与链接

| 页面 | 文件 | 关键参数 |
|---|---|---|
| Overview | `index.html` | — |
| Courses | `courses.html` | — |
| Subject | `subject.html` | `?subject=<subject-id>` |
| Review | `review.html` | — |
| Flashcards | `flashcards.html` | `?m=<module-id>` |
| 404 | `404.html` | — |

**层级与返回路径**：

| 页面 | 返回键 | 面包屑 | 侧栏选中 |
|---|---|---|---|
| Overview | 无 | 空 | Overview |
| **Courses** | **无** | **空** | Courses |
| Subject | → Courses | `Courses / <学科>` | Courses |
| Review | 无 | 空 | Review |
| Flashcards | ← 学科页（浮动的圆键） | `Courses / <学科> / <章节>` | — |

Courses 是它自己这一块的顶层，**没有返回 Overview 的路径** —— 只能靠侧栏离开。

---

## 6. 视觉系统

| 令牌 | 值 | 用途 |
|---|---|---|
| `--brand` | `#006674` | 主色（青） |
| `--canvas` | `#EAF4FA` | 页面浅蓝底 |
| `--surface` | `#FFFFFF` | 卡片白底 |
| `--line` | `#D5E6EF` | 描边 |

断点：外壳 `shell.css` 用 `1080px` / `860px` / `560px`；
游戏页主题 `theme-flashcards.css` 另用 `760px`。
桌面 1440 / 平板 820 / 手机 390 三档已验收。

游戏页不加载 `tokens.css`，`theme-flashcards.css` 里自带一份 `:root` 变量。
**改主题时必须同步两处**，否则变量解析为空 → 元素静默消失（控制台零报错）。

---

## 7. 校验命令

```bash
PY=C:/Users/EDY/.workbuddy/binaries/python/versions/3.13.12/python.exe
export NODE_PATH=C:/Users/EDY/.workbuddy/binaries/node/workspace/node_modules

"$PY" tools/build.py                       # 构建两个站
"$PY" tools/build.py ap                    # 只构建 AP（AD 产物逐字节不变）
"$PY" tools/verify_content.py              # 128 卡逐条对账 + 站点隔离
"$PY" tools/verify_baseline.py             # 游戏资产 sha256
"$PY" tools/check_css_vars.py              # CSS 变量全部可解析
"$PY" "C:/Users/EDY/.workbuddy/skills/stop-waffling-skills/scripts/check_copy.py" . --severity P0,P1,P2
node tools/verify_browser.js               # 浏览器实测（106 项）
node tools/verify_file_mode.js             # file:// 双击打开（13 项）
node tools/shots.js                        # 截图 → shots/
```

Chromium 路径：`C:/Users/EDY/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe`

**基线定位**：`verify_content.py` 与 `verify_baseline.py` 自动搜索基线目录，
找不到时可显式指定：

```bash
"$PY" tools/verify_content.py --baseline "C:/Users/EDY/Desktop/产品侧/学术备战支持/测试demo/iterations/iter-01/_baseline/learning-hub-v2"
```

---

## 8. 踩过的坑（已沉淀为判据，别重复踩）

1. **CSS 变量缺失 = 元素静默消失** —— 游戏页不加载 tokens.css 时，
   `var(--brand)` 解析为空 → 按钮白字白底不可见，控制台零报错。
   → `check_css_vars.py` 拦截。
2. **`pagehide` 存滚动位置存到的是错误值** —— 卸载时浏览器已重置 scrollY。
   → 改在链接被跟随的瞬间（click）捕获。
3. **Chromium 原生滚动恢复会掩盖自实现失效** —— 关掉 `restoreScroll` 判据仍通过。
   → 站点代码设 `history.scrollRestoration = 'manual'`。
4. **判据写 `before === 0 ||` 短路 = 永真** —— 页面不滚动时恒为 0。
   → 判据必须先证明前置条件成立。
5. **两个返回键物理遮挡** —— Playwright 报 "intercepts pointer events"，肉眼截图看不出。
   → 用 `elementFromPoint` 命中自身来判定。
6. **引擎视图交叉淡入未结束就做命中测试会测错图层** —— 判据有顺序依赖。
   → 等视图激活后再测。
7. **`opacity:0` 的层仍会出现在截图里** —— 引擎淡出视图后残影可见。
   → 主题层加 `.view:not(.active){visibility:hidden}`。
8. **面包屑分隔符与链接同色 = 视觉上消失** —— 用中间色 + 明确间距。
9. **文案校验器不扫 `dist/`**（`DEFAULT_EXCLUDE` 含 `dist/**`，改 toml 也无效）。
   → 模板被扫 = 产物文案被扫；产物是模板编译出来的。

---

## 9. 已知取舍（别当 bug 修）

1. **`file://` 下 Chrome 与 Firefox 行为不同** —— Chrome 共用存储域，仪表盘能读到
   闪卡页进度；Firefox 每个文件独立 origin，读不到。部署到服务器后无此问题。
2. **AD 站只有 1 章**，Review 页的「未完成章节」列表恒为空 —— 该站无法处于「部分完成」状态。
3. **引擎头部的注释写着早期模块名** —— 内容隔离扫描前会剥离注释，引擎保持字节一致。

---

## 10. 加新学科

1. 在 `content/modules/` 放题库 JSON，`storeKey` 用新命名空间
2. 在 `content/sites/<site>.json` 登记学科与章节
3. `python tools/build.py <site>`

构建会校验：storeKey 不重复、同学科内 term 不重复、每个 Section 指向存在的题库。
校验不过就中止，不写文件。

---

## 11. 迭代与回滚

- 迭代工作区：`iterations/iter-01/`（工作区 + `_baseline/` 快照 + `rollback.sh`）
- 回滚：`cd iterations/iter-01 && bash rollback.sh`
  → 当前 `learning-hub-v2/` **改名保留**为 `.rollback-saved-<时间戳>`，再恢复快照，逐文件比对 sha256。
- 合并前的旧站副本：`测试demo/.merged-saved-20261124-143931/`

---

## 12. 文件清单

**源码（手改这里）**

```
content/sites/{ap,ad}.json
content/modules/*.json
assets/css/{tokens,shell,flashcards,theme-flashcards}.css
assets/js/{engine,site,player}.js
templates/{site,flashcards,404}.html
tools/{build.py,check_css_vars.py,verify_content.py,verify_baseline.py,verify_browser.js,verify_file_mode.js,shots.js,game-baseline.json}
```

**产物（构建生成，勿手改）**

```
site/ap/{index,courses,subject,review,flashcards,404}.html + site/ap/assets/**
site/ad/ 同上
shots/  截图
```

**基线（只读）**

```
tools/game-baseline.json   引擎与闪卡样式的 sha256
```
