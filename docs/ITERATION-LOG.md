# 迭代日志

每轮迭代**追加**一条，不修改历史条目。人读版：改了什么、为什么、验收结果。
机器可追溯的部分在 git commit 与 tag 里。

---

## iter-2026-11-24-01 — 学习站重构并合并

**分支**：feature/iter-2026-11-24-01
**版本**：v1.0.0
**合并日期**：2026-11-24
**线上地址**：
- AP：https://learning-hub-ap.pages.dev
- AD：https://learning-hub-ad.pages.dev

### 改动

**新增（源码层，7 个）**

- `content/sites/ap.json`、`content/sites/ad.json` —— 站点配置从代码里抽出来
- `content/modules/*.json`（3 个）—— 题库真源，含 `storeKey` 与 `source` 字段
- `templates/site.html`、`templates/flashcards.html` —— 页面模板
- `assets/js/site.js` —— 侧栏、路由、Review、面包屑、滚动恢复

**新增（共享前端，2 个）**

- `assets/css/shell.css` —— 新外壳
- `assets/js/player.js` —— 闪卡页面包屑与浮动返回键

**重写（共享前端，2 个）**

- `assets/css/theme-flashcards.css` —— 游戏主题覆盖层
- `assets/js/site.js` 的 Review 与滚动逻辑

**重写（构建与校验，8 个）**

- `tools/build.py` —— 按站点配置生成自包含部署单元
- `tools/verify_content.py` —— 题库对账 + 站点隔离
- `tools/verify_baseline.py` —— 引擎 sha256 校验
- `tools/check_css_vars.py` —— CSS 变量可解析性
- `tools/verify_browser.js` —— 浏览器实测
- `tools/verify_file_mode.js` —— `file://` 双击模式实测
- `tools/shots.js` —— 多视口截图
- `tools/legacy/extract_content.js`、`tools/legacy/read_source.js` —— 保留溯源

**删除（26 个）**

旧站遗留的单文件 HTML 页面与内联样式脚本。

**内容未变（4 个）**

- `assets/js/engine.js` —— 闪卡引擎，字节未改
- `assets/css/flashcards.css` —— 游戏样式，字节未改
- `assets/css/tokens.css` —— 设计令牌
- `content/modules/*.json` 的 128 张卡内容

### 原因

- 原站是单文件 HTML，AP 与 AD 混在一个目录里，两站之间存在互相引用的风险。
  改成两个物理隔离的自包含单元后，可以分别发布、分别回滚。
- 题目与界面分离，闪卡引擎可复用到其他题型（Quiz / Matching / MCQ），
  只需新增题库 JSON 与站点配置，不用碰引擎。
- Review 模块保留（原名 Assignments），承载待复查词表与未完成章节。

### 验收

| 校验 | 结果 |
|---|---|
| 题库对账（128 卡 vs 基线） | 逐条一致 |
| 引擎 sha256 | 6 份拷贝一致 |
| 浏览器实测 | 106 项通过 |
| `file://` 双击 | 13 项通过 |
| CSS 变量 | 6 份样式表全部可解析 |
| 两站隔离 | 无交叉引用 |

### 回滚

- `git revert <sha>` 或 `git checkout v1.0.0`
- 合并前的旧站完整副本在 `docs/archive/learning-hub-legacy/`
- 第 1 轮的迭代存档与回滚脚本在 `docs/archive/iter-01/`

---

## iter-2026-11-25-01 — 建仓并接入版本管理

**分支**：main（首次提交）
**版本**：v1.0.0
**日期**：2026-11-25
**线上地址**：
- AP：https://learning-hub-ap.pages.dev（待部署）
- AD：https://learning-hub-ad.pages.dev（待部署）

### 改动

**目录重组**

- `dist/ap/` → `site/ap/`，`dist/ad/` → `site/ad/`（14 个文件各自逐字节未变）
- `CONTEXT.md` 从根目录移入 `docs/`
- 新增 `docs/REPO-SETUP-GUIDE.md`（零基础建仓指引）
- 新增 `docs/ITERATION-LOG.md`（本文件）

**归档（158 个文件）**

- `docs/archive/learning-hub-legacy/` —— 最初的原始站 41 个文件，
  含全网唯一副本 `sq-engine.js`、`sq.css`、`sq-art-history.js`
- `docs/archive/iter-01/` —— 第 1 轮存档 117 个文件，含 `_baseline/` 校验基线与 `rollback.sh`

**工具脚本路径调整（8 处）**

`dist/` 改名 `site/` 会让工具里的硬编码路径失效：

- 6 处 `DIST` 常量：`build.py`、`check_css_vars.py`、`verify_content.py`、
  `verify_baseline.py`、`shots.js`、`verify_browser.js`、`verify_file_mode.js`
- 2 处 `BASELINE_CANDIDATES`：追加 `docs/archive/iter-01/_baseline/learning-hub-v2`

**新增配置文件（3 个）**

- `.gitattributes` —— 锁 LF（含 `*.sh`，防 `rollback.sh` 报 `bad interpreter: /bin/sh^M`）
- `.gitignore` —— **不含 `site/`**：产物入库，Cloudflare 构建命令留空，零云端构建失败点
- `README.md` —— 重写，补入版本管理、部署、回滚章节

### 原因

- 本机 `core.autocrlf=true` 来自 PortableGit 系统级配置，压不住 →
  仓库级 `.gitattributes` 是唯一解法，否则换行符漂移会导致全文件 diff 与产物 md5 变化。
- 产物入库而非云端构建：任意一个 tag 都自带可运行内容，回滚只需 checkout。
- `.gitignore` 刻意不照抄 `museum-site` 仓库 —— 那份忽略 `site/`，本仓库相反。

### 验收

| 校验 | 结果 |
|---|---|
| 题库对账（128 卡 vs 基线） | 逐条一致 |
| 引擎 sha256 | 6 份拷贝一致 |
| 浏览器实测 | 106 项通过 |
| `file://` 双击 | 13 项通过 |
| CSS 变量 | 6 份样式表全部可解析 |
| 产物 md5（重组前后） | 28 个文件逐字节一致 |
| 基线路径反向验证 | 错误路径被正确拒绝 |
| 三个 sq 唯一副本 | md5 与源一致 |

### 回滚

- `git checkout v1.0.0` 后重建并 push
- 重组前的原始目录完整副本在仓库外的 `_prebuild-backup-20261125/`

---

## iter-2026-11-25-02 — 双站上线 Cloudflare Pages + 404 错误页

**分支**：feature/iter-2026-11-25-01
**版本**：v1.1.0
**日期**：2026-11-25
**线上地址**：
- AP：https://learning-hub-ap.pages.dev
- AD：https://learning-hub-ad.pages.dev

### 改动

**新增 404 错误页**

- `templates/404.html` —— 新模板，外壳与 `site.html` 同构，正文静态
- `tools/build.py` —— 加 404 渲染（仿 `flashcards.html` 的先例，不进 `SITE_PAGES`）
- `site/ap/404.html`、`site/ad/404.html` —— 构建产物（各站 14 → 15 个文件）

**新增文档**

- `docs/DEPLOY.md` —— 部署实况、CF 内建行为、三级回滚、踩坑记录

**文档更新**

- `README.md` —— 产物文件数 14 → 15
- `docs/CONTEXT.md` —— 路由表加 404；文件清单补 `templates/404.html`；修正重组时漏改的 `dist/` 旧路径

### 原因

- Cloudflare Pages 没有 `404.html` 时会假定你是 SPA，把拼错的网址**静默送回首页并返回 200**。
  补上之后错网址返回真 404。
- 404 页的正文必须静态：`site.js` 只 `appendChild` 从不清空 `#site-main`，
  且 `data-view="notfound"` 不命中任何视图分支 → 静态内容能存活，`site.js` 一行都不用改。
- 404 模板是**同一份渲进两个站**，所以模板里不能出现任何学科名 ——
  `verify_content.py` 的隔离扫描会查 `ap` 站是否含 "Art History"、`ad` 站是否含 "Social Science"。

### 验收

| 校验 | 结果 |
|---|---|
| 题库对账（128 卡 vs 基线） | 逐条一致 |
| 引擎 sha256 | 6 份拷贝一致 |
| 浏览器实测 | 106 项通过 |
| `file://` 双击 | 13 项通过 |
| CSS 变量 | 6 份样式表全部可解析 |
| 站点隔离（含新 404 页） | 无交叉引用 |
| 文案校验 | 仍 8 处 P1 命中，全在 `engine.js`（404 页贡献 0 条） |
| 产物 md5（重组前后） | 28 个文件逐字节一致 |
| **线上产物 md5（vs 本地）** | **两站各 15 个文件逐字节一致** |
| 线上错网址 | 返回 404（未返回首页） |

### 部署实况

两个 Pages 项目均以 GitHub 集成接入仓库 `Elliot-elli/learning-hub`，
生产分支 `main`，**构建命令留空**，输出目录分别为 `site/ap` 与 `site/ad`。

### 回滚

- `git revert <sha>` 或 `git checkout v1.0.0`
- 平台回退：CF 后台 → 项目 → Deployments → 选旧部署 → Promote to Production
- ⚠️ 平台回退只是止血，必须同时 `git revert` 修代码，否则下次 push 会推回坏版本

---

## iter-2026-11-26-01 — Review Center 重构：把复习从闪卡里拆出来

**分支**：feature/iter-2026-11-26-01
**日期**：2026-11-26
**依据**：`APAD_Learning_Hub_Review_Center_Iteration_Spec.md` V1.0

### 问题

点击 Review 里的任何一条，直接跳进闪卡页，回来时层级错乱；
复习清单本身还嵌在闪卡页内部（游戏内「Review N」按钮 + 章节页「Review list」按钮），
学习、复习、返回三件事互相缠在一起。

### 改动

**新增（源码层，6 个）**

- `assets/js/review-store.js` —— 复习状态服务。折叠旧存档、状态映射、去重、持久化。
- `assets/js/review.js` —— 复习中心页面。URL 路由、学科 Tab、Section 列表、分组清单。
- `assets/js/review-session.js` —— 复习轮次。队列快照、翻面、结果反馈、完成页。
- `assets/css/review.css` —— 复习中心与复习轮次的样式。
- `templates/review-session.html` —— 复习轮次模板（独立版面，同闪卡页的做法）。
- `tools/game-baseline.json` 的 `history` —— 记录引擎改动的原因与新摘要。

**修改（源码层，10 个）**

- `assets/js/engine.js` —— **移除**内嵌复习清单（`reviewView` / `openReview` /
  `closeReview` / `renderReview` / `pendingRound` / `pendingHistory` /
  `markMastered` / `cardByTerm`）。翻卡逻辑、队列算法、进度存档、章节编号、
  `storeKey` 全部未动。`markReviewed`（写 `store.review`）保留 ——
  它是学习路径通往复习路径的唯一通道。
- `templates/flashcards.html` —— 移除复习清单区块与两个入口按钮。
- `assets/js/site.js` —— 侧栏徽标改读复习存档；导出 `window.LH_SHELL`；
  删掉旧的平铺复习列表，改为把 review 视图交给复习中心模块。
- `templates/site.html` —— 加 `@@EXTRA_CSS@@` / `@@EXTRA_SCRIPTS@@` 两个占位。
- `tools/build.py` —— 新页面与新资源的装配；`review.css` 与三个复习脚本入共享资源。
- `tools/verify_baseline.py` —— 期望摘要改读**仓库内**的 `tools/game-baseline.json`
  （契约文件），归档快照降级为「与快照的差异」提示；快照缺失不再报错。
- `tools/verify_browser.js` —— 新增 `testReview()`：复习路径 35 项断言。
- `tools/verify_file_mode.js` —— 新增 `file://` 下的复习路径 5 项断言。
- `tools/shots.js` —— 复习中心与复习轮次进截图清单；截图前先造出真实数据。
- `docs/CONTEXT.md` / `README.md` —— 路由表、存档契约、文件清单同步。

**产物（构建生成）**

- `site/ap/` 与 `site/ad/` 各 15 → 20 个文件（新增 `review-session.html`
  与 `assets/css/review.css`、三个复习脚本）。

### 信息架构

```
Learning：Overview → Courses → Subject → Flashcards
Review ：Review → Subject → Section → Review list → Review session
```

- Review 入口独立，学科横向排列（Tab），点学科换 Section 列表（不跳页）。
- Review 清单按复习状态分组：`Needs practice` → `Still learning` → `Mastered`（默认折叠）。
- 复习轮次是独立文档，不进闪卡流程；结束后回该 Section 的复习清单。
- 固定父级返回：Review 首页 → Overview；学科页 → Review 首页；
  Section 清单 → 该学科页；复习轮次 → 该 Section 清单。

### 复习状态与持久化

| 项 | 值 |
|---|---|
| 状态存档键 | `lh_review_v1:<site>`（每站一份，与题库内容分开存） |
| 术语主键 | `subjectId\|sectionId\|term`（不只用术语文本） |
| 状态 | `again`（不知道）/ `learning`（不确定、还没稳）/ `mastered`（已掌握） |
| 映射 | Again → `again`；Not sure → `learning`；Got it → `learning`，连续两轮不同轮次答对才 `mastered` |
| 间隔 | Got it 后约 3 天再查（常量在 `review-store.js` 的 `GOT_IT_INTERVAL`，可调） |
| 旧数据 | 引擎的 `store.review` / `store.mastered` **只读折叠**，一个字节都不改 |
| 折叠裁决 | 按时间戳：旧记录不覆盖新记录；重新标记「不知道」会把已掌握术语重新激活 |
| 去重 | 同一术语只有一条当前记录，重复标记是更新而不是插入 |

### 验收

| 校验 | 结果 |
|---|---|
| 题库对账（128 卡 vs 基线） | 逐条一致 |
| 游戏资产 sha256 | 6 份拷贝一致（引擎摘要已按契约更新并留档原因） |
| 浏览器实测 | **162 项通过**（含复习路径 41 项） |
| `file://` 双击 | **23 项通过**（含复习路径 5 项） |
| CSS 变量 | 8 份样式表全部可解析 |
| 两站隔离 | 无交叉引用 |
| 截图 | 43 张（含复习中心三屏 × 三档视口） |

### 回滚

- `git revert <sha>` 或 `git checkout v1.1.0`
- 平台回滚：CF 后台 → 项目 → Deployments → 选旧部署 → Promote to Production
- ⚠️ 平台回滚只是止血，必须同时 `git revert` 修代码

---

## 附录 · iter-2026-11-25-02 改动速查

> 本节是本轮迭代的清单速查，供日后回溯。完整叙述见上文 iter-2026-11-25-02 条目。

### 已修改与新增的文件（8 个）

| 文件 | 动作 | 说明 |
|---|---|---|
| `templates/404.html` | **新增** | 404 模板。外壳与 `site.html` 同构，正文静态 |
| `tools/build.py` | 修改 +10 | 加 404 渲染（仿 `flashcards.html` 先例，不进 `SITE_PAGES`） |
| `site/ap/404.html` | **新增** | AP 站产物（14 → 15 个文件） |
| `site/ad/404.html` | **新增** | AD 站产物（14 → 15 个文件） |
| `docs/DEPLOY.md` | **新增** | 部署实况、CF 内建行为、三级回滚、9 条踩坑 |
| `README.md` | 修改 | 产物文件数 14 → 15 |
| `docs/CONTEXT.md` | 修改 | 路由表加 404；文件清单补模板；修正漏改的 `dist/` 旧路径 |
| `docs/ITERATION-LOG.md` | 修改 | 本条目 |

### 新增功能

| 功能 | 说明 |
|---|---|
| **404 错误页** | 错网址返回真 404 + 可读提示，不再静默送回首页 |
| **Cloudflare Pages 双站部署** | AP / AD 各自独立上线，GitHub 集成自动部署 |
| **分支预览机制** | `feature/*` 自动出 Preview 地址，改坏不影响生产 |
| **三级回滚** | 平台回退 / `git revert` / `git checkout tag` |
| **部署文档** | `docs/DEPLOY.md`，含踩坑记录 |

### 值得注意的地方

**1. 404 模板不能出现学科名**
`verify_content.py` 的隔离扫描会查 `ap` 站是否含 "Art History"、`ad` 站是否含 "Social Science"。
同一份模板渲进两个站 → 写死学科名会让另一站直接 FAIL。（HTML 注释也不豁免。）

**2. 文案不能嵌 `<a>` 标签**
校验器 R10 按**文本节点**逐段判定，嵌标签会把句子拆散，
「Pick a subject from」这段 wc≥3 但无触发词 → FAIL。
现用文案：`Start from Overview, or open Courses to pick a subject.`

**3. `site.js` 一行未改**
`data-view="notfound"` 不命中任何视图分支即天然兼容；site.js 只 `appendChild` 从不清空 `#site-main`，
静态正文能存活。零 CSS 改动（复用 `.empty` + `.panel`）。

**4. 404 页必须由 `build.py` 生成**
`build.py` 不清空输出目录。手工投放 `site/ap/404.html` 不会被覆盖，但下次 build 也不会重新生成
→ 产物脱离真源，违反「`site/` 全部是编译产物」的不变量。

**5. Pages 会把 `.html` 308 剥离**
`/flashcards.html` → `/flashcards`，但 **query 完整保留**（`?m=xxx` 不丢）。
⚠️ 下载线上 HTML 必须 `curl -L`，否则拿到空文件。

**6. 没有 `404.html` 时 Cloudflare 假定你是 SPA**
把拼错的网址送回 `/` 并返回 200。补上 `404.html` 后才返回真 404。

**7. 构建命令留空是对的**
产物 `site/` 已入库 → Cloudflare 直接发成品，没有「云端构建失败」这个失败点。
（与 `museum-site` 相反：那个仓库产物不入库，必须填构建脚本。）

### 本轮未做（有意排除）

- ❌ 不配 `_headers`（缓存）—— 默认 `max-age=0` + ETag，回滚才可靠
- ❌ 不配 `_redirects` —— MPA + query 路由，不需要
- ❌ 不加 `develop` 分支 —— 实测 `museum-site` 的 develop 建完即废弃（落后 main 8 个提交、独有提交 0 个）；
  迭代分支已承担隔离职责，CF Preview 已提供验证环境
- ❌ 不改 `engine.js` / `flashcards.css` 字节、不动 `storeKey` 与章节编号（跨版本契约）

### 版本与回滚

| 项 | 值 |
|---|---|
| 提交 | `40a012d`（feature）→ `7f89aa0`（main 合并） |
| 标签 | `v1.1.0` |
| 线上 | AP `learning-hub-ap.pages.dev` ｜ AD `learning-hub-ad.pages.dev` |
| 回滚 | `git revert <sha>` 或 `git checkout v1.0.0` |

---
