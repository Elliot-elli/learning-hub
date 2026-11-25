# Learning Hub — Iteration 01

两个独立的学习站，共用一套前端与闪卡引擎，各自独立部署。

| 站点 | 入口 | 内容 |
|---|---|---|
| AP Learning Hub | `dist/ap/index.html` | Science、Social Science |
| AD Learning Hub | `dist/ad/index.html` | Art History |

## 架构

```
src/                              共享源码（唯一真源）
├─ content/
│  ├─ sites/ap.json               站点配置：名称、学科、章节
│  ├─ sites/ad.json
│  └─ modules/*.json              题库（128 张卡）
├─ assets/
│  ├─ css/{tokens,shell}.css      外壳与设计令牌
│  ├─ css/{flashcards,theme-}.css 游戏样式与主题覆盖
│  ├─ js/engine.js                闪卡引擎（游戏资产，字节不改）
│  ├─ js/site.js                  四级导航、面包屑、滚动保留
│  └─ js/player.js                闪卡页面包屑与返回链接
├─ templates/{site,flashcards}.html
└─ tools/                         构建与校验

dist/ap/                          独立部署目标（自包含）
dist/ad/                          独立部署目标（自包含）
```

**共享与独立的边界**：UI、导航逻辑、闪卡引擎都在 `src/assets/`，两个站共用同一份。
学科、章节、题库是各自的内容配置。构建时每个站生成一个自包含目录，
可以单独上传到不同的服务器或仓库。

## 导航

侧栏是三个**并列的一级页面**，各自独立：

| 侧栏项 | 页面 | 说明 |
|---|---|---|
| Overview | `index.html` | 仪表盘 |
| Courses | `courses.html` | 学科列表 |
| Review | `review.html` | 待复查词表与未完成章节 |

从侧栏进入某个页面后，该页面即是这一块的**第一层级**：

- Courses 是它自己这一块的顶层，**没有返回 Overview 的路径**，面包屑也不含 Overview。
- 只有向下走的两级才有返回键：**Subject → Courses**、**Flashcards → Subject**。
- 选中状态跟随层级：Subject 页上侧栏仍选中 Courses。

其余说明：

- Section 点击直接进入 Flashcards，没有活动选择页。
- Flashcards 是唯一可见的学习活动。
- 返回控件一律是纯图标（箭头），不附文字；无障碍标签保留在 `aria-label`。
- 闪卡页有一个固定在左上角的圆形返回键，指向所属学科页；引擎自己的返回键
  （退出本章、退回欢迎页）留在原位，靠位置与形状区分职责。

## 构建与校验

```bash
PY=C:/Users/EDY/.workbuddy/binaries/python/versions/3.13.12/python.exe
export NODE_PATH=C:/Users/EDY/.workbuddy/binaries/node/workspace/node_modules

"$PY" tools/build.py              # 构建两个站
"$PY" tools/build.py ap           # 只构建 AP，AD 产物逐字节不变
"$PY" tools/verify_content.py     # 128 张卡与基线逐条对账 + 站点隔离
"$PY" tools/verify_baseline.py    # 游戏资产 sha256
"$PY" tools/check_css_vars.py     # CSS 变量全部可解析
node tools/verify_browser.js      # 浏览器实测（106 项）
node tools/verify_file_mode.js    # file:// 双击打开（13 项）
node tools/shots.js               # 截图
```

## 不变量

1. **存档 key 不变**：`fx_fc_v1:ap-science-section1`、
   `fx_fc_v1:ap-social-science-section1`、`fx_fc_v1:ad-art-history-section1`。
   学生已有的复习进度直接可用。
2. **章节编号规则不变**：全局按牌组顺序 `chapter1`、`chapter2`……
3. **引擎与闪卡样式字节不改**（sha256 基线在 `tools/game-baseline.json`）。
4. **`content/` 是唯一真源**，`dist/` 全部是编译产物。

## 加一个新学科

1. 在 `content/modules/` 放题库 JSON，`storeKey` 用新命名空间
2. 在 `content/sites/<site>.json` 里登记学科与章节
3. `python tools/build.py <site>`

构建会校验：storeKey 不重复、同学科内 term 不重复、每个 Section 指向存在的题库。
校验不过就中止，不写文件。

## 浏览器差异

`file://` 下各浏览器对本地存储的隔离规则不同：

- **Chrome / Edge**：`file://` 共用一个存储域，仪表盘能读到闪卡页写入的进度。
- **Firefox**：`file://` 每个文件各自一个独立 origin，仪表盘读不到闪卡页的数据，
  闪卡页自己的进度不受影响。

部署到服务器后同一域名下没有问题。
