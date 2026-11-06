# WORD​BOUND / 言契之城

中文引导的英语学习文字 ARPG。第一章包含雾港冷链、潮汐泵站与商务协商三份可重玩的调查，30 条语境词契。移动端优先，可安装、离线游玩。

## 游玩

选择路线 → 阅读调查线索 → 用攻击、防守和分析修复契约。每次行动后，敌人在 1.8 秒后出招，再等待下一次决策。重击前防守能减伤 75%，恢复生命与能量；分析需要 2 能量。三个语言契印全部解读后才能完成战斗，答错仍能造成较少伤害。

英文题、反馈、词典、说明以及离开冒险页或浏览器标签期间暂停。反馈由玩家确认后才继续。失败可重试，保留学习记录。每份任务首次完成奖励 100 XP 和一件功能装备；重玩不重复发奖。装备在下次调查生效。

「发现 / 独立识别 / 语境应用」与通关分开记录。提示或题目中查词算辅助练习，不增加独立掌握。词契手记可复习全部 30 个例句，保留错误次数。不提供 IELTS 分数预测。

## 本地开发与验证

推荐 Node.js 24 LTS。

```sh
npm ci
npm run dev
npm test
npm run typecheck
npm run build
npm run preview
```

开发地址与生产预览均使用 `/wordbound/` 前缀。浏览器端回归运行生产构建，覆盖移动端 390×844 与桌面：

```sh
npx playwright install chromium
npm run build
npm run test:e2e
```

Playwright 自动启动预览服务。可通过 `PLAYWRIGHT_OUTPUT_DIR` 指定测试产物目录；默认 `test-results/`（不入库）。

## 架构与数据范围

- `src/content.ts`：中文剧情、英文题目、词契及稳定答案 ID。
- `src/game.ts`：纯规则与状态转换；`src/persistence.ts`：版本化本地存档。
- `src/main.tsx`、`src/style.css`：响应式界面、暂停生命周期、学习手记。
- `vite.config.ts`、`public/`：PWA 预缓存、离线资源与本地图标。无远程字体或 CDN。
- `src/game.test.ts`、`tests/journey.spec.ts`：规则与端到端回归。

所有进度（含题目、词块草稿、提示和反馈）保存在本浏览器 `localStorage` 的 `wordbound-save-v1`。无后端、账号、分析追踪或云同步。清除站点数据会丢失进度；设置中重置需要确认。存储失败会显示提示。离线状态仅在 Service Worker 完成安装缓存后显示就绪；更新不强制刷新正在进行的战斗，关闭所有应用标签后再次打开即可应用。

## GitHub Pages 发布

目标：<https://alannotnerd.github.io/wordbound/>。项目的 Vite base、manifest start URL / scope 和 Service Worker 都位于 `/wordbound/`。导航使用 hash，无需服务端路由重写。

仓库所有者在 GitHub **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**，然后推送 `main` 或手动运行 workflow。`.github/workflows/pages.yml` 使用官方 Pages actions，先 `npm ci`、规则测试和生产构建，再上传与部署 `dist`。本地实现不创建远程、不推送、不触发部署。

参考：[Vite 静态发布](https://vite.dev/guide/static-deploy)、[GitHub Pages 自定义工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。
