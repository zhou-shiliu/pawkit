# Pet MVP 闭环计划

## 一句话目标

把 Pawkit 本次 MVP 收口为一个普通用户可以直接试用的 **Codex Pet 兼容桌面宠物陪伴应用**：启动能看到宠物，宠物会动，能拖动，能点击反馈，能导入和切换宠物包，托盘只保留 MVP 所需操作。

## 本次闭环不漂移规则

本次实现只允许围绕以下四件事展开：

1. 宠物动作状态是否更鲜活。
2. 宠物包是否能导入、校验、切换。
3. 桌面宠物是否能显示、隐藏、拖动、找回、退出。
4. 默认体验是否脱离旧 care UI。

明确不做：

- 不做 Food / Water / Play / Trust 默认界面。
- 不做复杂设置页。
- 不做音效、语音、AI 聊天。
- 不做复杂多屏策略或跨屏漫游。
- 不做公开发布打包准备。
- 不做宠物生成器。
- 不恢复旧 M1/M2/M3 care 作为默认体验。

## 必须完成的能力

### 1. 动作状态闭环

用现有 Codex Pet 动作行呈现用户能理解的状态：

| 触发 | Pawkit 语义状态 | 首选动画 |
| --- | --- | --- |
| 启动 / 静止 | `idle` | `idle` |
| 点击宠物 | `attention` | `waving` |
| 双击 / 强互动 | `success` | `jumping` |
| 向左拖动 | `movingLeft` | `running-left` |
| 向右拖动 | `movingRight` | `running-right` |
| 拖动结束 | `idle` | `idle` |
| 宠物包加载失败 | `failed` | `failed` |
| 无可用宠物包 / 等待导入 | `sleepy` | `waiting` |
| 后续任务观察态 | `working` | `review` 或 `running` fallback |

约束：动作缺失必须 fallback，不能白屏或崩溃。

### 2. 宠物库闭环

- 支持扫描内置宠物目录 `pets/builtin`。
- 支持扫描用户导入目录。
- 支持扫描本地开发社区目录 `pets/community`，仅用于开发验证。
- 支持从 zip 或目录导入 Codex Pet 风格宠物包。
- 导入后写入用户数据目录，不写入仓库。
- 导入成功后可以设为当前宠物。
- 导入失败保留当前宠物并返回明确错误。

### 3. 托盘菜单闭环

默认托盘必须从旧 care 菜单收缩为 Pet MVP 菜单：

- 当前宠物名称。
- 显示宠物。
- 隐藏宠物。
- 找回 / 重置位置。
- 导入宠物包。
- 切换宠物。
- 退出。

托盘不再默认展示：

- Food / Water / Play / Trust。
- 模式控制。
- 闲置阈值。
- 验证报告。

### 4. 位置闭环

- 用户可以鼠标拖动宠物。
- 拖动位置保存到 `pet.placement`。
- 重启恢复位置。
- 位置超出当前显示器时 clamp 回可见区域。
- 托盘可以找回宠物。

### 5. 空状态和失败态闭环

- 没有任何宠物包时，不允许空白或旧 UI 回退。
- 宠物包损坏时，显示可读错误。
- 若 manifest 可解析但动画缺失，显示 fallback 或错误态。

## 验证门禁

本次闭环完成必须通过：

```bash
npm test
npm run verify:pet-mvp
npx tsc --noEmit --project tsconfig.json
npm run build
git diff --check
```

并补充自动化验证：

- 拖动方向能触发 `running-left` / `running-right`。
- 拖动结束回到 `idle`。
- 托盘默认菜单不再包含旧 care 项。
- 宠物库至少能列出当前可用宠物。
- 导入合法 zip 后可切换为 active pet。

## 完成定义

满足以下条件才算本次 MVP 闭环完成：

1. `npm run dev` 启动后默认看到 Pet MVP，而不是旧猫 UI。
2. 宠物可以点击、拖动，并按方向切换动作。
3. 托盘只呈现 Pet MVP 操作。
4. 用户能导入和切换宠物包。
5. 没有宠物或宠物损坏时有明确提示。
6. README 与本计划目标一致。
7. 所有验证门禁通过。
