# Learning Hub

两个独立的学习站，共用一套前端与闪卡引擎，各自独立部署。

| 站点 | 入口 | 内容 | 卡数 |
|---|---|---|---|
| AP Learning Hub | `site/ap/index.html` | Science、Social Science | 39 + 84 |
| AD Learning Hub | `site/ad/index.html` | Art History | 5 |

合计 **128 张闪卡**。两个站零交叉依赖，可各自单独发布。

## 目录结构

```
learning-hub/
├─ content/                      ← 真源：题库
│  ├─ sites/ap.json              站点配置：名称、学科、章节
│  ├─ sites/ad.json
│  └─ modules/*.json             题库（128 张卡）
├─ assets/                       ← 真源：共享前端
│  ├─ css/{tokens,shell}.css     外壳与设计令牌
│  ├─ css/{flashcards,theme-}.css 游戏样式与主题覆盖
│  ├─ css/review.css             复习中心与复习轮次的样式
│  ├─ js/engine.js               闪卡引擎（游戏资产，字节不改）
│  ├─ js/site.js                 四级导航、面包屑、滚动保留
│  ├─ js/player.js               闪卡页面包屑与返回链接
│  ├─ js/review-store.js         复习状态服务：读取、更新、持久化
│  ├─ js/review.js               复习中心页面：路由、学科、清单
│  └─ js/review-session.js       复习轮次：队列、翻面、结果反馈
├─ templates/{site,flashcards,review-session}.html
├─ site/                         ← 产物：自包含部署单元
│  ├─ ap/                        20 个文件（7 个页面 + 13 个资源）
│  └─ ad/                        20 个文件
├─ tools/                        构建与校验
├─ docs/
│  ├─ REPO-SETUP-GUIDE.md        建仓指引（零基础版）
│  ├─ ITERATION-LOG.md           迭代日志（追加式）
│  ├─ CONTEXT.md                 续接上下文
│  └─ archive/                   历史存档（不再修改）
│     ├─ learning-hub-legacy/    最初的原始站（41 个文件）
│     └─ iter-01/                第 1 轮迭代存档（117 个文件）
└─ shots/                        截图（不入库，可重新生成）
```

**共享与独立的边界**：UI、导航逻辑、闪卡引擎都在 `assets/`，两个站共用同一份。
学科、章节、题库是各自的内容配置。构建时每个站生成一个自包含目录，
可以单独上传到不同的服务器或仓库。

改内容只动 `content/`，改界面只动 `assets/` 与 `templates/`，
然后重新构建 —— `site/` 全部是编译产物，不要手改。

## 导航

侧栏是三个**并列的一级页面**，各自独立：

| 侧栏项 | 页面 | 说明 |
|---|---|---|
| Overview | `index.html` | 仪表盘 |
| Courses | `courses.html` | 学科列表 |
| Review | `review.html` | 复习中心：学科 → 章节 → 复习清单 |

从侧栏进入某个页面后，该页面即是这一块的**第一层级**：

- Courses 是它自己这一块的顶层，**没有返回 Overview 的路径**，面包屑也不含 Overview。
- 只有向下走的两级才有返回键：**Subject → Courses**、**Flashcards → Subject**。
- 选中状态跟随层级：Subject 页上侧栏仍选中 Courses。

其余说明：

- Section 点击直接进入 Flashcards，没有活动选择页。
- Flashcards 是唯一可见的学习活动。
- 闪卡卡面：**正面术语、背面释义**（AP / AD 一致）；复习轮次同向，正面术语、`Reveal answer` 出释义。
- **Review 是独立的一条路径**：`Review → 学科 → 章节 → 复习清单 → 复习轮次`。
  闪卡页里没有复习清单，两条路径共用术语数据但互不嵌套。
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

改动后至少要跑前 6 条。第 1、2 条会拦住「改了题库但忘了重新构建」这类静默不一致。

## 不变量

改了这些，**用旧存档的学生会进度失联**：

1. **存档 key 不变**：`fx_fc_v1:ap-science-section1`、
   `fx_fc_v1:ap-social-science-section1`、`fx_fc_v1:ad-art-history-section1`。
   学生已有的复习进度直接可用。
2. **章节编号规则不变**：全局按牌组顺序 `chapter1`、`chapter2`……
3. **引擎与闪卡样式字节不改**（sha256 基线在 `tools/game-baseline.json`）。
4. **`content/` 是唯一真源**，`site/` 全部是编译产物。
5. **域名不变**：换域名 = 换 origin = 学生进度不迁移。

## 加一个新学科

1. 在 `content/modules/` 放题库 JSON，`storeKey` 用新命名空间
2. 在 `content/sites/<site>.json` 里登记学科与章节
3. `python tools/build.py <site>`

构建会校验：storeKey 不重复、同学科内 term 不重复、每个 Section 指向存在的题库。
校验不过就中止，不写文件。

## 版本管理

**分支模型**

```
main                            生产分支 → Cloudflare Pages Production
│
└─ feature/iter-YYYY-MM-DD-NN  迭代分支 → Cloudflare Pages Preview
```

`main` 只接受从 `feature/*` 合并进来的、已验收的提交。迭代分支用完即合、随即删除。

**提交信息**

```
<type>: <中文描述>（<日期>）
```

| 前缀 | 用途 |
|---|---|
| `feat:` | 新功能 |
| `fix:` | 修错 |
| `docs:` | 文档 |
| `refactor:` | 重构 |
| `chore:` | 构建 / 工具 |
| `content:` | 题库变更 |

**版本号**：打 tag 在**合并到 main 之后**。修错/改文案 → PATCH（`v1.0.1`），
新增功能/学科 → MINOR（`v1.1.0`），架构重构 → MAJOR（`v2.0.0`）。

**三层归档**

| 层 | 载体 | 内容 | 何时产生 |
|---|---|---|---|
| 提交历史 | git commit | 每一次改动 | 每次提交 |
| 版本标签 | git tag `vX.Y.Z` | 里程碑快照（含完整产物） | 合并到 main 后 |
| 迭代日志 | `docs/ITERATION-LOG.md` | 改了什么、为什么、验收结果 | 每次迭代追加 |

**三级回滚**

| 级别 | 动作 | 生效 |
|---|---|---|
| L1 平台回退 | Cloudflare 后台选旧部署 → Promote to Production | 秒级（止血） |
| L2 代码回退 | `git revert <sha>` 后 push | 一次构建周期 |
| L3 版本回退 | `git checkout v1.0.0` 后重建并 push | 一次构建周期 |

回退必须两步走：平台回退只是止血，还得 `git revert` 修代码，
否则下次 push 又把坏版本推回来。

**铁律**

- `git push` **单独一条命令**，不要写成 `git commit && git push`。
- push 之后用 `git ls-remote --heads origin` 复核，别信提示里的「推送成功」。
- 仓库带 `.gitattributes` 锁 LF。本机的 `core.autocrlf=true` 来自系统级配置，
  压不住 —— 换行符漂移会导致全文件 diff 和产物 md5 变化。

## 部署

| | learning-hub-ap | learning-hub-ad |
|---|---|---|
| 仓库 | `Elliot-elli/learning-hub` | 同左 |
| 生产分支 | `main` | `main` |
| 预览分支 | `feature/*` | `feature/*` |
| 构建命令 | 留空 | 留空 |
| 输出目录 | `site/ap` | `site/ad` |
| 线上域名 | `learning-hub-ap.pages.dev` | `learning-hub-ad.pages.dev` |

**构建命令留空是刻意的**：Cloudflare 不在云端跑构建，直接发布仓库里已验收的成品。
这样没有「云端构建失败」这个失败点，任意一个 tag 都自带可运行的内容。

`*.pages.dev` 子域名创建后不能改（只能删了重建），项目名一次定死。

建仓的完整步骤见 `docs/REPO-SETUP-GUIDE.md`。

## 浏览器差异

`file://` 下各浏览器对本地存储的隔离规则不同：

- **Chrome / Edge**：`file://` 共用一个存储域，仪表盘能读到闪卡页写入的进度。
- **Firefox**：`file://` 每个文件各自一个独立 origin，仪表盘读不到闪卡页的数据，
  闪卡页自己的进度不受影响。

部署到服务器后同一域名下没有问题。
