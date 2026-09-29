# 超级全能互动地图（totk-site）

《塞尔达传说 王国之泪》数据型图鉴站，全站数据由游戏 romfs 直接提取（100% 准确），无后端纯静态。
姊妹项目：TOTKmap 互动地图（`E:\WorkSpace\TOTKmap`，线上 https://totk.yalin.site ）、BOTWmap（botw.yalin.site）。

> **交接说明（给后续开发者/AI）**：大框架和管线已定型，当前处于「细节打磨」阶段。
> 改 UI 请保持「明亮白净风」（色板见 `src/style.css` 的 `:root` 变量），别引入组件库，别加后端。

## 技术栈

Vue 3 + Vite 6 + vue-router 7，无其他运行时依赖。构建产物 gzip 约 43KB。

```bash
npm install          # 沙箱环境需加 --ignore-scripts，rollup 原生包单独补装
npm run dev          # localhost:5173
npm run build        # 产物在 dist/
```

## 目录结构

```
src/
  views/         Home 首页 / Compendium 图鉴列表 / ItemDetail 物品详情
                 / Cooking 料理 / Quests 任务 / ComingSoon 占位
  data.js        数据加载器（fetch /data/*.json，带缓存）
  mapLink.js     地图互跳 URL（.env 的 VITE_MAP_URL）
  router.js      路由
public/
  data/          items.json(1755物品) dishes.json(228料理) quests.json(285任务)
                 recipes.json(173配方) enhancement.json(441强化)
  icons/         官方图标 244 张（romfs 提取）
edgeone.json     EdgeOne Pages 部署配置（SPA fallback + 缓存策略）
```

## 数据管线（改数据看这里）

原始数据在 `E:\WorkSpace\BOTWroms\totk_data\`（romfs 解包产物，**只读，别手改**）：

```
romfs (G:\YUZU\Switch Games\TOTKroms)
  └─ Python 解包管线（zstd 三本词典 + BYML v7 + RSDB）
       └─ totk_data/*.json
            ├─ build_site.py    → public/data/items.json（9份JSON融合）
            └─ .workbuddy/build_p4_data.js → public/data/dishes.json + quests.json
```

- 数据脚本在 `E:\WorkSpace\BOTWroms\.workbuddy\` 和 BOTWroms 根目录，重跑即可再生成
- items.json 的 `id` = romfs actor 名（如 `Item_Fruit_A`），是全站互链的主键
- dish/quest 图标命名同 actor 名，直接映射 `public/icons/<actor>.png`

## 已完成

- [x] P1 数据管线：物品/料理/装备/强化/任务/掉落 全量 romfs 提取（中文覆盖 95%+）
- [x] P2 图鉴中心：列表+搜索+分类；详情页数值/描述/强化链/配方/掉落
- [x] P3 地图联动：TOTKmap 加深链 `?actor=` 与「查看图鉴」按钮（V1.7.9，老大已并入 V1.9.1）
- [x] P4 料理模块（228 菜谱卡+配方展开+材料互链）、任务模块（285+步骤指引+地区筛选）
- [x] EdgeOne 部署配置（dist 1774 文件/85MB，限内）

## 待打磨（优先级序）

1. **视觉细节**：料理/任务页卡片密度、间距、hover 效果；详情页信息层级
2. **料理页**：按效果类型分组筛选（心心/攻击/防御/移动速度…bonus 字段挖掘）；英文名排版
3. **任务页**：region 映射表补全（`build_p4_data.js` 的 `REGION_ZH`，现在约 60 条，未映射的显示内部 id）；任务详情页独立路由
4. **图鉴页**：分类 tab 吸顶；物品详情页强化材料可点跳转
5. **搜索**：全局搜索聚合（图鉴+料理+任务一次搜）

## 待办

- [ ] **P5 部署**：EdgeOne Pages 建项目（构建命令 `npm run build`，输出 `dist`）→ 拿到正式域名
- [ ] **域名回填**：TOTKmap 仓库 `index.html` 的 `window.TOTK_COMPENDIUM_URL` 改为图鉴站域名（地图卡片「查看图鉴」才指向线上）
- [ ] PWA（manifest + service worker，离线缓存 data/icons）

## 已知悬留

- dish_names 中 32 个 MiniGame 类任务、部分复合菜名靠外部源合并（52pk/zeldawiki 通道记录在 BOTWroms 工作日志）
- ItemDetail 的地图按钮用 `VITE_MAP_URL` 深链，TOTKmap 材料层只覆盖 133 种材料，非材料物品跳过去无定位（TOTKmap 侧 toast 提示）

## 数据来源声明

全站数据与图标提取自《塞尔达传说 王国之泪》游戏 romfs，版权归任天堂所有。非官方粉丝站点，不作商业用途。
