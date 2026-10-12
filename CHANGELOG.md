# CHANGELOG

> 只追加，不改写历史条目。格式参考 Keep a Changelog，版本号遵循 SemVer `v0.X.Y`。
> 发布规则与版本同步要求见 `开发手册.md` §3.3。

## [v0.9] — 2026-10-12

**L1 视觉焕新：「夜原羊皮 Parchment of the Wild」视觉系统（纯前端，数据零改动）**

- **`src/style.css` 全量重设计**：暗夜羊皮纸色板（暖黑底 `#17140e` + 暖棕卡面 + 纸色文字）＋ 海拉鲁金 `#d4af37` 主强调 ＋ Sheikah 荧绿 `#4fd1a5` 链接色；卡片统一「做旧描边 + 内联 SVG 纸纹（feTurbulence，零请求）+ 暗底投影」；导航选中态金色、hover 统一金边上浮；新增 `.kv-row`（图标+名+关键属性一行）/ `.page-head` / `.hero` / `.stat-strip` / `.feat-grid` 组件类
- **首页 hero 区**（原为"标题+搜索框+数字格"素排版）：
  - 夜空渐变 + 星点层 + **中央希卡符文环**（纯 SVG：双圆 + 12 刻度 + 符文眼，刻度坐标在 script 计算避免模板复杂表达式）
  - **官方 romfs 美术图标拼贴**：大师之剑核心水印 + 12 枚漂浮图标（究极手/左脑乌能源/魔王之弓/白龙鳞片/红宝石头饰…全部取自 `public/icons/`，`floaty` 浮动动画 + `prefers-reduced-motion` 降级）
  - 金色渐变主标题 + 数据总览条（1441 图鉴 / 173 配方 / 285 任务 / 136 防具 / 1537 图标）+ 分类入口 + 四张特色板块大卡（含互动地图外链卡）
- **统一卡片语言**：图鉴列表每格补关键属性行（武器→攻击 / 防具→防御 / 食物→回复心心或效果 / 其余→价格）；详情页头图区重排（大图标 + 金色渐显微光 + 金/橙/灰 chips），所有 section 标题金色化，地图 CTA 改为金边渐变按钮
- **任务页卡片化**：左侧图层色条（天空荧绿 / 地表金 / 地底橙红）+ 中文名 + 分类/地区/委托人/图层/步数 chips + 右侧箭头；`zh === id` 的假覆盖识别为「暂无中文译名」（副标显示内部 id）；**展示层排序**：有官方中文名的优先、其余按分类难度序（纯前端 sort，不动数据）
- **弹层统一暗底羊皮纸风**（任务 / 装备 / 料理三处）：遮罩 `rgba(8,6,3,.66)` + backdrop-blur，卡面加顶部金色光晕
- **修复 3 个存量 bug**（对 k 用户可见）：
  1. **深层路由下相对路径 404**（详情页白屏根因）：`/items/:id` 两层路径下 `fetch('data/x.json')` 与 `'icons/x'` 被解析成 `/items/data/…` → 全站改站根绝对路径（`/data/`、`/icons/`，共 13 处）
  2. **Armors.vue 强化材料表 `v-for`+`v-if` 同元素**（Vue 3 下 `m.itemId` 读取 undefined 抛错）→ 改 `<template v-for>` 包裹 + `v-if/v-else`
  3. 首页/详情页对不存在 id 的空白兜底（详情页现正确显示"未找到该条目"）
- 新增品牌 favicon（内联 SVG 金色菱形，零请求）
- 移动端：hero 图标自动减半降透明避让文字；导航横滑、卡片单列、网格列宽收缩全部复核
- 构建产物：CSS 39.2KB（gzip 7.2KB）+ JS 151.7KB（gzip 56.5KB），45 modules，3.08s
- 验收：playwright-core + 本机 Chrome 全页截图 7 页 × 桌面/移动 + 3 处弹层特写，console/pageerror/HTTP≥400 零残留



**P3 模拟料理（Cooking Lab）**
- 新增 `/cooking-lab` 模拟料理页（对齐 zelda-wiki.fun 的交互形态）：三栏布局 —— 食材库（搜索 + 10 类 tab + 点击下锅）/ 锅（5 格、点击移除、同名叠加）/ 结果卡（产物、回复心数、效果强度与抵消提示、时长、卖出价、大成功标注、判定路径徽章、收藏配方 localStorage、图鉴与料理页深链）
- **规则引擎 `src/lib/cookingEngine.js`**（纯函数，前端与回归脚本共用同一实现）：
  - 判定顺序：单料特化（炒暖暖草果/原烧/炖番茄）→ 158 条 romfs 固定配方（槽位子集分配 + 材料全消费约束 + 具体度优先排序）→ 药剂（虫+怪，效果取昆虫）→ 通用组合 → 失败（奇异的菜肴）
  - 效果聚合：回血 = Σ材料 hp ×2；两种效果抵消只回血；等级 ΣeffLv 分档；时长 ΣeffMin，龙素材 30 分钟封顶；卖出价 = Σsell × 数量倍率 1.2~1.8
- 新增数据件 `cooking_lab.json`（270KB，`build_cooking_lab.py` 派生）：材料 332（含 tag 归类与效果字段）+ 固定配方 158 + 通用规则 + 药剂映射 13 种 + 特殊表（龙素材 29 / 必定大成功 2）
- **回归验证 446/446 = 100%**（`verify_cooking_lab.mjs`）：对照图鉴 228 道锅煮菜的判定（143 固定 + 4 通用 + 13 药剂 + 68 火烤冰冻排除），穷举代表组合 / 变体 / 加料
- 关键修复（均在回归中暴露）：
  - id 双体系归一化：romfs tag 表混用物品 id（Item_FishGet_Z）与掉落物 actor id（Animal_Fish_A），以 TOTKmap `materials.js` 的 entry↔actors 映射归一（快照加第 5 份）
  - 槽位语义：每槽消费一个**非空子集**（蘑菇×3 → 烤蘑菇串），且全部材料必须被消费（蘑菇+肉不得命中烤蘑菇串）
  - 具体度优先：全 actor 槽菜先于 tag 大类菜（4 只蟹不得被"大份烤鱼"抢注）
  - 万能药剂条目 `Item_Cook_C_17`（result_zh=null）命中后按效果细分为 13 种秘药
- 快照链扩展：`dump_totkmap.js` 5 份快照（tasks/plan/armors/armor-upgrade/materials）
- 火烤（Roast）/冰冻（Chilled）/水煮（Boiled）共 68 条产物不在锅煮模拟范围（另一套机制），页面暂不支持

## [v0.7] — 2026-10-12

**P2 装备板块（TOTKmap 单向派生）**
- 新增 `armors.json`（152KB）：136 件防具，含套装 67 组 / 部位 / 防御 / 买卖价 / 获取方式（135）/ 关联任务（17）/ 可地图定位（135）
- 强化阶梯 136/136 覆盖（104 可强化 + 32 不可强化）：四星费用与材料齐全；
  **886/923 材料经 zh→itemId 反查可点击直达图鉴**（37 个无中文名材料显示占位）
- 依赖方向记录：armor-upgrade.js 的上游是站点 items/enhancement（TOTKmap 侧生成），强化材料线站点是源头
- 前端新增 `/armors` 装备页（`Armors.vue`）：部位筛选 + 搜索，详情弹层含强化阶梯表 / 套装成员互跳 / 关联任务跳任务页 / 图鉴深链；导航与首页加"装备"入口
- 桥接脚本泛化：`dump_totkmap_quests.js` → `dump_totkmap.js`（4 份快照统一管理，mtime 过期）
- 修复存量 bug：首页 `{{ recipes }}` 引用未定义变量（脚本叫 recipeCount），配方数一直显示空白
- `.gitignore` 白名单补 `!.workbuddy/*.js`（此前 js 管线脚本不入库）

## [未发布]

**数据管线四层重构（无站点行为变化）**
- 建立四层数据纪律：L0 源层（romfs/TOTKmap/csv，只读）→ L1 抓取层（`totk_data\`，原始形态）→ L2 加工脚本 → L3 发布层（`public\data\`，只写不读）
- 修复三处"源=产物"污染：`postprocess_items.py` 不再读发布层（改读 L1 `items_prelim/recipes_prelim/dishes_zh`）；`build_quests.py` 站点侧输入改为 L1 `quests_legacy.json`（从 v1 原始版提取）；`build_site_data.py` 输出改 L1 prelim，不再直写发布层
- TOTKmap 快照从 tmp 移正至 `totk_data\totkmap\`，新增 mtime 过期机制（上游更新后自动重 dump，不再静默用旧数据）
- 新增一次性迁移脚本 `migrate_l1.py`（幂等，可重复执行）
- 验证：全链路重跑后 quests/items/enhancement 与重构前**语义完全一致**（285/1511/441 条零差异）

## [v0.6] — 2026-10-12

**P1 任务数据补强（TOTKmap 单向派生）**
- 新增同步管线（只读 TOTKmap，产物只写 `quests.json`）：
  - `.workbuddy/dump_totkmap_quests.js`：把 TOTKmap 的 JS 字面量转成 JSON 快照
  - `.workbuddy/build_quests.py`：合并 tasks.js + task-plan.js + 站点旧数据 → `public/data/quests.json`（默认 dry-run，`--apply` 落盘并自动备份旧文件）
- `quests.json` v2 字段：新增 `cat` 类型 / `layer` 图层 / `npcCn` 委托人中文 / `pos` 坐标 / `guide` 攻略 / `reqs`·`unlocks` 任务链；`steps` 改存 TOTKmap 攻略步骤（带坐标），站点原有步骤文本另存 `flow`，两套口径并存
- 覆盖提升：攻略步骤 81 → 262、分类 0 → 285（迷你挑战 139 / 情节挑战 60 / 神庙挑战 31 / 主剧情 23 / 迷你游戏 18 / 重要支线 6 / 其他 8）、地区中文 196 → 284（116 个地区值中仅 1 个未翻译）、攻略 0 → 253、可点击任务链 278 条、可地图定位 260 条
- 任务页重构（`Quests.vue`）：类型 + 图层 + 地区三层筛选（地区改为下拉列全部 116 个，不再只显示 Top 14），筛选状态写入 URL；详情改为弹层（ESC / ← → 翻页 / 点遮罩关闭），分区展示任务流程、攻略步骤（带坐标）、完成文本、攻略要点、前置后续（可点击跳转）
- 数据体积 106KB → 386KB（旧文件自动备份为 `quests.json.bak`）

## [v0.5] — 2026-10-12

**建立项目规范三件套**
- `AGENTS.md`：规则地图，只做路由不存正文 + 项目红线
- `开发手册.md`：操作规范唯一载体（五分类搬家规则 / 阶段门 SOP / 数据单向派生铁律 / 禁区清单）
- `CHANGELOG.md`：补记 v0.2~v0.4 历史记录

## [v0.4] — 2026-09-30

**料理板块交互重构**
- 料理详情从「列表底部渲染」改为 Teleport 到 body 的模态层，点卡片即弹出，无需再滚到页底
- 支持 ESC / 点遮罩 / × 三种关闭方式，顶部 `‹ n / 228 ›` 可左右切换上一道、下一道
- 移动端弹层改为底部抽屉（上圆角 16px，88vh），桌面端保持居中卡片
- 打开时锁 body 滚动，组件卸载恢复，避免遮罩残留
- 无配方的 81 道菜在卡片右上角加「自由组合」角标，列表可直接区分

## [v0.3] — 2026-09-30

**数据清洗 + 列表解除截断 + 移动端适配**
- 新增 `.workbuddy/postprocess_items.py`（默认 dry-run，`--apply` 才落盘）：先回填后过滤，并保护被配方引用的 id
  - 移除 244 条空壳（未发布 actor / `_Bundle` 打包件 / 料理变体 / 防具染色件 / 冰冻鱼变体等）
  - 图鉴 1755 → 1511 条，无中文名 462 → 70
- 图鉴列表去掉 `slice(0, 600)` 硬截断，改为 IntersectionObserver 分批加载（每批 120 条）+「已显示 X / 共 Y」计数
- 全站补 `@media (max-width: 720px)` 断点（此前为 0 条）：header 换行、导航横滑、网格列宽收缩、详情页数值网格改单列

## [v0.2] — 2026-09-30

**首个可用版本**
- 四模块上线：图鉴 / 料理 / 任务 / 物品详情，并与地图站联动
- 静态数据管线落成：`items.json` `dishes.json` `quests.json` `recipes.json` `enhancement.json`
- EdgeOne 部署配置（`edgeone.json`）
- 建立 GitHub 公开仓库 https://github.com/yalincc/totk-site

---

## 治理记录（非版本）

### 2026-10-12 · 项目文件治理与规范建立
- 上层工作区 `BOTWroms` 建立 git 仓库并配套严格 `.gitignore`，根目录 17 个文件按五分类收敛到 6 个
- 本项目新增 `AGENTS.md` + `开发手册.md` + 本文件，确立数据单向派生铁律与五分类搬家规则
- 明确两站分工：TOTKmap 答「在哪里」，本站答「是什么 + 怎么做」（详见 `开发手册.md` §0）
