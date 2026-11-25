# 部署与回滚

> 线上环境：Cloudflare Pages。仓库：`Elliot-elli/learning-hub`（public）。
> 最后核对：2026-11-25

---

## 一、线上地址

| 站 | 地址 | 部署项目 |
|---|---|---|
| AP | <https://learning-hub-ap.pages.dev> | `learning-hub-ap` |
| AD | <https://learning-hub-ad.pages.dev> | `learning-hub-ad` |

两个站指向**同一个仓库**，靠「生产分支 + 构建输出目录」区分。

---

## 二、Cloudflare Pages 项目配置

两个项目参数完全一致，只有项目名与输出目录不同：

| 项 | learning-hub-ap | learning-hub-ad |
|---|---|---|
| 仓库 | `Elliot-elli/learning-hub` | 同左 |
| 生产分支 | `main` | `main` |
| **构建命令** | **留空** | **留空** |
| **构建输出目录** | **`site/ap`** | **`site/ad`** |
| 根目录 | 留空 | 留空 |
| 框架预设 | None | None |

### 为什么构建命令留空

产物 `site/` **已入库**（远端 28 → 30 个文件），Cloudflare 直接发布这份已验收的成品。

与 `museum-site` 相反：那个仓库的 `site/` 被 `.gitignore` 排除，所以必须填
`bash tools/build_cloud.sh` 让云端自己构建，留空会报 `Failed to find directory site`。

留空的好处：没有「云端构建失败」这个失败点，**任意一个 tag 都自带可运行的内容**。

### 为什么输出目录不能填错

- 填 `site`（父目录）→ 404
- 留空或填仓库根 → 把 `docs/archive/` 下 26 个历史 HTML 一并发布出去

### 预览分支

`feature/*` 分支自动部署成 Preview 预览地址，格式：

```
https://<hash>.learning-hub-ap.pages.dev
https://<branch-alias>.learning-hub-ap.pages.dev     ← 分支名式，更稳定
```

> 分支名里的 `/` 会被替换成 `-`，例如 `feature/iter-2026-11-25-01`
> → `feature-iter-2026-11-25-01.learning-hub-ap.pages.dev`

---

## 三、Cloudflare 的两个内建行为（实测，2026-11-25）

### 1. `.html` 会被 308 剥离

```
/index.html      → 308 → /
/flashcards.html → 308 → /flashcards
```

**query 参数完整保留**（实测）：

```
/flashcards.html?m=ad-art-history-section1
  → 308 → /flashcards?m=ad-art-history-section1   ✅
```

这是 Pages 的内建行为，**不可关闭**。站内的 `?m=` / `?subject=` 参数不受影响。

> ⚠️ 验收脚本若要下载线上 HTML，必须用 `curl -L` 跟随重定向，
> 否则拿到的是空文件（空文件 md5 = `d41d8cd98f00b204e9800998ecf8427e`）。

### 2. 没有 `404.html` 时会返回首页

Cloudflare 假定你是 SPA，把所有路径都匹配到 `/` 并返回 **200**。
拼错网址会静默回到首页。**本仓库已补 `404.html`**，错网址返回真 404。

---

## 四、为什么选 Pages 而不是 Workers

2026 年 Cloudflare 改版后，「创建应用」的默认流程是 **Workers**，Pages 被降级为旧版工作流。
如果建成了 Workers，本项目在境内**打不开**。

### 判别性测试（不存在的子域名，干净解析器应返回 NXDOMAIN）

```
zzz9x7q.workers.dev  → 108.160.163.108   ❌ 被 DNS 污染（该 IP 属 Dropbox）
zzz9x7q.pages.dev    → NXDOMAIN          ✅ 未被污染
```

对照真实存在的域名：

```
museum-site-cwb.pages.dev                → 172.66.44.164   ✅ Cloudflare AS13335
learning-hub-ap.elliotelli9369.workers.dev → 118.193.240.37 ❌ 北京，归属为空
```

→ **`pages.dev` 在境内可用，`workers.dev` 在境内被污染。**

### 另外两条差异

| | Pages | Workers |
|---|---|---|
| 绑定外部 DNS 的自定义域名 | 一条 CNAME 即可 | **必须**把 NS 托管到 Cloudflare |
| 官方迁移路径 | 官方支持完整 | 只提供 Pages → Workers 指引 |

---

## 五、日常迭代流程

```bash
# 0. 切迭代分支
git checkout main && git pull
git checkout -b feature/iter-$(date +%Y-%m-%d)-01

# 1. 改代码 → 构建 → 校验
python tools/build.py
python tools/verify_content.py
python tools/verify_baseline.py
python tools/check_css_vars.py
node   tools/verify_browser.js
node   tools/verify_file_mode.js

# 2. 提交（push 必须单独一条！）
git add -A
git commit -m "feat: XXX（$(date +%Y-%m-%d)）"
git push -u origin feature/iter-$(date +%Y-%m-%d)-01

# 3. 等 1-3 分钟 → 打开预览地址验收
#    https://<branch-alias>.learning-hub-ap.pages.dev

# 4. 审核通过 → 合并 + 打 tag
git checkout main
git merge --no-ff feature/iter-$(date +%Y-%m-%d)-01
git push origin main
git tag -a vX.Y.Z -m "..."
git push origin vX.Y.Z

# 5. 追加迭代日志到 docs/ITERATION-LOG.md 并再提交一次
```

**推 main 后 CF 自动发布 Production**（无需额外操作）。

---

## 六、三级回滚

| 级别 | 动作 | 生效 | 适用 |
|---|---|---|---|
| **L1 平台回退** | CF 后台 → 该项目 → Deployments → 选旧部署 → **Promote to Production** | 秒级 | 线上出 bug，代码本身没问题 |
| **L2 代码回退** | `git revert <sha>` 后 push | 一次构建周期 | 要永久撤销某次改动 |
| **L3 版本回退** | `git checkout v1.0.0` 后重建并 push | 一次构建周期 | 要回到某个里程碑 |

### 🔴 回退必须两步走

1. **平台回退只是止血**（秒级生效）
2. **还得 `git revert` 修代码** —— 否则下次 push 又把坏版本推回来

只做第 1 步不做第 2 步 = **假回退**。

### 本仓库的版本号

| 版本 | 时间 | 内容 |
|---|---|---|
| `v1.0.0` | 2026-11-25 | 首次建仓，AP/AD 双站上线 |

---

## 七、上线验收清单

```bash
# 1. 状态码
curl -sS -o /dev/null -w "%{http_code}\n" https://learning-hub-ap.pages.dev/typo-xyz   # 期望 404
curl -sS -o /dev/null -w "%{http_code}\n" https://learning-hub-ad.pages.dev/typo-xyz   # 期望 404

# 2. 线上产物与本地逐字节比对（比 md5，不比文件大小）
#    下载时必须带 -L 跟随 308 重定向
```

- [ ] 两站首页能打开，侧栏三项可见
- [ ] Courses → Subject → Flashcards 四级导航通
- [ ] Review 页徽标数正确
- [ ] 闪卡能翻、能存进度
- [ ] 手机视口不横向溢出
- [ ] 线上 md5 与本地产物逐字节一致
- [ ] 拼错网址返回真 404（不是首页）
- [ ] 微信里点开能正常显示（发「文件传输助手」实测）

---

## 八、踩过的坑

1. **改版后默认建的是 Workers** —— 「创建应用」默认流程是 Workers，Pages 入口是创建页**顶部或底部的一行小字**（*Looking to deploy Pages? Get Started*）。直达链接：
   <https://dash.cloudflare.com/?to=/:account/workers-and-pages/create/pages>
2. **`workers.dev` 在境内被 DNS 污染** —— 判别性测试：查一个**不存在的**子域名，
   干净解析器应返回 NXDOMAIN，返回 IP 即被污染
3. **`*.pages.dev` 建后不能改** —— 官方限制：只能删除项目重建。项目名一次定死
4. **`learning-hub.pages.dev`（单数）已被别人占用** —— 返回的是个 GetSkills 模板，必须用 `learning-hub-ap` / `learning-hub-ad`
5. **下载线上 HTML 必须 `curl -L`** —— `.html` 被 308 剥离，不跟随重定向会拿到空文件
6. **构建命令留空 vs 填构建脚本** —— 取决于产物是否入库。产物入库 → 留空；产物不入库 → 必须填
7. **`.gitignore` 的目录规则要加前导 `/`** —— `shots/` 会连归档区里的同名文件夹一起排除
8. **`git push` 必须单独一条命令** —— `git commit && git push` 链式会静默跳过 push
9. **push 后用 `git ls-remote --heads origin` 复核** —— 别信提示里的「推送成功」
