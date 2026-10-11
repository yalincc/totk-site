<!-- AI-CORE-START -->
# AGENTS.md

铁律 1（最高）：**方案未确认前，绝不写/改/删任何文件。** 只做只读调查 → 输出方案 → 等用户确认 → 再动手。
<!-- AI-CORE-END -->

# totk-site · AGENTS 规则地图

> TotK 中文资料库站（Vue 3 + Vite）。**本文件只做路由，不存规则正文** —— 规则一律在 `开发手册.md`。

## 规则地图（找什么 → 读哪个，最多两跳）

| 要做什么 | 读 |
|---|---|
| 接手项目 / 看现状 | `README.md` → `CHANGELOG.md` |
| **项目操作规范（必读）** | **`开发手册.md`（唯一载体，规则正文只在那里改）** |
| 改数据 / 生成 `public/data` | `开发手册.md` §3.1 数据单向派生铁律 |
| 动任一板块 UI | `src/views/*.vue` + `开发手册.md` §4 禁区清单 |
| 了解数据源分工 | `开发手册.md` §0（两站投影关系）+ `E:\WorkSpace\TOTKmap\app\data\` |
| 发布 / 部署 | `开发手册.md` §3.4 |
| 文件命名 | `开发手册.md` §3.2（会被引用的路径一律英文小写） |
| 历史技术方案 | `E:\WorkSpace\BOTWroms\归档\开发计划\` |

## 项目结构速查

```
src/views/     Home 首页 · Compendium 图鉴 · Cooking 料理 · Quests 任务 · ItemDetail 物品详情
src/data.js    数据加载层（loadItems / loadItemsVisible 等）
public/data/   items · dishes · quests · recipes · enhancement —— 派生产物，禁手改
public/icons/  物品图标
```

## 项目红线

- **根目录 md ≤ 10**（当前 4：README / 开发手册 / CHANGELOG / AGENTS）
- **WIP ≤ 2**：同时进行中的方案不超过 2 个
- **`public/data/*.json` 禁手工编辑**，只能由上层工作区脚本派生
- **版本号同步**：commit 格式 `vX.Y: 简述`，且必须同步 `CHANGELOG.md`
- **发布包/解压路径全英文**
- **方案未确认绝不动文件**（铁律 1）
