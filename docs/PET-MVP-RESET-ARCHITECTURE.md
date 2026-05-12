# 架构：Pet MVP Reset

## 架构目标

Pet MVP Reset 的架构目标是把 Pawkit 从“照料系统驱动的桌面猫应用”收缩为“宠物资源驱动的桌面宠物播放器”。

新的核心不再是 care loop、presence mode 或验证报告，而是：

```text
pet package -> adapter -> runtime state -> sprite renderer -> desktop shell
```

这意味着 Pawkit 应先成为一个稳定的播放器，再逐步恢复照料、陪伴、任务反馈等增强能力。

## 分层设计

### 1. Desktop Shell

职责：

- 创建透明桌面窗口。
- 控制置顶、显示、隐藏、退出。
- 保存窗口位置。
- 提供托盘菜单。
- 把系统级事件转为运行时事件。

不负责：

- 决定具体播放哪一行动画。
- 理解宠物包内部结构。
- 执行照料数值逻辑。

建议文件：

```text
src/main/windowController.ts
src/main/trayController.ts
src/main/petLibrary.ts
src/main/settingsStore.ts
```

### 2. Pet Library

职责：

- 扫描内置宠物目录。
- 管理用户导入的宠物目录。
- 记录当前激活宠物。
- 返回宠物包路径和基础元信息。

建议目录：

```text
pets/
  builtin/
    pawkit-cat/
      pet.json
      spritesheet.webp
```

用户导入的宠物包应保存在应用数据目录，不直接写入仓库内置目录。

### 3. Codex Pet Adapter

职责：

- 读取 Codex Pet 风格的 `pet.json`。
- 解析 `spritesheet.webp` 元信息。
- 把外部资源格式转换为 Pawkit 内部的 normalized manifest。
- 处理动作别名，例如 `run left`、`runLeft`、`Run Left`。
- 提供缺失动作 fallback。

这一层是兼容边界。未来如果 Codex Pet 资源格式变化，只应该优先修改 adapter，而不是让 renderer 或 behavior controller 跟着变化。

建议文件：

```text
src/shared/pet/codexPetAdapter.ts
src/shared/pet/petManifest.ts
src/shared/pet/validatePetPackage.ts
```

### 4. Pet Runtime

职责：

- 持有当前宠物状态。
- 接收语义事件，例如 `appStarted`、`userActive`、`petClicked`。
- 调用 behavior controller 得到语义状态。
- 调用 adapter 得到具体动画。
- 向 renderer 暴露当前动画、帧率、循环方式和资源路径。

建议文件：

```text
src/shared/pet/petRuntime.ts
src/shared/pet/animationState.ts
src/shared/pet/behaviorController.ts
```

### 5. Sprite Renderer

职责：

- 加载 `spritesheet.webp`。
- 按 normalized manifest 渲染指定动画行和帧。
- 支持循环和一次性动作。
- 暴露 `data-pet-id`、`data-pet-state`、`data-pet-animation` 供验证使用。

不负责：

- 判断用户是否活跃。
- 决定 fallback 策略。
- 管理宠物包导入。

建议文件：

```text
src/renderer/pet/PetStage.tsx
src/renderer/pet/SpriteAnimator.tsx
src/renderer/pet/usePetRuntime.ts
```

### 6. Legacy Modules

旧模块不删除，但必须从 MVP 默认体验中退出：

```text
src/shared/careLoop.js
src/shared/presence.js
src/shared/roaming.js
src/shared/validationMetrics.js
src/renderer/components/StatusBars/
src/renderer/components/MoodText/
```

处理方式：

- MVP 默认不展示照料面板。
- MVP 默认不展示照料气泡。
- presence 的 idle 检测可以作为 `working` / `sleepy` 事件来源保留。
- roaming 可在后续恢复为可选移动模块，不作为首版必须能力。

## 数据流

### 启动流程

```text
Electron start
  -> Desktop Shell creates window
  -> Settings Store reads activePetId
  -> Pet Library resolves pet package
  -> Codex Pet Adapter validates and normalizes package
  -> Pet Runtime emits initial state idle
  -> Renderer loads spritesheet
  -> Sprite Renderer plays Idle fallback chain
```

### 点击流程

```text
User clicks pet
  -> Renderer sends petClicked
  -> Pet Runtime sets semantic state attention
  -> Adapter resolves wave -> jump -> Idle
  -> Sprite Renderer plays one-shot animation
  -> Runtime returns to idle or working
```

### 活跃/闲置流程

```text
System active
  -> Desktop Shell emits userActive
  -> Behavior Controller selects working
  -> Adapter resolves waiting -> Idle

Long inactive
  -> Desktop Shell emits userInactive
  -> Behavior Controller selects sleepy
  -> Adapter resolves waiting -> Idle
```

## Normalized Manifest

Pawkit 内部不直接依赖外部 `pet.json` 的原始形状。adapter 必须输出稳定的 normalized manifest：

```json
{
  "id": "pawkit-cat",
  "name": "Pawkit Cat",
  "version": "1.0.0",
  "sprite": {
    "src": "spritesheet.webp",
    "frameWidth": 192,
    "frameHeight": 208
  },
  "animations": {
    "Idle": {
      "row": 0,
      "frames": 8,
      "fps": 8,
      "loop": true
    },
    "wave": {
      "row": 2,
      "frames": 8,
      "fps": 10,
      "loop": false
    }
  }
}
```

字段说明：

- `id`：稳定宠物 ID。
- `name`：展示名称。
- `sprite.src`：相对宠物包根目录的 spritesheet 路径。
- `sprite.frameWidth` / `sprite.frameHeight`：单帧尺寸。
- `animations`：动作表。key 使用 adapter 规范化后的动作名。
- `row`：spritesheet 中的动画行。
- `frames`：该动作帧数。
- `fps`：播放速度。
- `loop`：是否循环。

## IPC 契约

建议把 IPC 限制在宠物运行器需要的最小集合：

| Channel | Direction | Purpose |
| --- | --- | --- |
| `pet:list` | renderer -> main | 获取可用宠物列表 |
| `pet:get-active` | renderer -> main | 获取当前激活宠物 manifest |
| `pet:set-active` | renderer -> main | 切换当前宠物 |
| `pet:import` | renderer -> main | 导入宠物包 |
| `pet:event` | renderer -> main | 上报 `petClicked` 等事件 |
| `pet:state-updated` | main -> renderer | 推送当前语义状态和动画 |

## 迁移计划

### Step 0: 文档冻结

完成目标、架构、测试规范，并让 README / SPEC 指向 Pet MVP Reset。

### Step 1: 宠物包契约

新增 `pets/builtin/pawkit-cat/`，建立最小宠物包样例。即使首个 spritesheet 是占位资产，也必须走真实宠物包加载路径。

### Step 2: Runtime 与 Adapter

新增 shared pet runtime，先用单元测试证明：

- pet package 可被校验。
- 动作别名可被规范化。
- 缺失动作会 fallback。
- Pawkit 语义状态能映射到具体动画。

### Step 3: Renderer 播放器

用 `PetStage` 和 `SpriteAnimator` 替换默认正面 UI。旧照料 UI 先隐藏，不作为 MVP 默认入口。

### Step 4: Desktop Shell 收缩

拆分当前 `src/main.js` 中的窗口、托盘、状态逻辑。首版只保留宠物播放器所需的 shell 能力。

### Step 5: MVP 验证门禁

新增 `verify:pet-mvp`，验证启动、manifest、fallback、点击反馈和默认 UI 不暴露旧照料系统。

## 架构约束

- Renderer 只能播放 normalized manifest，不能直接读原始 `pet.json` 决策。
- Behavior Controller 输出语义状态，不能输出具体 sprite 行列。
- Adapter 负责兼容和 fallback，不能把格式差异泄漏到 UI。
- Legacy care / validation / roaming 只能作为可选增强，不能成为 Pet MVP 默认依赖。
- 宠物包失败时必须显示最小错误状态，不能白屏。
- 导入宠物包必须先校验，再写入用户宠物库。

## 后续增强

Pet MVP 通过后，可以按顺序恢复：

1. 更自然的桌面移动。
2. 任务状态联动，例如 success / failed / review。
3. 轻量宠物创建 Hatchery。
4. 可选照料模块。
5. 更丰富的设置和资源管理。
