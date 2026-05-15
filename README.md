# Pawkit

[English](README.en-US.md) | 简体中文

一个轻量的桌面宠物播放器，兼容 Codex Pet 风格宠物包。把喜欢的小宠物放在桌面上，让它安静陪你工作、移动、发呆，并在需要时给一点点可爱的回应。

> 当前版本：`v0.1.0-mvp`
>
> 定位：Codex Pet 兼容桌面宠物播放器

## 为什么做 Pawkit？

很多桌宠产品一开始就会走向复杂养成、复杂设置和强打扰提醒。Pawkit 的 MVP 反过来：先做好一个最轻的体验。

- 启动就能看到宠物。
- 宠物会动，而不是一张静态图片。
- 可以拖到你喜欢的位置。
- 可以替换成你喜欢的宠物外形。
- 重启后记住上次选择。
- 不用复杂设置，也不打断你的工作。

它更像桌面上的一个小陪伴，而不是又一个待办系统。

## 核心能力

### 动态桌面宠物

Pawkit 会在桌面上显示一个透明窗口宠物。宠物基于 spritesheet 播放动画，支持闲置、工作、点击、成功、失败、睡眠、左右移动等状态。

### 兼容 Codex Pet 宠物包

Pawkit 支持常见 Codex Pet 风格资源：

```text
pet.json
spritesheet.webp
```

你可以导入 `.zip` 包，也可以导入已解压目录。

### 自由拖拽与位置记忆

按住宠物即可拖拽。拖动时，宠物会根据当前方向切换左右奔跑动作。松开后，位置会被保存。

如果宠物跑到不方便的位置，也可以通过托盘菜单一键找回。

### 宠物切换与启动记忆

导入多个宠物后，可以从托盘菜单切换。Pawkit 会记住你最后选择的宠物，下次启动自动恢复。

### 轻量状态提示

在点击、移动、工作、失败等状态下，宠物头顶会短暂出现一句小提示。它不会常驻，也不会变成通知弹窗。

## 下载

如果你只是想使用 Pawkit，不需要下载源码。可以在 GitHub Releases 中下载对应系统的安装包：

- macOS：`.dmg` 或 `.zip`
- Windows：`.exe` 安装包或 portable 版本
- Linux：`.AppImage` 或 `.deb`

Release 页面：<https://github.com/zhou-shiliu/pawkit/releases>

> 当前 release 工作流会在推送 `v*` 标签时自动构建三端包，也支持在 GitHub Actions 中手动选择 tag 重新发布。

## 安装与启动

```bash
npm install
npm run dev
```

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

## 使用指南

### 导入宠物

1. 打开系统托盘里的 Pawkit 菜单。
2. 点击 `导入宠物包…`。
3. 选择 `.zip` 宠物包或已解压目录。
4. 导入成功后，Pawkit 会立即切换到新宠物。

导入后的宠物资产会复制到用户数据目录，不会写入仓库。

### 切换宠物

1. 打开托盘菜单。
2. 进入 `切换宠物`。
3. 选择想要的宠物。

下次启动时会自动恢复这个选择。

### 移动宠物

用鼠标按住宠物并拖动。宠物会留在松开的位置。

### 找回宠物

如果宠物位置不方便，从托盘菜单点击：

```text
找回 / 重置位置
```

## 宠物包格式

最小 `pet.json` 示例：

```json
{
  "id": "example-pet",
  "displayName": "Example Pet",
  "description": "A tiny companion.",
  "spritesheetPath": "spritesheet.webp"
}
```

支持的标准动作名包括：

- `idle`
- `waiting`
- `waving` / `wave`
- `jumping` / `jump`
- `failed` / `fail`
- `running` / `run`
- `running-left` / `run left`
- `running-right` / `run right`
- `review`

如果宠物包没有显式声明动画，Pawkit 会按 Codex Pet 常见 atlas 约定补齐默认行映射。

## 当前版本不包含什么？

`v0.1.0-mvp` 专注“宠物播放器”，暂不包含：

- AI 聊天
- 语音互动
- 复杂设置页
- 多屏高级控制
- 公开安装器发布流程
- 复杂养成数值系统
- 默认照料 HUD

早期照料型桌宠探索仍保留在 legacy 代码和历史文档中，但不是当前默认体验。

## 开发验证

```bash
npm test
npm run verify:pet-mvp
npm run verify:pet-dialog
npx tsc --noEmit --project tsconfig.json
npm run build
git diff --check
```

## 项目状态

- 当前版本：`v0.1.0-mvp`
- 主分支：`main`
- MVP 发布说明：`docs/RELEASE-v0.1.0-MVP.md`
- MVP 手工 QA：`docs/PET-MVP-QA.md`
- MVP 架构说明：`docs/PET-MVP-RESET-ARCHITECTURE.md`

## 后续方向

MVP 后的下一步不是立刻加复杂系统，而是先观察真实使用体验：

- 宠物包导入是否顺畅。
- 宠物尺寸是否舒服。
- 头顶提示是否可爱但不打扰。
- 拖拽和位置恢复是否稳定。
- 用户是否希望增加更多内置宠物。

如果这些反馈稳定，再进入 `v0.2.0` 的轻量增强。
