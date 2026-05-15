# 架构：Pet MVP Reset

## 架构目标

Pet MVP Reset 的架构目标是把 Pawkit 从“照料系统驱动的桌面猫应用”收缩为“宠物资源驱动的桌面宠物陪伴应用”。

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
- 对 Codex 官方固定 atlas 契约提供默认动画行，不要求社区包在 `pet.json` 里重复声明动画表。

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

### 6. Placement Controller

职责：

- 持有宠物在桌面上的物理位置。
- 保存和恢复窗口 bounds。
- 把鼠标拖拽转换为桌面坐标更新。
- 根据当前显示器 work area 对位置进行 clamp。
- 处理显示器增加、移除、缩放变化和主显示器变化。
- 处理 macOS Spaces / Mission Control 场景下的可见性策略。
- 为宠物、阴影、气泡和提示卡片计算统一 overlay bounds。

不负责：

- 播放具体动画。
- 解析宠物包。
- 决定语义状态。

建议文件：

```text
src/main/placementController.ts
src/shared/pet/placement.ts
src/renderer/pet/usePetPointer.ts
```

### 7. Legacy Modules

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

## 位置与桌面显示契约

OpenAI Codex Pet 的公开 issue 暴露了几类值得 Pawkit 提前规避的问题：靠近屏幕边缘时 sprite 或气泡被裁切、overlay 窗口 bounds 固定导致提示卡片被裁掉、多显示器移动后宠物或气泡留在旧显示器、保存的 overlay bounds 失效后宠物不可见。

Pawkit 的 Placement Controller 必须把这些问题作为一等约束处理。

### 坐标模型

- 内部统一使用 Electron 的 DIP 坐标，不直接混用物理像素和 CSS 像素。
- 保存位置时同时保存：
  - `displayId`
  - `anchor`
  - `x`
  - `y`
  - `width`
  - `height`
  - `scaleFactor`
- 恢复位置时先校验 display 是否仍存在；不存在时回到主显示器默认位置。
- 任何保存位置都必须经过 `clampToWorkArea` 后才能应用到窗口。

### Overlay Bounds

Overlay bounds 不应只是 sprite 的尺寸。它必须能包住：

- 当前宠物帧。
- 透明边距和阴影。
- 点击/拖拽热区。
- 可能出现的气泡或状态提示。

首版可以先不做复杂气泡，但 bounds 计算必须为气泡预留扩展策略。避免出现“宠物可见，但气泡被窗口边界裁掉”的情况。

### 鼠标控制

首版交互分为两种：

- 单击：触发 `attention`。
- 拖拽：移动宠物位置。

拖拽需要满足：

- 有最小位移阈值，避免点击被误判为拖拽。
- 拖拽中暂停自动位移动画。
- 拖拽结束后持久化位置。
- 拖拽结束位置必须被 clamp 到当前显示器 work area。
- 如果当前窗口是 click-through 模式，必须提供一个明确的可交互热区或临时关闭 click-through。

### 屏幕边界

首版只承诺主显示器和当前所在显示器的安全可见区域，不做跨屏漫游。

边界规则：

- 宠物主体不能完全离开屏幕。
- 重要可见部分不能被菜单栏、Dock 或屏幕边缘遮住。
- 气泡或提示卡片优先向屏幕内侧展开。
- 在 bottom/right 边缘时，overlay bounds 必须重新定位或扩大，不能靠 CSS overflow 显示窗口外内容。

### 显示器和桌面切换

需要监听：

- `display-added`
- `display-removed`
- `display-metrics-changed`

响应规则：

- 当前 display 消失时，把宠物迁移到主显示器默认位置。
- work area 变化时，重新 clamp 当前 bounds。
- scale factor 变化时，按 DIP 坐标重新计算 renderer 尺寸。
- macOS Spaces 下，首版采用“跟随当前桌面可见”的策略；如果实现不稳定，先提供托盘 `显示宠物` 作为明确恢复入口。

### 默认位置

默认位置应满足：

- 启动后立刻可见。
- 不贴死左上角，避免看起来像调试 overlay。
- 不遮挡屏幕中心工作区。
- 建议默认放在主显示器右下或右侧边缘，并保留 work area padding。

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

### 拖拽流程

```text
Pointer down on pet
  -> Renderer starts pointer tracking
  -> Movement exceeds drag threshold
  -> Renderer sends placement drag delta
  -> Placement Controller computes next bounds
  -> clampToWorkArea
  -> Desktop Shell applies window bounds
  -> Pointer up persists placement
```

### 显示器变化流程

```text
Display metrics changed
  -> Placement Controller reloads display work areas
  -> Resolve current display
  -> Recompute safe bounds
  -> Clamp existing pet position
  -> Desktop Shell applies corrected bounds
  -> Renderer receives placement-updated
```

## Normalized Manifest

Pawkit 内部不直接依赖外部 `pet.json` 的原始形状。Codex Pet / CodexPets 社区包可以只有很轻的 manifest：

```json
{
  "id": "pet-name",
  "displayName": "Pet Name",
  "description": "One short sentence.",
  "spritesheetPath": "spritesheet.webp"
}
```

Adapter 必须把它转换为稳定的 normalized manifest：

```json
{
  "id": "pawkit-cat",
  "name": "Pawkit Cat",
  "description": "One short sentence.",
  "version": "1.0.0",
  "sprite": {
    "src": "spritesheet.webp",
    "frameWidth": 192,
    "frameHeight": 208
  },
  "animations": {
    "idle": {
      "row": 0,
      "frames": 6,
      "fps": 5,
      "loop": true,
      "durationsMs": [280, 110, 110, 140, 140, 320]
    },
    "waving": {
      "row": 3,
      "frames": 4,
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
- `durationsMs`：可选逐帧时长；存在时 renderer 应优先使用它。
- `loop`：是否循环。

### Codex 固定 Atlas

默认兼容的 Codex Pet atlas：

| Row | Pawkit canonical action | Frames |
| --- | --- | ---: |
| 0 | `idle` | 6 |
| 1 | `running-right` | 8 |
| 2 | `running-left` | 8 |
| 3 | `waving` | 4 |
| 4 | `jumping` | 5 |
| 5 | `failed` | 8 |
| 6 | `waiting` | 6 |
| 7 | `running` | 6 |
| 8 | `review` | 6 |

Adapter 还应接受常见别名：

- `Idle` -> `idle`
- `wave` -> `waving`
- `jump` -> `jumping`
- `run` -> `running-right`
- `run left` / `runLeft` / `Run_Left` -> `running-left`

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
| `pet:get-placement` | renderer -> main | 获取当前桌面位置 |
| `pet:set-placement` | renderer -> main | 拖拽结束后保存位置 |
| `pet:placement-updated` | main -> renderer | 推送 clamp 后的位置变化 |

## 迁移计划

### Step 0: 文档冻结

完成目标、架构、测试规范，并让 README / SPEC 指向 Pet MVP Reset。

### Step 1: 宠物包契约

新增 `pets/builtin/pawkit-cat/`，建立最小宠物包样例。即使首个 spritesheet 是占位资产，也必须走真实宠物包加载路径。

内置宠物包资产必须是 Pawkit 自有或明确授权资源。CodexPets.app 可以作为格式和体验参考，以及未来用户导入源；在没有明确授权前，不把社区宠物直接打包进仓库。

### Step 2: Runtime 与 Adapter

新增 shared pet runtime，先用单元测试证明：

- pet package 可被校验。
- 动作别名可被规范化。
- 缺失动作会 fallback。
- Pawkit 语义状态能映射到具体动画。

### Step 3: Renderer 播放器

用 `PetStage` 和 `SpriteAnimator` 替换默认正面 UI。旧照料 UI 先隐藏，不作为 MVP 默认入口。

### Step 4: Desktop Shell 收缩

拆分当前 `src/main.js` 中的窗口、托盘、状态逻辑。首版只保留宠物陪伴应用所需的 shell 能力。

### Step 5: Placement Controller

新增位置控制层，覆盖默认位置、拖拽、持久化、屏幕边界、显示器变化和 overlay bounds 计算。

### Step 6: MVP 验证门禁

新增 `verify:pet-mvp`，验证启动、manifest、fallback、点击反馈和默认 UI 不暴露旧照料系统。

## 架构约束

- Renderer 只能播放 normalized manifest，不能直接读原始 `pet.json` 决策。
- Behavior Controller 输出语义状态，不能输出具体 sprite 行列。
- Adapter 负责兼容和 fallback，不能把格式差异泄漏到 UI。
- Legacy care / validation / roaming 只能作为可选增强，不能成为 Pet MVP 默认依赖。
- 宠物包失败时必须显示最小错误状态，不能白屏。
- 导入宠物包必须先校验，再写入用户宠物库。
- Placement Controller 是窗口位置的唯一写入者；renderer 只能请求位置变化，不能直接持久化桌面 bounds。
- 宠物、气泡和提示卡片必须位于 overlay bounds 内，不能依赖窗口外 overflow 显示。
- 所有启动恢复、拖拽结束和显示器变化后的坐标都必须经过可见区域 clamp。

## 后续增强

Pet MVP 通过后，可以按顺序恢复：

1. 更自然的桌面移动。
2. 任务状态联动，例如 success / failed / review。
3. 轻量宠物创建 Hatchery。
4. 可选照料模块。
5. 更丰富的设置和资源管理。
