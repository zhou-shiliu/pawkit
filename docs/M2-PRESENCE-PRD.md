# PRD：M2 双模式存在感

## 背景

Pawkit 当前 M1 已完成桌面存在感与最小照料闭环：猫咪可启动出现、自主漫游、边界安全、重启恢复，且 `Food / Water / Play / Trust` 可见、托盘照料和状态持久化可用。

M2 的目标不是继续堆复杂互动，而是解决桌面常驻后的核心体验问题：用户工作时仍能感到陪伴，但猫不能变成干扰源；用户闲置时，猫恢复更明显的活动和陪伴感。

## RALPLAN-DR 摘要

### Principles

1. **陪伴感优先，但受工作态边界约束**：工作时要能感到猫在身边，但不横穿工作区。
2. **复用 M1 能力**：闲置态复用现有 roaming，照料闭环不重做。
3. **最小可控配置**：只在托盘提供预设，不做完整设置页。
4. **验证优先**：新增模式切换必须有自动化测试，并保持 M1 验收绿灯。
5. **低复杂度实现**：不引入新依赖、声音、语音、sprite 或 IK。

### Decision Drivers

1. 用户在工作时不能被明显打扰。
2. 猫在工作态仍需有轻量存在感，而不是完全消失/静默。
3. 模式切换、阈值配置和回归验证必须可测试。

### Viable Options

| Option | Description | Pros | Cons | Decision |
| --- | --- | --- | --- | --- |
| A. 主进程 presence 层 + Electron powerMonitor | 主进程轮询系统 idle time，分支控制 work dock / idle roaming | 符合 Electron 架构；无需新依赖；可自动化模拟 | main.js 会变复杂，需要抽 pure helper | **选择** |
| B. Renderer 自行判断活动状态 | 前端监听鼠标/键盘活动并通知主进程 | UI 直观，易调试 | click-through 窗口难可靠捕获全局活动；不适合系统 idle | 拒绝 |
| C. 仅手动模式切换 | 用户通过托盘选择工作/闲置，不自动判断 | 实现最简单 | 不满足“双模式自动存在感”；体验负担大 | 拒绝 |

## 目标

实现 **工作态 + 闲置态** 双模式存在感。

### 工作态（work）

- 默认自动模式下，用户活跃时进入工作态。
- 猫咪贴在主显示器工作区边缘。
- 不主动横穿屏幕，不在工作区中央巡游。
- 允许静态主视觉上的轻量微动，例如 CSS 呼吸/轻微浮动。
- 非紧急需求不主动气泡提示；紧急需求可轻量提示。

### 闲置态（idle）

- 用户无操作达到阈值后进入闲置态。
- 猫咪恢复 M1 自由漫游。
- 用户恢复操作后回到工作态并重新贴边。

### 阈值配置

- 默认阈值：`10 分钟`。
- 用户可通过托盘手动修改。
- 第一版只提供三个预设：
  - `10 分钟`
  - `30 分钟`
  - `1 小时`

## 范围

### In Scope

- 新增 presence 状态模型：`mode = work | idle`，`manualOverride = auto | work | idle`。
- 使用 Electron `powerMonitor` 在主进程读取系统 idle time。
- 新增工作态贴边算法。
- 闲置态复用现有 roaming state machine。
- 托盘菜单展示当前模式、手动模式和闲置阈值。
- 阈值与手动模式持久化。
- 本地验证指标记录模式切换、阈值变化和手动覆盖。
- 新增自动化测试和 M2 验证命令。
- 更新 README / SPEC / 本阶段文档。

### Out of Scope

- 不做复杂设置页。
- 不做新动画系统、sprite、IK 或复杂动作。
- 不做声音提醒、语音唤醒或语音互动。
- 不做多屏复杂策略；第一版只处理主显示器/当前工作区。
- 不改变 `Food / Water / Play / Trust` 衰减、增益和信任数值规则。
- 不重构 M1 照料闭环。

## 用户体验

### 托盘菜单新增内容

建议在照料菜单之前或之后增加：

```text
当前模式：工作态 / 闲置态
控制方式：自动 / 强制工作态 / 强制闲置态
闲置阈值：10 分钟
模式控制
  自动 ✓
  强制工作态
  强制闲置态
闲置阈值
  10 分钟 ✓
  30 分钟
  1 小时
```

### 默认行为

- 首次启动：`manualOverride = auto`，`idleThresholdSeconds = 600`。
- 系统 idle time `< 600`：工作态。
- 系统 idle time `>= 600`：闲置态。
- 用户操作恢复后：回到工作态。

## 技术设计

### 新增 `src/shared/presence.js`

职责：纯函数，便于测试。

建议导出：

- `PRESENCE_MODE`
- `PRESENCE_OVERRIDE`
- `IDLE_THRESHOLD_OPTIONS`
- `DEFAULT_IDLE_THRESHOLD_SECONDS = 600`
- `createInitialPresenceState(...)`
- `normalizePresenceState(...)`
- `resolvePresenceMode(...)`
- `createDockedPresenceState(...)`
- `createDockedPoint(workArea, windowSize, options)`
- `toPersistedPresenceState(...)`

### 主进程集成

`src/main.js`：

- import `powerMonitor`。
- 初始化 `presenceRuntimeState`。
- 新增 `PRESENCE_TICK_MS = 1000` loop。
- tick 中读取 `powerMonitor.getSystemIdleTime()`，但测试环境可通过环境变量模拟。
- 根据 `manualOverride` 和 idle time 解析当前模式。
- mode 变化时记录 validation event、重建托盘菜单、同步窗口位置。
- `startRoamingLoop()` 在 `work` 模式下不 advance roaming；在 `idle` 模式下继续 advance。
- `work` 模式调用 dock 算法并设置 window bounds。

### 自动化测试支持

建议环境变量：

- `PAWKIT_AUTOMATION_IDLE_SECONDS`
- `PAWKIT_AUTOMATION_PRESENCE_OVERRIDE`
- `PAWKIT_AUTOMATION_IDLE_THRESHOLD_SECONDS`
- `PAWKIT_AUTOMATION_PRESENCE_STATUS_FILE`

用于验证：

- active -> work docked
- idle -> idle roaming
- activity resumes -> work docked

### Renderer 微动

- 给根节点或 cat stage 增加 `data-presence-mode`。
- work 模式下用 CSS 轻微呼吸/浮动，不新建动画资源。
- idle 模式保持当前 roaming 视觉。

### 本地验证指标

扩展 `src/shared/validationMetrics.js`：

- `recordPresenceModeChange`
- `recordPresenceThresholdChange`
- `recordPresenceOverrideChange`

摘要字段：

- `presenceModeSwitchCount`
- `presenceModeDurationsMs.work`
- `presenceModeDurationsMs.idle`
- `presenceOverrideCounts.auto/work/idle`
- `presenceThresholdChangeCount`

## 验收标准

1. 默认阈值为 10 分钟。
2. 托盘可切换 10 分钟 / 30 分钟 / 1 小时。
3. 阈值选择重启后保留。
4. 自动模式下，未达到阈值时进入工作态。
5. 工作态猫咪贴边，不穿越工作区。
6. 达到阈值后进入闲置态并恢复漫游。
7. 用户恢复活动后回到工作态并重新贴边。
8. 强制工作态/强制闲置态可用于调试和临时控制。
9. Feed / Give water / Pet 在两种模式下不回退。
10. `npm run verify:m1-closure` 继续通过。
11. 新增 `npm run verify:m2:presence` 通过。

## Follow-ups

- 收集本地验证指标后判断：工作态贴边是否仍有陪伴感，还是过于静默。
- 后续如果用户反馈过于安静，再考虑更丰富但非打扰的表现方式。

## Architect Review Revision Notes

本节回应 Ralplan Architect 第 1 轮 `ITERATE` 的五个阻塞点，作为后续实现约束。

### 1. M1 验证语义保持

M2 引入工作态后，`verify:m1-closure` 中的 M1 漫游验收不能因为默认工作态贴边而失效。实现必须提供明确的 M1 验证兼容路径：

- `npm run verify:m1:manual` 在自动化启动 Electron 时必须显式强制 `presence.manualOverride = idle`，或通过环境变量进入 M1 roaming 语义。
- M1 验证仍证明自由漫游、pause/turn/move、边界安全和重启恢复。
- M2 新增 `verify:m2:presence` 专门验证默认 work、idle threshold、恢复贴边和手动覆盖。

推荐环境变量：

```bash
PAWKIT_AUTOMATION_PRESENCE_OVERRIDE=idle
```

用于 M1 自动化保持原有漫游验收语义。

### 2. BrowserWindow 移动单一所有者

实现必须避免 presence docking 和 roaming loop 同时调用 `mainWindow.setBounds`。

约束：

- 新增一个单一窗口同步函数，例如 `syncWindowToPresenceState()`。
- 只有该函数可以直接调用 `setBounds`。
- roaming tick 只更新 `roamingRuntimeState`；presence tick 解析 mode；最终由统一同步函数决定窗口坐标：
  - `mode === work` -> 使用 dock point
  - `mode === idle` -> 使用 roaming snapshot
- 不允许多个 interval 各自独立 setBounds。

### 3. roaming snapshot 与 dock snapshot 分离

`cat.roaming` 必须继续表示“最后真实漫游位置”，不能在工作态被 dock 坐标污染。

持久化约束：

- `cat.roaming`：只在 idle/free roaming 语义下更新。
- `cat.presence.dock`：如需持久化工作态贴边位置，使用独立 key。
- 从 idle -> work 时：先持久化当前 roaming snapshot，再切到 dock point。
- 从 work -> idle 时：可以从当前 dock point 初始化一次 roaming 起点，但后续 roaming 持久化仍写入 `cat.roaming`。

### 4. PowerMonitor / activity abstraction

主进程应封装 activity source，不把 `powerMonitor.getSystemIdleTime()` 散落在业务逻辑中。

建议：

```js
function getSystemIdleSeconds() {
  const override = process.env.PAWKIT_AUTOMATION_IDLE_SECONDS;
  if (override !== undefined) return Number(override);
  return powerMonitor.getSystemIdleTime();
}

function getSystemIdleState(thresholdSeconds) {
  const override = process.env.PAWKIT_AUTOMATION_IDLE_STATE;
  if (override) return override;
  return powerMonitor.getSystemIdleState(thresholdSeconds);
}
```

语义：

- `active` + idleSeconds < threshold -> work
- `idle` 或 idleSeconds >= threshold -> idle
- `locked` -> work / quiet dock，不触发新提醒
- `unknown` -> work，保守低打扰

### 5. Renderer / preload presence IPC contract

Renderer 必须能收到 presence mode，用于设置 `data-presence-mode` 和微动样式。

建议 IPC：

- `get-presence-state` -> returns `PresenceStatePayload`
- `presence-state-updated` -> push updates via preload `onPresenceStateUpdated(callback)`
- `set-presence-idle-threshold` -> selected preset
- `set-presence-override` -> `auto | work | idle`

Renderer contract：

- `App.tsx` 读取 presence state。
- 根节点或 cat stage 输出 `data-presence-mode="work|idle"`。
- CSS 只在 `work` 模式启用轻量微动。
- 如果 IPC 不可用（web preview），默认 `work`，不影响 preview。

### Naming Normalization

为避免实现时重复事件名，统一命名如下：

- IPC channel: `presence-state-updated`
- preload method: `onPresenceStateUpdated(callback)`
- invoke handlers: `get-presence-state`, `set-presence-idle-threshold`, `set-presence-override`

## Critic Review Revision Notes

本节回应 Ralplan Critic 第 1 轮 `ITERATE` 的两个测试性缺口。

### 1. 工作态提示行为验收

工作态提示策略必须可测试：

- 非紧急需求（最低状态值 `>= 20` 且 `< 35`）在 work 模式下不显示气泡提示，只保留状态面板和托盘状态。
- 紧急需求（任一 `Food / Water / Play < 20`）在 work 模式下允许轻量气泡提示。
- idle 模式保留 M1 的非紧急与紧急提示行为。
- 不新增声音/语音提醒。

实现建议：

- 将 prompt visibility 逻辑抽为 pure helper，例如 `shouldShowCarePrompt({ mode, careState })`。
- Renderer 接收 presence mode 后决定是否显示 bubble，或主进程发送已过滤的 prompt intent；优先选择 renderer 过滤以减少主进程 UI 耦合。

### 2. 同一会话内 activity resume 验证

`idle -> work` 必须在同一 Electron 会话内验证，不能通过重启代替。

推荐确定性模拟路径：

- 支持 `PAWKIT_AUTOMATION_IDLE_SEQUENCE_FILE=<path>`。
- 文件内容为 JSON，例如：

```json
{
  "sequence": [600, 600, 0, 0],
  "stepMs": 600
}
```

- presence loop 每个 tick 或每 `stepMs` 读取下一个 idle seconds 值。
- 验证脚本启动一次 Electron，采样：
  1. 先进入 idle 并出现 roaming 位移。
  2. 同会话 idle seconds 变为 0。
  3. mode 变回 work。
  4. window 回到 dock point。

该模拟能力仅用于自动化；正常运行仍使用 `powerMonitor`。
