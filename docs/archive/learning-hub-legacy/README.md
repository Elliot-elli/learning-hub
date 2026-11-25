# 学术备战 · 学习站

把已完成的练习游戏整合成一个学习网站。AP 与 AD 各一个入口，全英文导航。

> **开发归档**：整合过程的技术决策、项目结构、测试覆盖与待办清单，见
> `C:\Users\EDY\.workbuddy\skills\htmlmerger\ARCHIVE.md`。
> 操作手册（怎么加新模块）在同目录的 `SKILL.md`。

## 怎么用

**双击 `ap/index.html` 或 `ad/index.html`** 就能用。Chrome / Edge / Firefox 都可以。

不需要装 Node、Python、服务器，也不需要联网。练习进度存在你自己浏览器的本地存储里，不上传任何数据。

> **不要用本地服务器打开。** `python -m http.server` 会把页面地址从 `file://` 变成 `http://localhost:8000`，浏览器按同源隔离就读不到 `file://` 下已有的复习记录了。正式使用就双击入口页。

## 入口

| 页面 | 内容 |
|---|---|
| `index.html` | 首页：选 AP 或 AD；下面按 programme 列出全部游戏 |
| `ap/index.html` | AP 学习站：Flashcards / Super Quiz 两张卡 → 学科 → 章节 → 游戏 |
| `ad/index.html` | AD 学习站：同上 |

## 有哪些模块

| Programme | 类型 | 模块 | 内容 | 玩法 |
|---|---|---|---|---|
| AP | Flashcards | AP Science Section 1 | 39 张卡 / 2 章 | 三态自评 + 待复查清单 + 章节断点续学 |
| AP | Flashcards | AP Social Science Section 1 | 84 张卡 / 4 章 | 同上 |
| AD | Super Quiz | Art history | 5 道题 | 10 秒倒计时，归零才揭晓正确选项。不判分、不计分、不记进度 |

模块清单在 `registry.json`，是导航的唯一真源。

## 目录结构

```
learning-hub/
├─ registry.json                  模块登记表（唯一真源，手工维护）
├─ index.html                     首页（选 programme）
├─ ap/index.html                  AP 学习站入口
├─ ad/index.html                  AD 学习站入口
├─ README.md
├─ assets/
│  ├─ site.css                    导航样式（生成产物）
│  ├─ site.js                     导航脚本（生成产物）
│  ├─ engine.js                   闪卡共享引擎（两个闪卡模块共用这一份）
│  ├─ flashcards.css              闪卡样式
│  ├─ sq-engine.js                SQ 引擎
│  ├─ sq.css                      SQ 样式
│  └─ data/
│     ├─ manifest.js              模块清单（生成产物）
│     ├─ ap-science-section1.js   题库数据
│     ├─ ap-social-science-section1.js
│     └─ sq-art-history.js
├─ modules/
│  ├─ ap-science-section1.html    模块页
│  ├─ ap-social-science-section1.html
│  └─ sq-art-history.html
└─ tools/
   ├─ verify_modules.py           题库与存档 key 对账
   ├─ verify_browser.js           浏览器实测：导航、层级、游戏流程、进度
   ├─ verify_storage.js           存档金标准：原文件与站点共用同一份进度
   ├─ check_syntax.py             引擎与数据文件语法检查
   ├─ game-baseline.json          游戏资产 sha256 基线（整合不得改动这些文件）
   ├─ shots.js                    截图
   ├─ selfcheck.html              手动自检页
   └─ legacy/                     旧的站点生成流水线（已归档，不要再跑）
```

## 加一个新模块

模块页与题库数据由游戏生成技能产出，导航由 `htmlmerger` 技能接：

```bash
SK="C:/Users/EDY/.workbuddy/skills/htmlmerger"
SITE="C:/Users/EDY/Desktop/产品侧/学术备战支持/测试demo/learning-hub"

# 1. 抽取成品游戏的题库与模块壳页
"$PY" "$SK/scripts/extract_module.py" --source <成品游戏.html> \
  --id ad-economics-section1 --site "$SITE" \
  --title "AD Economics Section 1 — Flashcards" --subject-line "AD Economics Section 1"

# 2. 登记（题量与存档 key 由数据文件读出，不用手写）
"$PY" "$SK/scripts/register_module.py" --site "$SITE" \
  --id ad-economics-section1 --programme ad --type flashcards \
  --subject "Economics" --section "Section 1" \
  --title "AD Economics Section 1" --desc "..." \
  --href modules/ad-economics-section1.html \
  --data assets/data/ad-economics-section1.js

# 3. 重建导航 + 校验
"$PY" "$SK/scripts/build_hub.py" --site "$SITE"
"$PY" "$SK/scripts/verify_hub.py" --site "$SITE" --baseline "$SITE/tools/game-baseline.json"
```

只加一个模块时不要重抽其它游戏，也不要重写 `assets/engine.js` 与 `assets/sq-engine.js`。

## 校验

```bash
python tools/verify_modules.py      # 题库逐条一致、存档 key 一致、DOM id 未丢、引擎函数齐全
node tools/verify_browser.js        # 浏览器实测：两套入口、导航层级、返回路径、游戏流程、进度
node tools/verify_storage.js        # 存档金标准：原文件与站点共用同一份进度
```

浏览器脚本需要 `playwright-core` 与本机 Chromium，属开发期工具，日常使用不需要。

## 关于存档

闪卡模块的 localStorage key **与原文件逐字符相同**：

| 模块 | key |
|---|---|
| AP Science Section 1 | `fx_fc_v1:ap-science-section1` |
| AP Social Science Section 1 | `fx_fc_v1:ap-social-science-section1` |

所以你之前用原文件积累的通关记录、待复查清单、断点进度，**在这个站点里直接可见**，不需要迁移。反过来也一样。

SQ 模块不写任何 localStorage（保持原样接入）。

### 浏览器差异

`file://` 下的 localStorage 隔离规则各浏览器不同：

- **Chrome / Edge**：`file://` 共用一个存储域，入口页、模块页、原文件读写同一份数据。
- **Firefox 68+**：`file://` 每个文件各自一个独立 origin，同一目录下的不同文件**不共享** localStorage。
  站点内各页（`ap/index.html`、`modules/*.html`）因此互不可见 —— **模块页自己的进度不受影响**，
  但入口页与模块页之间看不到对方的数据。需要跨页共享时，用 Chrome 打开，或从原文件导出 JSON 再导入。

## 已知取舍

1. **SQ 不判分不计分**，也不记进度 —— 按既定方案原样接入，保留 10 秒倒计时揭晓的玩法。题库里 3 条解析文本是源文件里就有的，UI 一直没渲染，这里原样保留。
2. **SQ 主色映射到站点令牌** —— SQ 的 CSS 规则一行没改，只在 `tools/legacy/extract_assets.py` 的 `SQ_TOKENS` 里换变量映射。SQ 源文件里的学科色映射表（`SUBJECT_TINT`）会被整块删除，否则运行时会覆盖站点学科色。
3. **闪卡的「已掌握」用裸 term 作 key** —— 跨学科会有串味风险。当前模块的 term 无交集，安全。**将来新增学科时如果 term 撞了，要用新命名空间（如 `store.review2`）+ 一次性迁移函数，不能直接改 key**，否则已有存档会失联。
4. **`AP_Science_Section2_Flashcards.html` 没有纳入** —— 它的 STORE_KEY 错写成了 `...section1`，内容其实还是 Section 1 的 39 张卡，是一次重命名事故。另外它没有独立的 Section 2 题库。
5. **社科模块的标题沿用源文件原文** `Social Science Section1`（少个空格），没有擅自改写。

## 源文件

本目录只放整合后的站点。原始文件在上一级目录：

- `闪卡/AP_Flashcards/Science/section 1/ap-science-section1.html`
- `闪卡/AP_Flashcards/SocialScience/AP_Social_Science_Section1.html`

SQ 的源文件 `SQ/ad-art-history-quiz.html` 已删除，站内的 `assets/data/sq-art-history.js` 与
`assets/sq-engine.js` 是现存唯一副本 —— **不要重跑抽取脚本**。
