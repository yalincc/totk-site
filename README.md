# 超级全能互动地图（totk-site）

《塞尔达传说 王国之泪》数据型图鉴站，全站数据由游戏 romfs 直接提取（100% 准确），无后端纯静态。
姊妹项目：TOTKmap 互动地图（`E:\WorkSpace\TOTKmap`，线上 https://totk.yalin.site ）、BOTWmap（botw.yalin.site）。

> **交接说明（给后续开发者/AI）**：大框架和管线已定型，当前处于「细节打磨」阶段。
> 视觉系统为「晨曦海拉鲁」（亮色：象牙米白 + Sheikah 青 + 淡金线饰），**色板与阴影全在 `src/style.css` 的 `:root` 令牌里**，
> 换皮只动令牌、不动结构。别引入组件库，别加后端，别手改 `public/data/*.json`（数据由上层脚本单向派生）。

## 发布状态（截至 2026-10-13）

| 项 | 值 |
|---|---|
| **部署源** | Gitee https://gitee.com/yalincc/totk-site （`gitee/main` = `dce72b0` v0.13.1，**已推**）→ EdgeOne Pages 自动部署 |
| 镜像 | GitHub https://github.com/yalincc/totk-site （`origin/main` 仍在 `a585f64` **v0.8.2**，暂未同步） |
| 本地 | `main` = `dce72b0`，工作树干净；commit 总数 21 |
| tag | 无 |
| **线上部署** | **EdgeOne Pages 项目尚未创建**（部署参数见 `开发手册.md` §3.4）→ 暂无正式域名 |
| 临时分支 | `backup-before-squash`（v0.13.1 历史整理前的旧链备份，确认无误可删） |

> 时间线：GitHub 共 push 9 次（v0.3 → v0.8.2，最后一次 2026-10-12 19:27）；
> 2026-10-13 新建 Gitee 仓库并一次性推送 v0.2 → v0.13.1 全量（**Gitee 成为部署源，GitHub 转为镜像**）。

## 技术栈

Vue 3 + Vite 6 + vue-router 7，无其他运行时依赖。
构建产物：CSS 47.0KB（gzip 8.4）+ JS 161.4KB（gzip 60.3），`dist` 约 85MB（大头是 1766 张 romfs 图标）。

```bash
npm install          # 沙箱环境需加 --ignore-scripts，rollup 原生包单独补装
npm run dev          # localhost:5173（本机调试用 --port 5199）
npm run build        # 产物在 dist/
```

> ⚠️ 本机 E: 盘文件监听会失效（改动不触达 dev server，易误判为"缓存问题"），
> 已在 `vite.config.js` 固定 `server.watch.usePolling: true`。

## 目录结构

```
src/
  views/         Home 首页 / Compendium 图鉴列表 / ItemDetail 物品详情
                 Cooking 料理 / CookingLab 模拟料理 / Quests 任务
                 Armors 装备 / ComingSoon 占位
  lib/           cookingEngine.js 料理规则引擎（前端与回归脚本共用）
                 critRate.js 暴击率与暴击效果池
  data.js        数据加载器（fetch /data/*.json，带缓存）
  mapLink.js     地图互跳 URL（.env 的 VITE_MAP_URL）
public/
  data/          items.json(1511物品) dishes.json(228料理) quests.json(285任务)
                 recipes.json(173配方) enhancement.json(441强化)
                 armors.json(136防具) cooking_lab.json(模拟料理：材料/配方/暴击规则)
  icons/         romfs 官方图标 1766 张（15 个分类子目录）
edgeone.json     EdgeOne Pages 部署配置（SPA fallback + 缓存策略）
```

## 数据管线（改数据看这里）

原始数据在 `E:\WorkSpace\BOTWroms\totk_data\`（romfs 解包产物，**只读，别手改**）：

```
romfs (G:\YUZU\Switch Games\TOTKroms)
  └─ Python 解包管线（zstd 三本词典 + BYML v7 + RSDB）
       └─ totk_data/*.json
            ├─ build_site.py                → public/data/items.json（9份JSON融合）
            ├─ .workbuddy/build_p4_data.js  → public/data/dishes.json + quests.json
            ├─ .workbuddy/build_quests.py   → quests.json（合并 TOTKmap 官方中文名/坐标/图层/攻略）
            └─ .workbuddy/fix_cooking_durations.py → 订正 items/cooking_lab 的 effMin（游戏时长表）
```

- **数据四层纪律**：L0 源（romfs / TOTKmap js / csv，只读）→ L1 抓取层（`totk_data\`）→ L2 加工脚本 → L3 发布层（`public\data\`，**只写不读**）
- 数据脚本在 `E:\WorkSpace\BOTWroms\.workbuddy\` 和 BOTWroms 根目录，重跑即可再生成（订正类脚本默认 dry-run，`--apply` 才落盘并备份）
- items.json 的 `id` = romfs actor 名（如 `Item_Fruit_A`），是全站互链的主键
- dish/quest 图标命名同 actor 名，直接映射 `public/icons/<actor>.png`

## 已完成

- [x] P1 数据管线：物品/料理/装备/强化/任务/掉落 全量 romfs 提取（中文覆盖 95%+）
- [x] P2 图鉴中心：列表+搜索+分类；详情页数值/描述/强化链/配方/掉落
- [x] P3 地图联动：TOTKmap 加深链 `?actor=` 与「查看图鉴」按钮（V1.7.9，老大已并入 V1.9.1）
- [x] P4 料理模块（228 菜谱卡+配方展开+材料互链）、任务模块（285+步骤指引+地区筛选）
- [x] EdgeOne 部署配置（dist 1774 文件/85MB，限内）
- [x] **v0.9～v0.13.1（2026-10-12，全部未 push）——「视觉焕新 + 模拟料理」整轮**
  - v0.9 视觉系统「夜原羊皮」→ v0.10 按老大反馈转清淡「晨曦海拉鲁」（亮色令牌化换肤，半小时完成）
  - 首页 hero（希卡符文环 + 官方图标拼贴 + 数据总览）、统一卡片语言、任务页卡片化、装备页、弹层统一
  - 模拟料理页重设计：材料库点选入锅（同名自动叠 ×N）、锅与结果同栏、圆形材料槽 + 四角符文装饰、产物大图 + 四项数据竖排
  - 料理规则引擎按攻略校正：**效果等级改点数阈值制**（攻击/防御/速度 1/5/7 …）、时长规则（效果材料不衰减 / 中性材料同名递减 / 龙素材按部位加时、龙角锁 30 分钟）
  - 新增 `critRate.js` 暴击系统（5%×材料种类数 + 材料加成只取最高 + 血月 100%）；暴击率可视化不再做随机模拟
  - **修 3 个存量 bug**：深层路由相对路径 404（详情页白屏根因）、装备页强化材料表 `v-for`+`v-if` 崩溃、静态 `src` 被 Vite 编译成 import
  - **修 2 个机制 bug**：效果时长失真（引擎缺「同名递减」+ 数据 effMin 量级错，订正 1607 条）、龙素材被当普通配料参与产物匹配（导致加龙素材即掉「怪物料理」）

## 待打磨（优先级序）

1. **模拟料理 · 通用产物层缺口（已知最大问题）**：引擎第 3 层 `genericDish()` 实际是死代码
   （读 `m.tag` 而数据只有 `tags[]`，通用规则表仅 4 条 actor 槽规则），判定只靠 158 条固定配方撑着 ——
   实测 250 种单材料里 **146 种（58%）**落「怪物料理」，「香蕉×2 + 蔗糖/禽蛋/黄油」也失败。
   修法需补 romfs 完整 Recipe 表或新增通用产物规则，**属数据层改造，动手前需先出方案**
2. **料理页**：按效果类型分组筛选（心心/攻击/防御/移动速度…bonus 字段挖掘）；英文名排版
3. **任务页**：region 映射表补全（`build_p4_data.js` 的 `REGION_ZH`，现在约 60 条，未映射的显示内部 id）；任务详情页独立路由
4. **图鉴页**：分类 tab 吸顶；物品详情页强化材料可点跳转
5. **搜索**：全局搜索聚合（图鉴+料理+任务一次搜）
6. **模拟料理增量**：「按效果找配方」目标导向模式（选效果+等级 → 列可行组合，数据侧已支持）

## 待办

- [ ] **P5 部署（进行中）**：Gitee 仓库已建并推送 ✅ → 待 EdgeOne Pages 建项目（`main` / 构建 `npm run build` / 输出 `dist` / **加速区域选"不含中国大陆"**，参数见 `开发手册.md` §3.4）→ 拿到正式域名
- [ ] **域名回填**：TOTKmap 仓库 `index.html` 的 `window.TOTK_COMPENDIUM_URL` 改为本站域名（地图卡片「查看图鉴」才指向线上）
- [ ] **GitHub 镜像同步**：`origin/main` 仍停在 v0.8.2，需要时 `git push origin main` 补齐
- [ ] PWA（manifest + service worker，离线缓存 data/icons）

## 已知悬留

- dish_names 中 32 个 MiniGame 类任务、部分复合菜名靠外部源合并（52pk/zeldawiki 通道记录在 BOTWroms 工作日志）
- ItemDetail 的地图按钮用 `VITE_MAP_URL` 深链，TOTKmap 材料层只覆盖 133 种材料，非材料物品跳过去无定位（TOTKmap 侧 toast 提示）
- 模拟料理数据缺口：TotK 的「高级/中级怪物素材」（游戏内按怪物部位分档，非单一道具）与「尖刺碎片」未进 `cooking_lab.json`，
  补数据时往 `critRate.js` 的 `CRIT_*` 集合加 id 即可

## 数据来源声明

全站数据与图标提取自《塞尔达传说 王国之泪》游戏 romfs，版权归任天堂所有。非官方粉丝站点，不作商业用途。
