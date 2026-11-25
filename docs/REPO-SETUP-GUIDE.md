# 学习站建仓指引 · 零基础版

> 面向**从来没有建过仓库**的人。照着做，一步一步，不用理解背后的原理也能完成。
>
> 文档版本：2026-11-24 ｜ 目标仓库：`Elliot-elli/learning-hub`

---

## 📋 三步速查版（赶时间先看这页）

> 下面是全文的压缩版，能独立执行。完整版在后面几章，**卡住了再回来查**。

### 【① 你做 · 约 10 分钟】在 GitHub 网页上建仓

1. 浏览器打开 <https://github.com/new>
2. **Repository name** 填 `learning-hub`
3. **Description** 填：`AP Science / Social Science 与 Art History 闪卡教学站（128 张卡，双站独立部署）`
4. **Visibility 选 `Public`**（公开）
5. ⚠️ **不要勾任何初始化选项** —— 页面下方 `Advanced settings` 里凡是出现 `README` / `.gitignore` / `license` 字样，**一个都不勾**，保持 `None`
6. 点绿色 **Create repository** 按钮
7. 页面出现绿色 `Quick setup` 框 → 点里面的 **`SSH`** 标签 → 点复制图标

> ✔ **成功标志**：地址栏变成 `https://github.com/Elliot-elli/learning-hub`，**页面下方的文件列表是空的**，剪贴板里是 `git@github.com:Elliot-elli/learning-hub.git`
>
> ✖ **打不开网页？** 双击运行 `D:\Clash Verge\clash-verge.exe`，等托盘图标出现（约 10 秒）再刷新本页。只在打不开时才需要这一步。

### 【② 我做 · 约 15 分钟】本地改造并推送

6. 备份旧站唯一副本 → `git init -b main` → `dist/` 改名 `site/` → 写 `.gitattributes` / `.gitignore` / `README.md` → 归档 → 首次提交 → 配 remote → push
7. （你不需要为这些做任何事）

### 【③ 复核 · 2 分钟】建仓完成的标准

8. `git ls-remote --heads origin` → **必须恰好 1 行**，且是 `refs/heads/main`
9. `git ls-files | wc -l` 与 `git ls-tree -r --name-only origin/main | wc -l` → **两个数字必须相等**（约 **217**，拆解见 6.2）
10. `git diff --stat` 与 `git diff --cached --stat` → **必须都是空输出**

> ✔ 三条全过 = **建仓完成**，下一步是开通 Cloudflare 两个站。

---

## 第 0 章 · 这份文档怎么用

### 0.1 我们要做什么

把两个**已经在你电脑上跑得好好的**教学站，变成**存在 GitHub 云端、能随时回滚、能持续迭代**的仓库。

- **AP 站**（`site/ap/`）：AP Science 39 张卡 + AP Social Science 84 张卡
- **AD 站**（`site/ad/`）：Art History 5 张卡
- 合计 **128 张闪卡**

做完之后你会得到：一个 GitHub 仓库地址，里面躺着两个可以直接上线的网站。

### 0.2 一句话总纲

> **Git 就是给文件夹拍快照的本子。**
> 仓库是这本子，**提交（commit）**是每次拍下的照片，**分支（branch）**是给同一本子准备的另外两个草稿簿，**远程仓库（origin）**是存在 GitHub 云端的备份本。
>
> 你要做的事只有三件：**在本子里拍第一张照片 → 把本子连上云端 → 把照片上传上去。**

### 0.3 四类标记怎么读

全文只用这四种标记。看到它们，就知道「这一步该谁做」：

| 标记 | 含义 | 你要做什么 |
|---|---|---|
| 🔧【你来做】 | 必须你亲手在浏览器操作 | 照着做，注意「成功标志」 |
| 🤖【我来做】 | 由我（AI 助手）执行 | **不用管**，等我说完成即可 |
| 💬【需要你给】 | 需要你提供信息或做选择 | 回答我，或在文档里选一个 |
| ⏭️【不适用】 | 已就绪 / 本次不涉及 | **跳过这一步**，不要重复执行 |

### 0.4 分工与时间

| 谁 | 做什么 | 大约多久 |
|---|---|---|
| 🔧 你 | 第 2.1 节网络自检 + 第 3 章网页建仓 7 步 | 10 分钟 |
| 🤖 我 | 第 5 章本地改造 8 步 + 推送 + 复核 | 15 分钟 |
| 👥 交接 | 你把两样信息交给我（见第 4 章） | 1 分钟 |

### 0.5 本文档的边界

**包含**：建 GitHub 仓库、本地仓库初始化、首次推送、版本管理规则。
**不包含**：Cloudflare 部署的完整步骤 —— 那在第 8 章给了参数表，真正上架是建仓完成后的下一轮。

---

## 第 1 章 · 名词表（先看懂再动手）

> 本章按**第一次出现**的顺序排列。看不懂的名词往后翻不会再解释第二次。

### 1.1 Git 这边

**版本控制系统**
记录文件每一次变化的小本子。改了东西后悔了，能退回去。
本项目靠它做「回滚到上一版」。

**仓库（repository，也叫 repo）**
装着这个小本子的文件夹。一个文件夹里多了 `.git/` 这个隐藏目录，它就是仓库了。
本项目：`learning-hub-v2` 这个文件夹。

**提交（commit）**
一次完整的「存档」。里面包含：改了哪些内容 + 一句说明 + 时间 + 作者。
本项目：每次迭代 = 一次提交。

**分支（branch）**
同一条时间线上的可并列草稿簿。在草稿簿上乱改，正式版不受影响。
本项目：`main` 是正式版，`feature/iter-*` 是草稿。

**远程仓库（remote）与 `origin`**
GitHub 上那个远端仓库。`origin` 是它在你电脑上的本地别名 —— 不是 GitHub 的特殊功能，大家都这么叫，换成 `github` 也行。

**主分支 `main`**
默认的、代表「当前正式可用版本」的分支。
本项目：Cloudflare 拿它做生产部署。

**HEAD**
一个指针，标记「你现在站在哪个提交上」。
本项目：HEAD 始终跟着 `main`。

**标签（tag）**
给某个提交起的固定名字。它**不会**跟着新提交往后跑。
本项目：`v1.0.0` 就是一个里程碑，随时能 `git checkout v1.0.0` 回去。

### 1.2 GitHub 网页这边

**公开（Public）/ 私有（Private）**
公开 = 任何人可以看你的源码。私有 = 只有你和被授权的人能看。
本项目选公开（理由见第 3 章步骤 4）。

**README**
仓库首页自动显示的说明书文件。名字来自 "READ ME"（读我）。
本项目：新建的仓库第一屏就能看到它。

**.gitignore**
「这些文件不要记录进本子」的清单。用来挡掉截图、`node_modules`、`.env` 密钥之类的垃圾。
本项目：我们会自己写一份。

**.gitattributes**
「这些文件按什么规矩存」的仓库级规则。跟 `.gitignore` 不同 —— 它管的是**怎么存**，不是存不存。
本项目：靠它把换行符永久锁成 LF（见第 1.3 节）。

**SSH 密钥**
你的电子门禁卡。GitHub 靠它确认「往仓库里推东西的人就是你」。
本项目：**你的门禁卡已经配好了**，本指引里任何一步都不需要你再去生成或粘贴。

**LF / CRLF**
文本行尾的两种写法。Linux/macOS 用 LF，Windows 用 CRLF。
同一个文件两种写法 → Git 会认为「整份文件都变了」→ 满屏黄色差异 + 构建产物校验失败。
本项目：`.gitattributes` 就是为了把这件事一劳永逸地钉死。

### 1.3 本项目专有名词

**真源（source of truth）**
内容**唯一该改的地方**。改完重新构建，产物自动更新。
本项目：`content/`（题库）、`assets/`（前端）、`templates/`（页面模板）。

**构建产物（也叫「输出」）**
从真源自动生成的成品。**不能手改** —— 下次构建会被覆盖。
本项目：`site/ap/`、`site/ad/`。

**Cloudflare Pages**
能把静态网站自动发布到公网的托管服务。相当于「帮我们把文件夹丢上云端并给个网址」。
本项目：用它把两个站变成 `*.pages.dev` 网址。

**Production / Preview**
正式环境 / 预览环境。
本项目：`main` 分支 → Production（正式）；`feature/*` 分支 → Preview（预览，改坏了不影响线上）。

**pages.dev**
Cloudflare 免费送的子域名。⚠️ **创建之后不能改**（只能删了重建）。
本项目：这就是为什么两个项目名 `learning-hub-ap` / `learning-hub-ad` 必须一次定死。

---

## 第 2 章 · 开工前的自检

### 步骤 2.1 ｜ 确认浏览器能打开 GitHub 🔧【你来做】

**做什么**

在浏览器地址栏输入 `https://github.com/new` 然后回车。

**成功标志**

页面出现一个**仓库名输入框**（占位提示文字类似 "Great repositories start with a good name"）。

**验收判据**

- [ ] 页面能加载出来，**不是**一片空白
- [ ] 看到 `repository name` 输入框

**做砸了会怎样**

| 症状 | 原因 | 处置 |
|---|---|---|
| 30 秒后还是空白 / 提示「无法访问此网站」 | 网络把 GitHub 网页挡住了 | 双击运行 `D:\Clash Verge\clash-verge.exe`，等托盘图标出现（约 10 秒），回到本页刷新 |
| 页面出现 `Sign in` 按钮 | 还没登录 | 点 `Sign in` → 输入账号密码 → 登录后回到 `https://github.com/new` |

> ⏭️【不适用】如果你现在就能正常打开 GitHub，**这一步跳过**，直接进第 3 章。

---

### 步骤 2.2 ｜ 确认本机已就绪（不要重复配置） ⏭️【不适用】

**做什么**

什么都不用做 —— 这一步是让你**知道哪些已经配好了**，从而避免重复配置把可用状态弄坏。

下面这些**全部已经配好了**。请**不要重复执行**，尤其不要重装 Git、不要重新生成 SSH 密钥 —— 那会把你现在能用的状态弄坏。

| 项 | 状态 |
|---|---|
| Git | ✅ 2.55.0 已安装 |
| Git 身份（提交时署名） | ✅ `user.name=飞象老师` / `user.email=teacher@feixiang.com` |
| SSH 门禁卡 | ✅ `ssh -T git@github.com` 返回 `Hi Elliot-elli! You've successfully authenticated` |
| SSH 端口改道 | ✅ 已配：github.com 走 443 端口（本机直连 22 端口会失败） |
| GitHub 账号 | ✅ `Elliot-elli` |
| `learning-hub` 这个名字 | ✅ 还没被占用，可以直接用 |

**想自己复核？（可选，只读，不会改任何东西）**

```bash
# Git Bash 与 PowerShell 通用
ssh -T git@github.com
```

**成功标志**：最后一行是

```
Hi Elliot-elli! You've successfully authenticated, but GitHub does not provide shell access.
```

**验收判据**

- [ ] 输出里有 `Hi Elliot-elli!`
- [ ] 输出里有 `successfully authenticated`

> ℹ️ 上面这句里的 "does not provide shell access"（不提供命令行访问）**是正常的**，不是说失败了。它只表示「你的身份验证通过了，但 GitHub 不让你用这条通道敲命令」—— 而我们本来就不需要敲命令，只需要它来传文件。

> ℏ️ 第一次执行时 SSH 可能先打印一行 `Warning: Permanently added 'ssh.github.com' to the list of known hosts.` —— **这是首次连接的正常提示，不是错误**，看一眼就行。

---

### 步骤 2.3 ｜ 备份唯一副本 🤖【我来做】

**做什么**

旧站目录里有三个文件是**全网唯一副本**，上游已经找不到了：

| 文件 | 为什么必须留 |
|---|---|
| `assets/sq-engine.js` | Super Quiz 版的引擎，全网仅此一份 |
| `assets/sq.css` | Super Quiz 版的样式，全网仅此一份 |
| `assets/data/sq-art-history.js` | 旧版 Art History 题库，全网仅此一份 |

> ℹ️ 顺带说明一下：这三个文件里的题库内容，**新站已经完整保留了**（我用 JS 原文逐条比对过 5 道题的题干、四个选项、正确项下标和解析，全部一致）。留它们不是为了「补内容」，而是为了**留个万一**：万一以后想复活 Super Quiz 这个题型，手里有原件。

**成功标志**

`docs/archive/learning-hub-legacy/` 出现，且三个 sq 文件都在里面。

**验收判据**

- [ ] 三个文件的 md5 与源文件一致（逐字节相同）

---

## 第 3 章 · 在 GitHub 网页上建仓 🔧【你来做】

> **这是全文唯一需要你亲手操作的一章。** 7 步，每步一个页面，10 分钟能走完。

---

### 步骤 3.1 ｜ 打开新建仓库页 🔧【你来做】

**做什么**

浏览器打开 <https://github.com/new>。
（已登录的话，也可以点右上角头像 → `+` → `New repository`，效果一样。）

**成功标志**

页面上同时能看到四样东西：

1. 一个 owner 下拉框（显示你的用户名 `Elliot-elli`）
2. `repository name` 输入框
3. `Description` 输入框
4. `Public` / `Private` 两个单选按钮

**验收判据**

- [ ] 四样东西都在
- [ ] owner 那一栏显示的是 `Elliot-elli`（不是某个组织名）

**做砸了会怎样**

| 症状 | 处置 |
|---|---|
| 看到 `Sign in` 按钮 | 先登录，再回到 `/new` |
| owner 下拉里选错了组织 | 展开下拉改选 `Elliot-elli` |

---

### 步骤 3.2 ｜ 填仓库名 🔧【你来做】

**做什么**

在 `repository name` 里输入：

```
learning-hub
```

**成功标志**

输入框下方没有红色报错。

**验收判据**

- [ ] 输入框里是 `learning-hub`
- [ ] 下方**没有**红色的 "already exists" 之类提示

**做砸了会怎样**

| 症状 | 原因 | 处置 |
|---|---|---|
| 出现红字 `learning-hub already exists` | 名字被占用 | 💬【需要你给】换备选名：`learning-hub-v2` 或 `ap-ad-flashcards`，告诉我你选了哪个 |

> ℹ️ 顺带一提：仓库名**现在改很便宜**（Settings → Rename，两秒的事）。但改名之后 Cloudflare 那边要断开重连 GitHub，所以**先定好再推**。

---

### 步骤 3.3 ｜ 填仓库描述 🔧【你来做】

**做什么**

在 `Description` 里填一句话。💬【需要你给】选一条，或者自己改写：

- **A**：`AP Science / Social Science 与 Art History 闪卡教学站（128 张卡，双站独立部署）`
- **B**：`Two independent flashcard sites — AP Science/Social Science & Art History, 128 cards`

**成功标志**

输入框里有那行字。

**验收判据**

- [ ] Description 不是空的

> ℹ️ 这句话是给「以后在 GitHub 搜索结果里认出这个仓库」用的。写一句说清楚里面是什么就行。

---

### 步骤 3.4 ｜ ⚠️ 可见性选 `Public` 🔧【你来做】

**做什么**

点 `Public` 单选按钮（**不要**点 `Private`）。

**成功标志**

`Public` 那一项被选中（通常显示为实心圆点，或 `Private` 变灰）。

**验收判据**

- [ ] 选中的是 `Public`

**为什么选公开**

1. **站点本来就要在公网可访问**（`*.pages.dev`）。源码公开与否，**不影响站点是否公开** —— 公开的是网页本身，不是源码。
2. **已实测**：产物里没有密钥、没有外部 CDN 依赖、没有你电脑的绝对路径。唯一的外部引用是 SVG 命名空间常量（`http://www.w3.org/2000/svg`），那只是一个标签名，不是真的网络请求。**公开没有安全风险。**
3. **留个后路**：以后若想换成 GitHub Pages（免费托管），而 GitHub Pages 免费版**只支持公开仓库**。留一手，以后换托管不用重做。

**做砸了会怎样**

| 症状 | 处置 |
|---|---|
| 不小心建成了 Private | Settings → Danger Zone → Change visibility → Change to private 的反方向 → 改成 Public。⚠️ 若 Cloudflare 已经连上了，改完要重新授权一次 |

---

### 步骤 3.5 ｜ ⚠️ 不要初始化任何东西（全文最关键的一步）🔧【你来做】

**做什么**

**目标只有一个：远端仓库建好之后，里面一个文件都没有。**

页面下方有一个 `Advanced settings`（高级设置）区域，里面会出现 README / `.gitignore` / license 字样的**复选框或下拉框**。GitHub 改过版，样子可能不一样，所以按**判断准则**来做：

> **只要看到 `README` / `.gitignore` / `license` 这三个字样，一律不要勾、不要选。**
> 如果看到 `Initialize the repository with:` 这个提示，就让它保持 `None`。

**成功标志**

`Advanced settings` 区域里没有任何一项被勾选。

**验收判据**

- [ ] 没有勾任何复选框
- [ ] `Initialize the repository with:` 保持 `None`

**为什么这一步这么重要**

只要你勾了其中一个，GitHub 会**先在远端建好一个提交**。这时候你本地是空的，第一次推送就会被 GitHub 拒绝，报错里出现 `rejected` 或 `non-fast-forward` 或 `fetch first`。

初学者 90% 卡在这里，却往往误以为是网络问题或密钥问题，来回折腾半天。

> ℹ️ 那三个选项（README、.gitignore、license）我们**在本地自己写好再提交上去**，内容完全可控 —— 比让 GitHub 替你生成好得多。

---

### 步骤 3.6 ｜ 点 `Create repository` 🔧【你来做】

**做什么**

滚到页面底部，点绿色的 **Create repository** 按钮。

**成功标志**

三样同时成立：

1. 地址栏变成 `https://github.com/Elliot-elli/learning-hub`
2. 页面右侧出现一个绿色的 `Quick setup` 框，框里能读到 `...or push an existing repository.`
3. **页面下方的文件列表是空的**（没有 README.md，没有 .gitignore，什么都没有）

**验收判据**

- [ ] 地址栏是 `.../Elliot-elli/learning-hub`
- [ ] 绿色 `Quick setup` 框在
- [ ] **文件列表为空** ← 这条最重要

**做砸了会怎样**

| 症状 | 说明 | 处置 |
|---|---|---|
| 文件列表里有一个 `README.md` | 步骤 3.5 勾了 | 不用重建！直接往下走，第 5 章的推送改用「先拉后推」一行（第 7 章有命令） |

---

### 步骤 3.7 ｜ 复制 SSH 地址 🔧【你来做】

**做什么**

在绿色 `Quick setup` 框里，点 **`SSH`** 标签页（不要点 HTTPS），然后点旁边的复制图标。

**成功标志**

剪贴板里是这一行：

```
git@github.com:Elliot-elli/learning-hub.git
```

**验收判据**

- [ ] 以 `git@github.com:` 开头（**不是** `https://github.com/`）

> ℹ️ **为什么用 SSH 不用 HTTPS**：你的 SSH 门禁卡已经配好了，而且 SSH 走的是 443 端口（本机直连 22 端口会失败）。选 SSH 就**不需要再折腾任何配置**。

---

## 第 4 章 · 【交接点】你交给我什么，我从哪接手

### 4.1 交接完成的定义

> **当 GitHub 上已经存在 `Elliot-elli/learning-hub` 这个仓库、并且它的文件列表是空的，就算交接完成。**

### 4.2 你交给我的两样东西

复制这两行发给我就行：

```
仓库名：learning-hub
可见性：Public
```

### 4.3 我接手时做的第一件事

> 我先**不碰你的文件夹**，先用一条**只读**命令确认远端确实是空的、确实是你说的那个仓库：
>
> ```bash
> git ls-remote git@github.com:Elliot-elli/learning-hub.git
> ```
>
> - 如果它**一条输出都没有** → 远端为空，符合交接标准 ✅
> - 如果它返回了一行 sha → 说明远端**已经**有内容（大概率是步骤 3.5 勾了 README）。这也没关系，我们改走「先拉后推」路线，**不会丢东西**。

### 4.4 关于「我用程序建仓」这件事

我会先尝试用程序化方式建仓（比手点更快更稳）。但上一轮实测这个接口返回 **403（权限不足）**，所以：

> **如果它失败，我会直接告诉你「请你手动执行第 3 章」，不会卡住，也不会反复折腾你。**

两种方式对**你的操作完全没区别** —— 唯一的共同要求是：**远端必须是空仓库**。

---

## 第 5 章 · 本地改造与首次提交 🤖【我来做】

> 这一章你基本不用动手。但每一步我都写了「你会看到什么」，你可以在旁边对照，有疑问随时喊停。

### 步骤 5.1 ｜ 初始化 Git 仓库

**做什么**

在 `learning-hub-v2` 目录里执行 `git init -b main`。

**命令**

```bash
# Git Bash 与 PowerShell 通用
git init -b main
```

**成功标志**

```
Initialized empty Git repository in C:/Users/EDY/Desktop/产品侧/学术备战支持/测试demo/learning-hub-v2/.git/
```

**验收判据**

- [ ] `git branch --show-current` 输出 `main`

> ⚠️ **`-b main` 不能省。** 你这台机器没有设置 `init.defaultBranch`，不写 `-b`，Git 会自己决定（很可能是 `master`），后面 Cloudflare 的「生产分支」名字就对不上了。

---

### 步骤 5.2 ｜ 目录重组

**做什么**

目标结构：

```
learning-hub-v2/
├─ content/                  ← 真源：题库 JSON（原地不动）
├─ assets/                   ← 真源：CSS / JS / 数据（原地不动）
├─ templates/                ← 真源：页面模板（原地不动）
├─ site/
│  ├─ ap/                    ← 部署产物，14 个文件
│  └─ ad/                    ← 部署产物，14 个文件
├─ docs/
│  ├─ REPO-SETUP-GUIDE.md    ← 本文档
│  ├─ ITERATION-LOG.md       ← 迭代日志（追加式）
│  ├─ CONTEXT.md             ← 续接上下文（从根目录移入）
│  └─ archive/
│     ├─ learning-hub-legacy/  ← 旧站 41 个文件（含 sq 唯一副本）
│     └─ iter-01/              ← 第 1 轮迭代存档 117 个文件
├─ tools/                    ← 构建与校验脚本
├─ README.md
├─ stop-waffling-skills.toml ← 文案规则（原地不动）
├─ .gitignore
├─ .gitattributes
└─ shots/                    ← 截图，不入库
```

**连带影响（唯一需要动代码的地方）**

`tools/` 里 **8 处硬编码路径**会同时失效：

| 文件 | 行 | 改什么 |
|---|---|---|
| `tools/build.py` | 35 | `DIST = ROOT/dist` → `ROOT/site` |
| `tools/check_css_vars.py` | 20 | 同上 |
| `tools/verify_content.py` | 31 | 同上 |
| `tools/verify_baseline.py` | 21 | 同上 |
| `tools/shots.js` | 9 | 同上 |
| `tools/verify_browser.js` | 15 | 同上 |
| `tools/verify_file_mode.js` | 12 | 同上 |
| `tools/verify_content.py` | 36 / 39 | `BASELINE_CANDIDATES` **追加**一条 `docs/archive/iter-01/_baseline/learning-hub-v2`（原两条保留做兜底） |
| `tools/verify_baseline.py` | 26 / 29 | 同上 |

**验收判据**

改完立刻跑这 6 条，全绿才算过：

```bash
python tools/build.py
python tools/verify_content.py
python tools/verify_baseline.py
python tools/check_css_vars.py
node   tools/verify_file_mode.js
node   tools/verify_browser.js
```

- [ ] `verify_content.py` → 128 张卡全部一致，0 个问题
- [ ] `verify_baseline.py` → 引擎与样式基线匹配
- [ ] `verify_file_mode.js` → 13 项全 PASS
- [ ] `verify_browser.js` → 106 项全 PASS
- [ ] **`site/ap/` 与 `site/ad/` 的 md5 与重组前逐字节一致**（产物只许「搬」，不许「改」）

**成功标志**

上面 6 条命令全部无报错退出，且 `site/` 目录结构与重组前完全相同。

> ⏭️【不适用】`shots/` 目录（25 张截图 / 860 KB）**不入库** —— 它可以由 `node tools/shots.js` 重新生成，入库会让仓库白白胖三分之一。

---

### 步骤 5.3 ｜ 写 `.gitattributes`（把换行符钉死）

**做什么**

在仓库根新建 `.gitattributes`。内容基于已验证可用的版本，**并额外补一条 `*.sh`**：

```gitattributes
# 换行符策略：仓库内统一 LF，检出时不转换。
#
# 为什么必须固化：
#   core.autocrlf 是「本地配置」，不随仓库走，别人 clone 后行为可能不同。
#   若某人在 Windows 上把 LF 转成 CRLF 再提交，会造成全文件 diff、
#   构建产物 md5 漂移、跨平台 diff 噪声。
#   用 .gitattributes 在仓库级锁定，优先级高于任何本地配置。

# 文本文件：仓库内存 LF，检出时也保持 LF
* text=auto eol=lf

# 明确指定常见文本类型（避免个别 Git 版本对 * 的推断差异）
*.html text eol=lf
*.css  text eol=lf
*.js   text eol=lf
*.json text eol=lf
*.txt  text eol=lf
*.md   text eol=lf
*.py   text eol=lf
*.yml  text eol=lf
*.yaml text eol=lf
*.sh   text eol=lf

# 二进制：禁止任何换行/文本转换
*.jpg  binary
*.jpeg binary
*.png  binary
*.gif  binary
*.ico  binary
*.webp binary
*.woff binary
*.woff2 binary
```

**成功标志**

文件建好，`git check-attr` 能查到规则。

**验收判据**

```bash
git check-attr text eol -- assets/js/engine.js
```

期望输出：

```
assets/js/engine.js: text: set
assets/js/engine.js: eol: lf
```

- [ ] `eol: lf` 在（这条是关键 —— 换行符锁定的证据）
- [ ] `text:` 后面是 `set` 或 `auto` 都算通过（取决于 Git 版本对 `*` 规则的推断）

> ℹ️ **为什么必须加 `*.sh`**：归档里的 `rollback.sh` 是 bash 脚本。如果它被 CRLF 污染，运行时会直接报 `bad interpreter: /bin/sh^M` —— 这种错新手基本查不出原因。

> ℹ️ **为什么不用改全局设置**：你机器上的 `core.autocrlf=true` 是 **PortableGit 安装时自带的系统级设置**，不是你设的，而且**改全局配置也压不住它**。唯一的解法就是在仓库里放 `.gitattributes` —— 仓库级规则优先级高于任何本机设置，写进仓库后，**任何人 clone 下来拿到的都是 LF**，谁都不用再配。

---

### 步骤 5.4 ｜ 写 `.gitignore`（⚠️ 不能照抄别的仓库）

**做什么**

在仓库根新建 `.gitignore`：

```gitignore
# ── 截图（可由 node tools/shots.js 重新生成，不进版本库）──
shots/

# ── 工具与缓存 ──
__pycache__/
*.pyc
node_modules/
.DS_Store
Thumbs.db

# ── 本地凭据（绝不入库）──
.env
.env.*
*.local
.wrangler/
.netrc
secrets.json

# ── 临时文件 ──
*.log
*.tmp
*.bak
```

> 🔴 **重要警告：不要照抄 `museum-site` 仓库的 `.gitignore`。**
>
> 你账号下已经有一个叫 `museum-site` 的仓库，它的 `.gitignore` 里写了 `site/`（不记录 site 目录）。
> **我们这个仓库正好相反**：`site/ap` 和 `site/ad` 是要**进**仓库的 —— 因为我们不打算让 Cloudflare 在云端跑构建（那是最容易失败的环节），直接把验好的成品上传，任意一个 tag 都自带可运行的东西。
>
> 所以本仓库的 `.gitignore` 里**不能有 `site/` 这一行**。

**成功标志**

`.gitignore` 文件建好，且 `git check-ignore` 的两个方向给出预期结果。

**验收判据**

两个方向都要查：

```bash
git check-ignore -v site/ap/index.html
git check-ignore -v shots/ap-overview-desktop.png
```

- [ ] 第一条**没有任何输出**（说明 `site/` 没被忽略）
- [ ] 第二条**有输出**，形如 `.gitignore:1:shots/	shots/ap-overview-desktop.png`（说明截图被正确忽略）

---

### 步骤 5.5 ｜ 写 `README.md`

**做什么**

重写根目录 README.md，包含这些部分：

1. 一句话说明这是什么
2. 目录结构与各目录职责
3. 两个站的入口地址（`site/ap/index.html`、`site/ad/index.html`）
4. 128 张卡与三个存档 key（`fx_fc_v1:ap-science-section1` 等）—— **不可改的契约**
5. 常用命令（构建 + 6 条校验）
6. 迭代流程（分支命名 `feature/iter-YYYY-MM-DD-NN`）
7. 部署说明（指向第 8 章与 `docs/DEPLOY.md`）
8. 三层归档（commit + tag + ITERATION-LOG）与三级回滚

**成功标志**

根目录的 README.md 内容完全换新，8 个部分都在。

**验收判据**

- [ ] 上面 8 个部分都在
- [ ] 三个 `storeKey` 一个不少

> ℹ️ README 是这个仓库的门面。**读者只看你这一页，就该知道：这是什么、怎么改、怎么上线、怎么回滚。**

---

### 步骤 5.6 ｜ 归档旧站与第 1 轮迭代

**做什么**

- `learning-hub/`（旧站 41 文件）→ `docs/archive/learning-hub-legacy/`
- `iterations/iter-01/`（117 文件）→ `docs/archive/iter-01/`

**成功标志**

`docs/archive/` 下出现 `learning-hub-legacy/` 与 `iter-01/` 两个目录。

**验收判据**

- [ ] `docs/archive/iter-01/_baseline/` 下有 **36** 个文件
- [ ] `docs/archive/iter-01/rollback.sh` 存在
- [ ] 三个 sq 文件的 md5 与源一致

> ℹ️ `docs/archive/` 是**归档区**，不是 `src/`：**归档区的东西不再改**，它的作用是「随时能翻回老版本」。以后新归档按 `iter-02`、`iter-03` 往后排。

---

### 步骤 5.7 ｜ 首次提交

**做什么**

```bash
git add -A
git status --short
git commit -m "chore: 初始化学习站仓库（AP/AD 双站，128 张卡）"
```

**成功标志**

```
[main (root-commit) abc1234] chore: 初始化学习站仓库（AP/AD 双站，128 张卡）
 217 files changed, ...
 create mode 100644 .gitattributes
 ...
```

**验收判据**

提交**之前**先看 `git status --short` 的输出：

- [ ] 总行数等于 **217**（拆解见 6.2）
- [ ] `.gitattributes` 在列表里
- [ ] `site/ap/` 和 `site/ad/` 各有 14 个文件
- [ ] **`shots/` 一个都没有**
- [ ] `docs/archive/` 在列表里（158 个文件）

---

### 步骤 5.8 ｜ 配置远程地址并推送

**做什么**

```bash
git remote add origin git@github.com:Elliot-elli/learning-hub.git
git remote -v
git push -u origin main
```

**成功标志**

`git remote -v` 输出：

```
origin  git@github.com:Elliot-elli/learning-hub.git (fetch)
origin  git@github.com:Elliot-elli/learning-hub.git (push)
```

推送输出里**必须出现这一行**：

```
 * [new branch]      main -> main
```

**验收判据**

- [ ] `git remote -v` 两行都对
- [ ] 推送输出里有 `* [new branch]      main -> main`

> 🔴 **静默失败提醒**：**别只看最后一行。**
>
> 如果输出里出现 `Everything up-to-date`，而你其实**刚**建了仓库 —— 那说明**一条都没推上去**。
> 真正的判定在第 6 章：用 `git ls-remote` 查远端，**那是唯一权威**。

---

## 第 6 章 · 验收（别信提示，信自己）

> **GitHub 页面上的绿色横幅、命令行最后的 `done`，都可能是骗人的。**
> **唯一权威是：让远端仓库自己报出它有什么。**

### 6.1 ✅ 远端到底有没有 `main` 分支

```bash
git ls-remote --heads origin
```

**期望**：**恰好 1 行**，形如

```
a1b2c3d4e5f6...	refs/heads/main
```

- [ ] 恰好 1 行
- [ ] 那一行是 `refs/heads/main`

**失败信号**

| 现象 | 含义 |
|---|---|
| 输出**有任何一行**但不是 `refs/heads/main` | 推送到了别的分支，或分支名不对 → `git branch -m main` 再推 |
| 报 `fatal: 'origin' does not appear to be a git repository` | `origin` 没配好 → 回到步骤 5.8 重新 `git remote add origin ...` |
| 报 `Could not read from remote repository` | 仓库名错或仓库不存在 → `git remote -v` 核对名字 |

---

### 6.2 ✅ 本地和远端的文件数一致

```bash
# Git Bash
git ls-files | wc -l
git ls-tree -r --name-only origin/main | wc -l
```

```powershell
# PowerShell
(git ls-files | Measure-Object -Line).Lines
(git ls-tree -r --name-only origin/main | Measure-Object -Line).Lines
```

- [ ] **两个数字相等**
- [ ] 数字等于 **217**（拆解见下）

**为什么是 217 而不是几十个**

首次提交里大部分是**归档文件**（`docs/archive/` 158 个）。分层拆解：

| 部分 | 文件数 |
|---|---|
| 根目录散文件（README.md + stop-waffling-skills.toml） | 2 |
| `assets/` | 7 |
| `content/` | 5 |
| `templates/` | 2 |
| `tools/` | 10 |
| `site/`（原 `dist/`，两站各 14） | 28 |
| `docs/` 固定文件（本指引 + ITERATION-LOG + CONTEXT） | 3 |
| `docs/archive/learning-hub-legacy/` | 41 |
| `docs/archive/iter-01/` | 117 |
| `.gitignore` + `.gitattributes` | 2 |
| **`shots/`（已排除）** | **0** |
| **合计** | **217** |

> ℹ️ **`shots/` 的 25 个文件必须一个都不在**。如果总数是 242 而不是 217，说明 `.gitignore` 没生效，去查步骤 5.4 的双向验收。

---

### 6.3 ✅ `.gitattributes` 确实进了远端

```bash
git ls-tree origin/main .gitattributes
git show origin/main:.gitattributes | head -3
```

- [ ] 第一条有输出（非空）
- [ ] 第二条能看到 `* text=auto eol=lf`

---

### 6.4 ✅ 换行符没漂移（两个方向都查）

```bash
git diff --stat
git diff --cached --stat
```

- [ ] **两条都是空输出**

**再比 md5 锚点**

```bash
md5sum assets/js/engine.js assets/css/flashcards.css content/modules/*.json
```

```powershell
Get-FileHash assets/js/engine.js -Algorithm MD5
```

期望值（已实测）：

| 文件 | 期望 md5 |
|---|---|
| `assets/js/engine.js` | `dc1d15b71efb66077e92b849502500fa` |
| `assets/css/flashcards.css` | `b7a415ff81b22df2de581cef6fcddb91` |
| `content/modules/ad-art-history-section1.json` | `139751ed7cd0ba3114b9e52abaad9ff6` |
| `content/modules/ap-science-section1.json` | `cfcfc65419fd8440addbd235e6f411e7` |
| `content/modules/ap-social-science-section1.json` | `bdad14dc20015fcf4f0f878e455f4e06` |

> ℹ️ 如果 md5 变了但 `git diff` 是空的，说明**改动发生在 Git 之外**（文件被别的程序改过），需要 `git status` 复核。

---

### 6.5 ✅ 浏览器侧最终确认 🔧【你来做】

**做什么**

打开 <https://github.com/Elliot-elli/learning-hub>。

**成功标志**

五样同时成立：

1. 文件列表有约 **217** 个条目
2. 分支下拉显示 `main`
3. 页面右上角显示 `1 branch` 和 `0 tags`
4. 右侧 `About` 显示你写的描述
5. **没有任何 README 文件**

**失败信号**

| 现象 | 处置 |
|---|---|
| 显示 `0 branches` | 推送没生效 → 回到 6.1 查 |
| 列表里有一个 `README.md` | 建仓时勾了复选框 → `git rm --cached README.md && git commit -m "chore: 移除远端预置 README" && git push` |

---

### 6.6 ✅ 打第一个标签（里程碑）

```bash
git tag -a v1.0.0 -m "v1.0.0 首个可部署版本（AP/AD 双站，128 张卡）"
git push origin v1.0.0
```

**验收判据**

```bash
git ls-remote --tags origin
```

- [ ] 出现 `refs/tags/v1.0.0`

> ℹ️ **tag 是给这次提交起的固定名字，不会跟着新提交往后跑。** 以后想回到这一版：`git checkout v1.0.0`。

---

### 6.7 ✅ 建一个迭代分支（验证分支机制）

```bash
git checkout -b feature/iter-2026-11-24-01
git push -u origin feature/iter-2026-11-24-01
```

**验收判据**

- [ ] GitHub 页面的分支下拉里出现了这个分支

> ℹ️ **为什么要这一步**：Cloudflare 会把**任何非 `main` 的分支**都自动发布成一个预览地址。这样以后改坏了，正式站完全不受影响 —— 改好了再合并回去。

---

## 第 7 章 · 风险速查表

> 出问题了先查这张表，左边是症状，右边是一条命令。

| 症状 | 原因 | 处置（一条命令） |
|---|---|---|
| 浏览器打不开 github.com / 一直转圈 | 网络被挡 | 双击 `D:\Clash Verge\clash-verge.exe`，等 10 秒刷新 |
| `git push` 报 `rejected` / `fetch first` | 建仓时勾了 README，远端已有提交 | `git pull --rebase origin main` 然后再 push |
| `git push` 报 `Permission denied (publickey)` | SSH 门禁卡失效 | `ssh -T git@github.com`（期望末行 `Hi Elliot-elli!`） |
| `git push` 报 `could not read from remote repository` | 仓库名拼错 / 仓库不存在 | `git remote -v` |
| 推送"成功"但远端没有 main | 静默跳过 / 推到了别的分支 | `git ls-remote --heads origin` |
| 首次 `git init` 后分支叫 `master` | 没写 `-b main` | `git branch -m main` |
| 整个文件全变黄 / 整文件 diff | `autocrlf=true` 在生效 | 必须有 `.gitattributes`；已有则 `git add --renormalize .` |
| `rollback.sh` 报 `bad interpreter: /bin/sh^M` | 脚本被 CRLF 污染 | `.gitattributes` 里加 `*.sh text eol=lf` |
| 建仓页提示名字已被占用 | 名字冲突 | 换 `learning-hub-v2` 等备选名 |
| 建成了私有仓库 | Visibility 点错 | Settings → Danger Zone → 改成 Public；CF 需重授权 |
| 程序化建仓报 403 | 连接器无建仓权限 | 走手工第 3 章（已在第 4.4 节声明兜底） |
| 目录重组后 6 个校验脚本全红 | 8 处硬编码路径失效 | 改 6 处 `DIST` 常量 + 2 处 `BASELINE_CANDIDATES` 追加候选 |
| 误改了 `site/` 里的文件 | 把产物当真源手改了 | `git checkout -- site/` 恢复；改动请回 `content/` / `assets/` 改完重新 build |
| 改了题目后学生进度「失联」 | 动了存档 key 或章节编号规则 | 这三个 `storeKey` 是跨版本契约，**不可改** |

---

## 第 8 章 · 建仓完成后 → Cloudflare 双站部署

> 建仓完成后推进。参数先给你，做到哪一步心里有数。

### 8.1 两个项目的配置参数

|  | learning-hub-ap | learning-hub-ad |
|---|---|---|
| 仓库 | `Elliot-elli/learning-hub` | 同左 |
| 生产分支 | `main` | `main` |
| 预览分支 | `feature/*` | `feature/*` |
| 构建命令 | **留空** | **留空** |
| 输出目录 | `site/ap` | `site/ad` |
| 线上域名 | `learning-hub-ap.pages.dev` | `learning-hub-ad.pages.dev` |

> ℹ️ **构建命令留空是刻意的**：Cloudflare 不用在云端跑任何构建，直接把我们仓库里已经验好的成品发出去。这样就没有「云端构建失败」这个失败点，**任意一个 tag 拿出来都自带可运行的东西**。

> ⚠️ **`*.pages.dev` 子域名创建之后不能改**（Cloudflare 官方限制：只能删了重建）→ 项目名一次定死，别手抖打错。

### 8.2 需要你做的一次授权

Cloudflare 后台 → GitHub Apps → 授权 `Elliot-elli/learning-hub`。
如果之前给 `museum-site` 的授权是「All repositories」，那就不用再授权，只需在选仓库时能勾到它。

### 8.3 上线后的验收清单

- [ ] `https://learning-hub-ap.pages.dev` 能打开，侧栏三项可见
- [ ] Courses → Subject → Flashcards 四级导航走通
- [ ] Review 页徽标数正确
- [ ] 闪卡能翻、能存进度
- [ ] 手机视口不横向溢出
- [ ] 线上文件与本地产物 md5 逐字节一致
- [ ] 微信里点开能正常显示（发到「文件传输助手」实测）

### 8.4 回滚三级的操作入口

| 级别 | 动作 | 生效速度 |
|---|---|---|
| L1 平台回退 | CF 后台选旧部署 → Promote to Production | 秒级（止血） |
| L2 代码回退 | `git revert <sha>` 后 push | 一次构建周期 |
| L3 版本回退 | `git checkout v1.0.0` 后重建并 push | 一次构建周期 |

> 🔴 **回退必须两步走**：平台回退只是**止血**，还必须 `git revert` 修代码 —— 否则下次 push 又把坏版本推回来。只做平台回退不做代码回退 = 假回退。

---

## 第 9 章 · 本项目的长期规矩（读一遍就够）

### 9.1 每次迭代的固定流程

```bash
# 0. 切迭代分支
git checkout main && git pull
git checkout -b feature/iter-$(date +%Y-%m-%d)-01

# 1. 改代码 → 构建 → 校验
python tools/build.py
python tools/verify_content.py
python tools/verify_baseline.py
python tools/check_css_vars.py
node   tools/verify_file_mode.js
node   tools/verify_browser.js

# 2. 提交（push 必须单独一条命令！）
git add -A
git commit -m "feat: XXX（$(date +%Y-%m-%d)）"
git push -u origin feature/iter-$(date +%Y-%m-%d)-01

# 3. 等 CF 预览部署（1-3 分钟）→ 打网址验收

# 4. 审核通过 → 合并 + 打 tag
git checkout main
git merge --no-ff feature/iter-$(date +%Y-%m-%d)-01
git push origin main
git tag -a vX.Y.Z -m "..."
git push origin vX.Y.Z

# 5. 追加迭代日志到 docs/ITERATION-LOG.md 并再提交一次
```

### 9.2 提交信息格式

```
<type>: <中文描述>（<日期>）
```

| 前缀 | 用途 | 例 |
|---|---|---|
| `feat:` | 新功能 | `feat: 新增 AP Social Science Section 2` |
| `fix:` | 修错 | `fix: 修正闪卡页面包屑分隔符不可见` |
| `docs:` | 文档 | `docs: 补部署流程与分支规范` |
| `refactor:` | 重构 | `refactor: 抽离站点配置到 content/sites` |
| `chore:` | 构建 / 工具 | `chore: 加 .gitattributes 锁 LF` |
| `content:` | 题库变更 | `content: AP Science 补 8 张卡` |

### 9.3 版本号规则

| 变更类型 | 增量 | 例 |
|---|---|---|
| 新增功能 / 新增学科 | MINOR | `v1.1.0` |
| 修错 / 改文案 | PATCH | `v1.0.1` |
| 架构重构 / 破坏性变更 | MAJOR | `v2.0.0` |

### 9.4 🔴 四条不可碰的契约

改了这些，**用旧存档的学生会「进度失联」**：

1. **三个存档 key**（学生答题进度存在浏览器里，key 变了就找不到旧进度）
   - `fx_fc_v1:ap-science-section1`
   - `fx_fc_v1:ap-social-science-section1`
   - `fx_fc_v1:ad-art-history-section1`
2. **章节编号规则**：全局按牌组顺序 `chapter1`、`chapter2`……，**不是** `2.1` / `2.2`
3. **`engine.js` 与 `flashcards.css` 的字节**：上游游戏资产，sha256 基线在 `tools/game-baseline.json`
4. **域名**：换域名 = 换 origin = 学生进度不迁移

### 9.5 三层归档

| 层 | 载体 | 内容 | 何时产生 |
|---|---|---|---|
| 提交历史 | git commit | 每一次改动 | 每次提交 |
| 版本标签 | git tag `vX.Y.Z` | 里程碑快照（含完整产物） | 合并到 main 后 |
| 迭代日志 | `docs/ITERATION-LOG.md` | 人读版：改了什么、为什么、验收结果 | 每次迭代追加 |

---

## 附录 A · 命令速查（Git Bash / PowerShell 差异）

只有 4 处需要区分：

| 用途 | Git Bash | PowerShell |
|---|---|---|
| 数文件数 | `ls-files \| wc -l` | `(git ls-files \| Measure-Object -Line).Lines` |
| 算 md5 | `md5sum <file>` | `Get-FileHash <file> -Algorithm MD5` |
| 列目录 | `ls -a` | `Get-ChildItem -Force` |
| 找文件 | `find . -name "*.html"` | `Get-ChildItem -Recurse -Filter *.html` |

**其余所有 git 命令，Git Bash 与 PowerShell 完全一样，直接复制即可。**

---

## 附录 B · 文件速查

| 我要改题库 | `content/modules/*.json` | 改完跑 `python tools/build.py` |
|---|---|---|
| 我要改站点配置（名称/章节） | `content/sites/ap.json`、`content/sites/ad.json` | 改完跑 `python tools/build.py` |
| 我要改界面 | `assets/css/`、`assets/js/` | 改完跑 `python tools/build.py` |
| 我要改页面结构 | `templates/` | 改完跑 `python tools/build.py` |
| 我要看上一轮改了什么 | `docs/ITERATION-LOG.md` | 追加式，不覆盖 |
| 我要翻老版本 | `docs/archive/` | 不再修改 |
| 我要回滚 | 见第 8.4 节 | 三级 |

---

*文档结束。执行中遇到任何一步卡住，先查第 7 章风险速查表；表里没有的，直接喊我。*
