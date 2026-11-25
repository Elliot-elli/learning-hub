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
