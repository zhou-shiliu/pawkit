# Pawkit

Pawkit 是一个 **Codex Pet 兼容桌面宠物播放器**。当前版本已经收缩为 v0.1.0 MVP：先把“启动就能看到一个动态、可替换、低打扰的桌面宠物”这件事做完整，而不是继续扩展旧照料系统。

> 当前 MVP 定义：能启动、能动、能拖、能导入/切换宠物、能记住选择，并保持轻量存在感。

## 当前 MVP 能力

- 启动 Electron 后显示桌面宠物。
- 内置原创占位宠物 `Pawkit Sprout`，没有外部资产也能运行。
- 兼容 Codex Pet 风格宠物包：`pet.json + spritesheet.webp`。
- 支持从托盘导入 `.zip` 宠物包或已解压目录。
- 支持从托盘切换宠物包。
- 记住上次选择的宠物，重启后自动恢复。
- 支持鼠标拖拽宠物到屏幕任意位置。
- 拖拽时根据即时移动方向展示 `running-left` / `running-right`。
- 支持位置保存与“找回 / 重置位置”。
- 支持轻量状态动作映射：
  - app started → `idle`
  - user active → `working`
  - click pet → `attention / waving`
  - task success → `success`
  - task failed → `failed`
  - long inactive → `sleepy`
  - drag left/right → `movingLeft / movingRight`
- 支持短暂头顶状态提示，让宠物有轻微反馈但不常驻打扰。
- 默认托盘只保留 MVP 必需操作：显示、隐藏、找回/重置位置、导入、切换、退出。

## 不在当前 MVP 范围内

以下能力暂时保留为历史探索或后续版本素材，不进入 v0.1.0 默认体验：

- 复杂照料面板
- Food / Water / Play / Trust 默认 HUD
- 复杂设置页
- AI 聊天
- 语音 / 音频互动
- 多屏高级策略
- 公开发布准备流程
- 大规模动画系统重构

旧照料界面仍可通过 legacy 预览查看，但不是当前 MVP 主入口。

## 快速开始

```bash
npm install
npm run dev
```

`npm run dev` 会启动 Vite 渲染进程和 Electron 桌面宠物窗口。

生产模式本地启动：

```bash
npm start
```

仅网页预览：

```bash
npm run dev:web
```

旧照料界面预览：

```bash
npm run dev:legacy
```

## 使用方式

### 拖拽宠物

用鼠标按住宠物并移动即可拖拽。宠物会根据当前移动方向切换左右奔跑动作。

### 点击宠物

单击宠物会触发轻量关注反馈。

### 双击宠物

双击宠物会触发成功反馈动作。

### 导入宠物包

从系统托盘菜单选择：

```text
导入宠物包…
```

支持两种导入方式：

- 选择 `.zip` 宠物包
- 选择已解压的宠物目录

导入后的宠物资产会复制到用户数据目录，不写入仓库。

### 切换宠物

从系统托盘菜单选择：

```text
切换宠物
```

选择后会立即生效，并在下次启动时恢复该宠物。

### 找回宠物

如果宠物被拖到不方便的位置，可以从托盘选择：

```text
找回 / 重置位置
```

## 宠物包格式

当前 MVP 兼容 Codex Pet 风格资源。一个最小宠物包应包含：

```text
pet.json
spritesheet.webp
```

示例 `pet.json`：

```json
{
  "id": "example-pet",
  "displayName": "Example Pet",
  "description": "A tiny companion.",
  "spritesheetPath": "spritesheet.webp"
}
```

如果宠物包没有显式声明动画，Pawkit 会按 Codex Pet 常见 atlas 约定补齐默认行映射。支持的标准动作名包括：

- `idle`
- `waiting`
- `waving` / `wave`
- `jumping` / `jump`
- `failed` / `fail`
- `running` / `run`
- `running-left` / `run left`
- `running-right` / `run right`
- `review`

## 验证命令

MVP 收口建议至少运行：

```bash
npm test
npm run verify:pet-mvp
npm run verify:pet-dialog
npx tsc --noEmit --project tsconfig.json
npm run build
```

完整本地检查可补充：

```bash
git diff --check
```

## 当前发版候选

- 目标版本：`v0.1.0-mvp`
- 候选分支：`codex/pet-mvp-reset-runtime`
- 主线合并建议：文档与 QA 收口完成后合并到 `main`
- 发布说明：`docs/RELEASE-v0.1.0-MVP.md`
- 手工 QA：`docs/PET-MVP-QA.md`

## 关键文档

- MVP 目标：`docs/PET-MVP-RESET-GOAL.md`
- MVP 架构：`docs/PET-MVP-RESET-ARCHITECTURE.md`
- MVP 测试规范：`docs/PET-MVP-RESET-TEST-SPEC.md`
- MVP 闭环计划：`docs/PET-MVP-CLOSURE-PLAN.md`
- MVP 手工 QA：`docs/PET-MVP-QA.md`
- v0.1.0 发布说明：`docs/RELEASE-v0.1.0-MVP.md`

## 历史说明

Pawkit 早期做过 M1/M2/M3 照料型桌面猫探索，包括漫游、照料状态、双模式存在感、视觉生命感升级等。Reset 后，这些内容不再作为 MVP 默认体验中心，但相关文档仍保留在 `docs/` 中，作为后续设计素材。
