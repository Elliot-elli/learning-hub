# Learning Hub — Iteration 01

第一次版本迭代的工作区。每一轮迭代一个文件夹，互不覆盖。

## 本轮目标

把 Learning Hub 从「一个门户 + 两个 programme 子目录」重构为
**两个完全独立的网站**，共用一套代码，各自独立部署。

| 项 | 迭代前（v2） | 迭代后（iter-01） |
|---|---|---|
| 入口 | `index.html` 是 AD/AP 选择页 | **无选择页**，每个站直接打开自己的 Overview |
| 目录 | `ap/`、`ad/` 共享根目录 `assets/` | `src/` 共享代码库 → 构建出 `dist/ap`、`dist/ad` |
| 部署 | 两站一起传 | 每站一个独立部署目标，互不依赖 |
| 导航 | Overview / Courses / Assignments / Reports / Settings | **Overview / Courses** 两项 |
| 活动 | Section 页列出 Flashcards + Quiz + Matching + MCQ | **只显示 Flashcards** |
| 层级 | Subject → Section → 活动选择页 | Subject → Section → **直接开 Flashcards** |
| 返回 | 仅返回链接 | Back 按钮 + 面包屑 + 滚动位置保留 |

## 目录结构

```
iterations/iter-01/
├─ README.md            ← 本文件
├─ rollback.sh          ← 回滚到本轮之前的版本
├─ _baseline/           ← 本轮开始前的完整快照（回滚源）
│  └─ learning-hub-v2/
└─ src/                 ← 本轮的工作区
   ├─ content/          内容真源：AD / AP 各自的配置
   ├─ assets/           共享前端：CSS / JS / 引擎
   ├─ templates/        页面模板
   └─ tools/            构建与校验脚本
```

构建产物在 `src/dist/ap` 与 `src/dist/ad`，两个目录各自自包含，可以单独部署。

## 回滚

```bash
cd "C:/Users/EDY/Desktop/产品侧/学术备战支持/测试demo/iterations/iter-01"
bash rollback.sh
```

脚本会把当前的 `learning-hub-v2/` **改名保留**为 `.rollback-saved-<时间戳>`，
而不是删除 —— 回滚错了还能再退回去。恢复后逐文件比对 sha256，确保与快照一致。

## 不变量（回滚与迭代都要守住）

1. **存档 key 不变**：`fx_fc_v1:ap-science-section1`、
   `fx_fc_v1:ap-social-science-section1` —— 改了学生的复习进度就失联。
2. **章节编号规则不变**：全局按牌组顺序 `chapter1`、`chapter2`……，不是 `2.1` / `2.2`。
3. **`assets/js/engine.js` 与 `assets/css/flashcards.css` 字节不改** —— 游戏资产由上游技能产出。
4. **`content/` 是唯一真源**，`assets/data/*.js` 是编译产物。

---

# 改动清单（2026-11-24 收尾）

本轮迭代已**合并进正式站** `learning-hub-v2/`。合并前的旧站整体改名保留在
`测试demo/.merged-saved-20261124-143931/`，未删除，可随时比对或退回。

## 一、已修改的文件

### 新增（源码层，7 个）

| 文件 | 作用 |
|---|---|
| `content/sites/ap.json` | AP 站点配置：名称、品牌、学科与章节映射 |
| `content/sites/ad.json` | AD 站点配置：同上 |
| `content/modules/ap-science-section1.json` | AP Science 题库（39 卡 / 2 章） |
| `content/modules/ap-social-science-section1.json` | AP Social Science 题库（84 卡 / 4 章） |
| `content/modules/ad-art-history-section1.json` | AD Art History 题库（5 卡 / 1 章） |
| `templates/site.html` | 站点外壳模板（Overview / Courses / Subject / Review 共用） |
| `templates/flashcards.html` | 闪卡页面模板（含返回键与面包屑插槽） |

### 新增（共享前端，2 个）

| 文件 | 作用 |
|---|---|
| `assets/js/site.js` | 四级导航、侧栏、面包屑、Review 模块、滚动位置保留 |
| `assets/js/player.js` | 闪卡页面包屑、浮动返回键、返回链接改写 |

### 重写（共享前端，2 个）

| 文件 | 改动 |
|---|---|
| `assets/css/shell.css` | 新外壳：侧栏三项、彩色统计卡、图标化返回键、无说明文案 |
| `assets/css/theme-flashcards.css` | 游戏页主题覆盖：按钮主色化、面包屑分隔符、视图隐藏规则 |

### 重写（构建与校验，8 个）

| 文件 | 改动 |
|---|---|
| `tools/build.py` | 改为按站点配置生成自包含目录，新增 `review.html` 页面 |
| `tools/verify_content.py` | 改为对账 `content/modules/` 与基线；新增站点隔离检查 |
| `tools/verify_baseline.py` | 改为比对 `assets/` 与构建产物的引擎摘要 |
| `tools/check_css_vars.py` | 新增：构建期扫描未解析的 CSS 变量 |
| `tools/verify_browser.js` | 重写断言，覆盖层级、返回路径、选中态、遮挡、滚动、Review |
| `tools/verify_file_mode.js` | 重写：验证 `file://` 双击打开后的完整流程 |
| `tools/shots.js` | 改为按三档视口批量出图 |
| `stop-waffling-skills.toml` | 排除规则改为新路径，加入 `tools/legacy/**` |

### 保留（历史迁移脚本，2 个）

`tools/legacy/extract_content.js`、`tools/legacy/read_source.js` ——
记录题库从旧站抽出的过程，输出改到 `tools/legacy/_extracted/`，不污染 `content/` 真源。
两个脚本已实测可运行。

### 删除（26 个）

| 类别 | 文件 | 原因 |
|---|---|---|
| 门户 | `index.html` | 不再有 AD/AP 选择页 |
| 旧站点目录 | `ap/`、`ad/`（各 2 个 html） | 两站改为 `dist/ap`、`dist/ad` 自包含部署单元 |
| 旧前端 | `assets/js/hub.js` | 被 `assets/js/site.js` 取代 |
| 旧编译产物 | `assets/data/*.js`（5 个） | 改为构建时生成到 `dist/*/assets/data/` |
| 旧真源布局 | `content/manifest.json`、`content/ap/`、`content/ad/` | 改为 `content/sites/` + `content/modules/` |
| 旧模板 | `tools/templates/{page,flashcards}.html` | 移到 `templates/` |
| 旧截图 | `tools/shots/`（11 张） | 改为 `shots/`（25 张，三档视口） |

### 内容未变（4 个）

`assets/css/tokens.css`、`assets/css/flashcards.css`、`assets/js/engine.js`、
`tools/game-baseline.json` —— 引擎与闪卡样式为上游游戏资产，**sha256 逐字节未改**。

### 文件统计

新增 59 · 删除 26 · 内容变更 17 · 内容不变 4。

## 二、新增功能

| 功能 | 说明 |
|---|---|
| **两个完全独立的网站** | 无选择页，各自直接开 Overview；独立 manifest、独立的 localStorage 命名空间 |
| **四级独立文档导航** | Overview → Courses → Subject → Section → Flashcards，每级一个 html，URL 可分享 |
| **Review 模块** | 侧栏第三项，含待复查词表与未完成章节，待复查数带徽标 |
| **面包屑 + 纯图标返回键** | 每个内页都有面包屑；返回控件只画箭头，不附文字 |
| **侧栏并列一级逻辑** | 进 Courses 后它是该界面第一层级，**无返回 Overview 的路径** |
| **滚动位置保留** | 返回列表时回到离开前的位置（原生恢复已关闭，测的是自实现） |
| **独立部署** | `dist/ap`、`dist/ad` 各自自包含，可分别上传到不同服务器 |
| **构建期内容校验** | storeKey 重复、term 重复、Section 指向不存在题库 → 直接中止构建 |
| **CSS 变量扫描** | 拦截「变量未定义 → 元素静默消失」这类零报错的视觉故障 |
| **基线路径解耦** | 校验脚本自动搜索基线目录，也可用 `--baseline` 显式指定 |

## 三、值得注意的地方

### 🔴 1. 存档 key 与章节编号是跨版本契约

三个 `storeKey` 与合并前逐字符相同，学生已有的复习进度直接可用。
章节编号**全局按牌组顺序** `chapter1`、`chapter2`……，不是 `2.1` / `2.2`。
改了任一个，已有进度全部失联。

### 🔴 2. 引擎与闪卡样式字节不可改

`engine.js` 与 `flashcards.css` 由上游游戏生成技能产出，整合层只能包裹不能编辑。
sha256 基线在 `tools/game-baseline.json`，校验脚本会比对源码与构建产物共 6 份拷贝。

### 🔴 3. 内容用同步 `<script src>` 加载，不走 `fetch()`

引擎执行时同步读 `window.AP_MODULES`。改成 fetch 会改变绑定时机，
学生存档失联，且 `file://` 下被 CORS 拦。

### 🔴 4. 游戏页不加载 `tokens.css`

`theme-flashcards.css` 自带一份 `:root` 变量。改主题时**两处都要同步**，
否则变量解析为空 → 按钮白字白底完全不可见，而控制台零报错。

### 🔴 5. 文案校验器不扫 `dist/`

`DEFAULT_EXCLUDE` 含 `dist/**`，改项目 toml 也无效。
产物是模板编译出来的，模板被扫就等于产物文案被扫。

### 6. 本轮修掉的真实缺陷

- **浮动返回键物理遮挡引擎返回键** —— Playwright 报 "intercepts pointer events"，
  肉眼截图完全看不出。已用 `elementFromPoint` 命中自身固化为判据。
- **游戏页残留半透明 "Choose a chapter"** —— 引擎用 opacity 淡出视图，
  而 opacity:0 的层仍会出现在截图里。主题层加 `visibility:hidden` 解决。
- **面包屑分隔符与链接同色，视觉上等于消失** —— 改用中间色 + 明确间距。
- **`pagehide` 存滚动位置存到错误值**（65 而非 300）—— 改在链接被跟随的瞬间捕获。
- **Chromium 原生滚动恢复掩盖自实现失效** —— 站点代码设 `scrollRestoration='manual'`。

### 7. 校验判据本身修过两次

- 滚动判据原写 `before === 0 || 条件`，页面不滚动时恒为 0 → 永远通过，什么都没测。
- 遮挡判据有**顺序依赖**：引擎视图交叉淡入未结束就命中测试，会测错图层，
  导致遮挡状态下 AP 站误报通过、AD 站却 FAIL（两站数据其实相同）。

所有判据都做过**反向验证**：篡改一个词 → 对账 FAIL；改 storeKey → FAIL；
禁用滚动恢复 → 滚动判据 FAIL；破坏返回键图标化 → 2 处 FAIL；
恢复旧侧栏逻辑 → 8 处 FAIL。

### 8. `file://` 下 Chrome 与 Firefox 行为不同

Chrome 的 `file://` 共用一个存储域，仪表盘能读到闪卡页写入的进度；
Firefox 每个文件独立 origin，读不到（闪卡页自己的进度不受影响）。
部署到服务器后同一域名下无此问题。

## 四、合并后的验收结果

| 校验 | 结果 |
|---|---|
| 题库对账（128 卡 vs 基线） | 逐条一致，storeKey 与章节数未变 |
| 站点隔离 | AP 不含 AD 资源，AD 不含 AP 资源 |
| 引擎 sha256 | 6 份拷贝全部一致 |
| CSS 变量 | 6 份样式表全部可解析 |
| 浏览器实测 | 106 项通过 |
| `file://` 双击打开 | 13 项通过 |
| 文案契约 | 12 项全过（P0/P1/P2） |
| 旧站完整性 | 合并前后 36 个文件逐字节一致 |

## 五、当前状态

- **已合并**：`learning-hub-v2/` 已是新架构，站点根即工作区。
- **未部署**：没有上线，`dist/ap` 与 `dist/ad` 各自独立上传即可部署。
- **可回滚**：`iterations/iter-01/rollback.sh`；合并前旧站另存于
  `测试demo/.merged-saved-20261124-143931/`。
