# Learning Hub v2

AP 与 AD 两个独立的学习站，共用一套闪卡引擎和一套内容体系。

> **续接或改动前，先读 [CONTEXT.md](CONTEXT.md)** —— 那是一份压缩过的上下文速查，
> 含已拍板的决定、架构约束、校验命令、踩过的坑和待办。

## 怎么用

双击 `index.html` 就能打开。不需要 Node、Python 或服务器。

进度存在浏览器本地存储里，不上传任何数据。

> **不要用本地服务器打开。** `python -m http.server` 会把地址从 `file://` 变成
> `http://localhost:8000`，浏览器按同源隔离就读不到 `file://` 下已有的复习记录。
> 正式使用就双击入口页。

## 入口

| 页面 | 内容 |
|---|---|
| `index.html` | 门户：AP 与 AD 两个 programme 的入口 |
| `ap/index.html` | AP 学习站：Dashboard、学科、Section、闪卡 |
| `ad/index.html` | AD 学习站：同上，只有 Art History |

## 层级

```
Learning Hub → Subject → Section → Activity
```

- **Subject** 学科，例如 Science
- **Section** 章节，例如 Section 1
- **Activity** 学习活动，Flashcards 已实现，Quiz / Matching / MCQ 预留

左侧栏固定，含 Logo、五个入口（Overview、Courses、Assignments、Reports、Settings）
和本机存储用量。

## 有哪些内容

| Programme | 学科 | Section | 卡数 | 章节 |
|---|---|---|---|---|
| AP | Science | Section 1 | 39 | 2 |
| AP | Social Science | Section 1 | 84 | 4 |
| AD | Art History | Section 1 | 5 | 1 |

AD 的 5 张卡由原先的 Super Quiz 题目转来：背面是正确选项，正面是题干与解析。
每张卡的 `source` 字段保留完整题干、四个选项、答案下标和解析原文，
后续做 MCQ 题型时可直接读取，不必重新录入。

## 目录结构

```
learning-hub-v2/
├─ index.html                 门户（构建产物）
├─ ap/index.html              AP 学习站（构建产物）
├─ ap/flashcards.html         AP 闪卡页（构建产物）
├─ ad/                        AD 站，同构
├─ content/                   内容真源：改这里，不改别处
│  ├─ manifest.json           programme → 学科 → Section 索引
│  ├─ ap/ap-science-section1.json
│  ├─ ap/ap-social-science-section1.json
│  └─ ad/ad-art-history-section1.json
├─ assets/
│  ├─ css/tokens.css          设计令牌
│  ├─ css/shell.css           侧栏与 Dashboard 布局
│  ├─ css/flashcards.css      游戏资产，未改动
│  ├─ css/theme-flashcards.css 游戏页主题覆盖，只改颜色
│  ├─ js/engine.js            闪卡引擎，游戏资产，未改动
│  ├─ js/hub.js               Dashboard 渲染与路由
│  ├─ js/player.js            闪卡页标题与返回链接
│  └─ data/                   编译产物（manifest + 题库）
└─ tools/
    ├─ build.py               内容编译
    ├─ extract_content.js     从旧站点抽取题库
    ├─ verify_content.py      题库对账
    ├─ verify_baseline.py     游戏资产 sha256 校验
    ├─ verify_browser.js      浏览器实测
    ├─ check_css_vars.py      CSS 变量解析检查
    └─ shots.js               截图
```

## 加一个新学科

只改 `content/`，然后重新编译：

```bash
PY=C:/Users/EDY/.workbuddy/binaries/python/versions/3.13.12/python.exe

# 1. 建题库文件，storeKey 用新的命名空间
#    content/ap/ap-history-section1.json
# 2. 在 content/manifest.json 的 ap.subjects 里登记
$PY tools/build.py
```

`build.py` 会校验：storeKey 不重复、term 在同一学科内不重复、
每个 Section 都指向存在的题库。校验不过就中止，不写文件。

题库文件的结构：

```json
{
  "id": "ap-history-section1",
  "type": "flashcards",
  "title": "AP History",
  "subjectLine": "AP History Section 1",
  "storeKey": "fx_fc_v1:ap-history-section1",
  "sections": [
    { "num": 1, "label": "Section 1", "levels": [
      { "id": "1.1", "cards": [ { "term": "...", "definition": "..." } ] }
    ] }
  ]
}
```

`storeKey` 决定进度存在哪。新学科必须用新 key：
引擎用裸 term 记录「已掌握」，同一学科内 term 撞车会让掌握状态串味。

## 校验

```bash
python tools/verify_content.py     # 128 张卡与旧题库逐条对账
python tools/verify_baseline.py    # 游戏资产 sha256
python tools/check_css_vars.py     # CSS 变量全部可解析
python tools/build.py              # 重新编译内容与页面
node tools/verify_browser.js       # 浏览器实测：导航、闪卡流程、存档、响应式
```

浏览器脚本需要 `playwright-core` 与本机 Chromium，属开发期工具，日常使用不需要。

## 关于存档

闪卡的 localStorage key **与旧站逐字符相同**：

| Section | key |
|---|---|
| AP Science Section 1 | `fx_fc_v1:ap-science-section1` |
| AP Social Science Section 1 | `fx_fc_v1:ap-social-science-section1` |

章节编号规则未变（全局按牌组顺序 `chapter1`、`chapter2`……），
所以旧站积累的通关记录、待复查清单、断点进度，在这里直接可见。

AD 的 Art History 是新内容，用新 key `fx_fc_v1:ad-art-history-section1`。

### 浏览器差异

`file://` 下的 localStorage 隔离规则各浏览器不同：

- **Chrome / Edge**：`file://` 共用一个存储域，入口页与闪卡页读写同一份数据。
- **Firefox 68+**：`file://` 每个文件各自一个独立 origin，站点内各页互不可见。
  模块页自己的进度不受影响，但入口页看不到闪卡页的数据。
  需要跨页共享时用 Chrome，或从原文件导出 JSON 再导入。

## 已知取舍

1. **Super Quiz 已移除。** 用户确认第一阶段只做闪卡。原来的 5 道艺术史题
   转成了闪卡卡片，题干、四个选项、答案、解析全部保留在卡片的 `source` 字段里。
2. **Quiz / Matching / MCQ 只是入口位。** manifest 的 `activities` 里
   `enabled: false`，界面显示 Planned，没有实现任何一题的判分逻辑。
3. **侧栏存储条按 50 KB 预算换算**，不是浏览器的配额比例。
4. **`content/` 是唯一真源。** `assets/data/*.js` 是编译产物，
   改了 JSON 不重新编译，页面还是旧内容。
