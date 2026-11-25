# Learning Hub v2 —— 压缩上下文（续接用）

> 单文件速查。读完这一份就能接着干，不必重新翻代码。
> 最后更新：2026-11-24

---

## 1. 项目一句话

把两个已有的独立闪卡页面（AP / AD），重构成一个统一门户 + 两个互不干涉的 programme 学习站，
共用一套引擎与设计系统，内容用 JSON 驱动，方便以后 AI Agent 增删学科。

**位置**：`C:/Users/EDY/Desktop/产品侧/学术备战支持/测试demo/learning-hub-v2/`
**旧站**：`../learning-hub/` —— **一个字节没动**（sha256 已核对），可继续使用。

---

## 2. 用户已拍板的事（不要再问、不要再改）

| # | 决定 | 影响 |
|---|---|---|
| 1 | **Super Quiz 不保留**，只做 Flashcards | 覆盖了最初「保留 Flashcards 和 Super Quiz」的要求 |
| 2 | **预留 Quiz / Matching / MCQ 入口**，但只做入口不写判分 | manifest 里 `enabled:false`，界面显示 Planned |
| 3 | **AD 与 AP 分成两个网站，互不干涉** | 各自独立 index.html + 独立 manifest 切片 + 独立 localStorage 命名空间 |
| 4 | **只生成 Preview，不部署、不覆盖正式站** | 两站并存，等用户确认后再谈合并/上线 |
| 5 | 用 LocalStorage，**不要注册登录、不要云数据库** | 纯静态，双击 index.html 即用 |

### Super Quiz 删除后的空站问题（已解决）
AD 站原本**只有** Super Quiz 一个模块，直接删会让 AD 变空站。
解法：5 道艺术史题转成闪卡卡片 —— **背面 = 正确选项，正面 = 题干 + 解析**。
每张卡的 `source` 字段完整保留：题干、四个选项、答案下标、解析原文。
→ 后续做 MCQ 题型可直接读 `source`，不必重新录入。

---

## 3. 架构（不可违背的几条）

```
content/*.json  ← 唯一真源，AI 只改这里
      │  tools/build.py  （校验 → 编译）
      ▼
assets/data/*.js  ← 编译产物：同步 <script src> 加载
      │
      ├─ assets/js/engine.js   ← 闪卡引擎，750 行，**字节不改**
      └─ assets/js/hub.js      ← Dashboard 渲染与路由，855 行
```

| 决策 | 理由（踩过坑才定下来的） |
|---|---|
| 编译成**同步 `<script src>`**，不用 `fetch()` | `fetch()` 会改变引擎读取数据的时机 → 已有存档绑定失联；且 `file://` 下被 CORS 拦 |
| **一个 `engine.js` 服务所有学科** | 用户要求「所有学科共用同一套 Flashcards Engine」 |
| `engine.js` / `flashcards.css` **字节不改** | 游戏资产由生成技能产出，整合层不得改动（sha256 基线在 tools/game-baseline.json） |
| 主题差异用 `theme-flashcards.css` 覆盖 `:root` 变量 | 不碰基线文件即可统一视觉 |
| 门户 + 两个 programme 站 | 满足「分开成两个网站」且保留统一门户 |

---

## 4. 内容与存档（**改这些会让旧进度失联**）

| Programme | 学科 | Section | 卡 | 章节 | storeKey |
|---|---|---|---|---|---|
| AP | Science | Section 1 | 39 | 2 | `fx_fc_v1:ap-science-section1` |
| AP | Social Science | Section 1 | 84 | 4 | `fx_fc_v1:ap-social-science-section1` |
| AD | Art History | Section 1 | 5 | 1 | `fx_fc_v1:ad-art-history-section1` |

共 128 卡。

🔴 **章节编号规则**：全局按牌组顺序递增（`chapter1`、`chapter2`……），
**不是** section 前缀（不是 2.1 / 2.2）。改这个 = 旧进度全部失联。

🔴 **storeKey 与旧站逐字符相同** → 旧站积累的通关记录、待复查清单、断点进度直接可见。
新学科必须用新 key：引擎用**裸 term** 记录「已掌握」，同学科内 term 撞车会让掌握状态串味。

---

## 5. 路由与结构

```
门户 index.html  →  ap/index.html  |  ad/index.html
                        ↓ hash 路由（同一份 hub.js，两站共用）
   #/overview   #/courses   #/assignments   #/reports   #/settings
                        ↓ #/courses/<subjectId>            → 学科页
                        ↓ #/courses/<subjectId>/<sectionId> → Section 页
                                ↓ flashcards.html?m=<moduleId>
```

- 闪卡页入口：`ap/flashcards.html?m=ap-science-section1`
- Section 页为每种活动渲染入口卡片，Flashcards 可点，Planned 只显示。
- 侧栏 5 个入口 + Logo + 本机存储用量条；门户页隐藏搜索/铃铛/返回链接（无对应功能）。

---

## 6. 视觉系统

参考图采样值，全部在 `assets/css/tokens.css`：

| 令牌 | 值 | 用途 |
|---|---|---|
| `--canvas` | `#EAF4FA` | 浅蓝页面底 |
| `--surface` | `#FFFFFF` | 白卡片 |
| `--brand` | `#006674` | 品牌青（Logo、实心按钮） |
| `--brand-soft` | `#D8FE77` | Logo 底色（黄绿） |
| `--pastel-lilac/sky/blush/cream/mint` | `#D3D6FF` `#BBE8FD` `#FFD4FF` `#FFF7C9` `#D7F0E4` | 柔和彩色模块 |
| `--sidebar-w` | `236px` | 固定侧栏宽 |
| `--gutter` | `clamp(18px,3.4vw,34px)` | 内容边距 |

字体 `Inter` → 系统字体栈回退。圆角 10/14/20/26px。
断点：桌面 / 平板 / 手机（≤760px 侧栏收起 + 汉堡 + 遮罩）。

---

## 7. 校验命令（改任何东西后全跑一遍）

```bash
PY=C:/Users/EDY/.workbuddy/binaries/python/versions/3.13.12/python.exe
export NODE_PATH=C:/Users/EDY/.workbuddy/binaries/node/workspace/node_modules

"$PY" tools/build.py                      # 编译内容+页面（含 storeKey/term 重复校验，不过就中止不写文件）
"$PY" tools/verify_content.py             # 128 卡逐条对账旧题库（已反向验证：篡改一个词即被抓出）
"$PY" tools/verify_baseline.py            # 引擎/样式 sha256 与基线一致
"$PY" tools/check_css_vars.py             # CSS 变量全部可解析
"$PY" "C:/Users/EDY/.workbuddy/skills/stop-waffling-skills/scripts/check_copy.py" . --severity P0,P1,P2
node tools/verify_browser.js              # 49 项：导航/闪卡流程/存档/响应式
node tools/verify_file_mode.js            # file:// 双击打开
node tools/shots.js                       # 刷新 11 张截图到 tools/shots/
```

Chromium：`C:/Users/EDY/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe`
（浏览器脚本是开发期工具，日常使用不需要）

---

## 8. 本次踩到的坑（已各自沉淀成自动化判据）

| 坑 | 现象 | 修法 / 防复发 |
|---|---|---|
| **CSS 变量未定义** | 游戏页不加载 tokens.css → `var(--brand)` 解析为空 → **「I know」按钮白字白底完全不可见，控制台零报错** | `tools/check_css_vars.py` 构建期扫描 + 浏览器侧「文字色≠背景色」判据 |
| **R10 英文状态词区分大小写** | `R10_STATE_WORDS` 无 `re.I` → "Saved on this device" 大写开头不匹配 → 误报 P1 | 改文案为 "Progress saved on this device"（含小写 saved） |
| **`a` 标签默认下划线未重置** | Logo 文字 "LEARNING" 带下划线 | tokens.css 已有 `a{text-decoration:none}` |
| **相邻 span 缺分隔符** | "39 cards2 chapters0 cleared" 挤成一行 | `.card-meta span+span::before{content:"·"}`（不靠 margin） |
| **文案校验器 R5 误判模板占位符** | `__PROGRAMME__` 被当残留占位符 | 模板占位符改用 `@@PROGRAMME@@` 形式 |

---

## 9. 已知取舍（别当 bug 修）

1. **Super Quiz 已移除** —— 用户确认第一阶段只做闪卡。
2. **Quiz / Matching / MCQ 只是入口位** —— `enabled:false`，显示 Planned，无任何判分逻辑。
3. **侧栏存储条按 50 KB 预算换算** —— 不是浏览器真实配额比例。
4. **`assets/data/*.js` 是编译产物** —— 改了 JSON 不跑 build.py，页面还是旧内容。
5. **Firefox 下 `file://` 各文件独立 origin** —— 入口页看不到闪卡页数据；Chrome/Edge 共用一个存储域，正常。

---

## 10. 加一个新学科（后续最常见任务）

只改 `content/`，然后重编译：

```bash
# 1. 建 content/ap/ap-history-section1.json
#    storeKey 用新命名空间：fx_fc_v1:ap-history-section1
# 2. 在 content/manifest.json 的 programmes[ap].subjects 里登记
# 3. 登记 activities（若新增题型）
"$PY" tools/build.py
```

题库 JSON 结构见 README.md 的「加一个新学科」一节。
`build.py` 会校验：storeKey 不重复、term 在同学科内不重复、每个 Section 指向存在的题库。

---

## 11. 待办 / 下一步

- ⏳ **等用户确认 Preview 是否满意** —— 未经批准不合并旧站、不部署。
- 📦 若要上线：静态文件已就绪，`assets/data/*.js` 已编译好，传 GitHub Pages 即可。
  部署时注意：`file://` 换成 `https://` = 换 origin = **旧存档不迁移**。
- 🔍 旧站上级目录还有两个更早版本文件（`闪卡.html`、`生成单词释义闪卡教学游戏.html`），
  含站点**未收录**的词条（22 词版本 vs 站点 39/84）。是否纳入需用户拍板。

---

## 12. 文件清单速查

```
learning-hub-v2/
├─ index.html                 门户（构建产物）
├─ ap/  ad/                   两个 programme 站（index + flashcards，均为产物）
├─ content/                   ★ 唯一真源
│  ├─ manifest.json           programme → 学科 → Section → activities 索引
│  ├─ ap/ap-science-section1.json
│  ├─ ap/ap-social-science-section1.json
│  └─ ad/ad-art-history-section1.json
├─ assets/
│  ├─ css/tokens.css          设计令牌 + 基础重置
│  ├─ css/shell.css           侧栏 / 顶栏 / Dashboard 网格 / 响应式
│  ├─ css/flashcards.css      ★ 游戏资产，字节未改
│  ├─ css/theme-flashcards.css 游戏页主题覆盖，只改颜色与按钮态
│  ├─ js/engine.js            ★ 游戏资产，字节未改（750 行）
│  ├─ js/hub.js               Dashboard 渲染 + hash 路由（855 行）
│  ├─ js/player.js            闪卡页标题注入 + 返回链接改写（38 行）
│  └─ data/                   编译产物
├─ tools/
│  ├─ build.py                内容编译 + 校验 + 页面渲染
│  ├─ templates/page.html     站点外壳模板（@@占位符@@）
│  ├─ templates/flashcards.html 闪卡页模板
│  ├─ extract_content.js      从旧站抽题库（一次性迁移脚本）
│  ├─ read_source.js          读旧站 JS 对象字面量（Python exec 处理不了中文注释）
│  ├─ verify_content.py       题库对账
│  ├─ verify_baseline.py      游戏资产 sha256
│  ├─ verify_browser.js       浏览器实测（49 项）
│  ├─ verify_file_mode.js     file:// 双击验证
│  ├─ check_css_vars.py       CSS 变量解析检查
│  ├─ shots.js                截图（11 张）
│  └─ game-baseline.json      游戏资产 sha256 基线
└─ stop-waffling-skills.toml  文案契约参数（glossary + scope.exclude）
```

`stop-waffling-skills.toml` 的 `scope.exclude` 排除三类文件：
`assets/js/engine.js`、`assets/css/flashcards.css`（游戏资产，不得改文案）、
`assets/data/*.js`（编译产物）、`tools/templates/**`（含占位符）。
