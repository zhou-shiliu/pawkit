# Pawkit 工程说明

## 当前目标

当前仓库正在进行 **Pet MVP Reset**：从原先的 M1/M2/M3 照料型桌面猫路线，收缩为 Codex Pet 风格兼容的桌面宠物陪伴应用。

新的工程目标是：

- 以 `pet.json + spritesheet.webp` 宠物包作为视觉核心。
- 用 adapter 把外部宠物资源转换为 Pawkit 内部 normalized manifest。
- 用最少语义状态驱动动画：`idle / working / attention / success / failed / sleepy / movingLeft / movingRight`。
- 默认体验不展示 Food / Water / Play / Trust 面板、复杂设置页或验证报告。
- 先让用户快速看到一个动态、可替换、低打扰的桌宠，再决定是否恢复照料系统。

执行前先阅读：

- `docs/releases/v0.1.0/GOAL.md`
- `docs/releases/v0.1.0/ARCHITECTURE.md`
- `docs/releases/v0.1.0/TEST-docs/releases/v0.1.0/ENGINEERING.md`

## 历史目标

当前仓库已经完成过 **M1：桌面存在感 + 最小照料闭环** 与 **M2：双模式存在感**，并曾推进 **M3：鲜活感升级 / Lifelike Presence Upgrade**。这些能力保留为历史实现和后续增强素材，但不再作为 Reset MVP 的默认产品中心。

## 当前结构

```text
src/
├── main.js                 Electron 主进程入口：窗口、托盘、照料、漫游与 presence 协调
├── preload.js              预加载桥接：care / roaming / presence IPC
├── shared/
│   ├── roaming.js          漫游状态机与边界逻辑
│   ├── careLoop.js         最小照料闭环逻辑
│   ├── presence.js         双模式 presence 纯函数、阈值、贴边点与提示过滤
│   └── validationMetrics.js 本地验证指标汇总
└── renderer/
    ├── App.tsx             桌面 UI，按 presence mode 控制提示与微动
    ├── hooks/              当前已包含 presence / roaming / care hydration / visual presence
    ├── systems/
    └── components/
```

> 注：这是 Reset 前的历史结构。Pet MVP Reset 的目标结构以 `docs/releases/v0.1.0/ARCHITECTURE.md` 为准。

## 当前能力

### M1-A：桌面存在感

- 自动出现
- 自主漫游
- 边界约束
- 重启恢复
- 开发/打包路径一致

### M1-B：最小照料闭环

- `hunger / hydration / happiness / trustLevel` 状态
- 状态随时间衰减
- 托盘支持喂食、喝水、抚摸
- 状态变化持久化
- 界面显示 `Food / Water / Play / Trust`

### M2：双模式存在感

- `work` 模式：活跃时默认进入；窗口由单一同步函数贴边；roaming 状态不继续推进；渲染层保留轻微 CSS 微动。
- `idle` 模式：系统闲置达到阈值后进入；复用 M1 roaming 状态机。
- `manualOverride`：`auto / work / idle`，通过托盘切换并持久化。
- `idleThresholdSeconds`：只允许 `600 / 1800 / 3600`，默认 `600`。
- 工作态提示过滤：非紧急照料提示被抑制，紧急提示保留；闲置态沿用 M1 提示行为。
- 自动化支持：`PAWKIT_AUTOMATION_IDLE_SECONDS`、`PAWKIT_AUTOMATION_IDLE_SEQUENCE_FILE`、`PAWKIT_AUTOMATION_PRESENCE_OVERRIDE`、`PAWKIT_AUTOMATION_IDLE_THRESHOLD_SECONDS`、`PAWKIT_AUTOMATION_CARE_STATE`。

### M3：鲜活感升级（历史目标）

- 目标不是增加更多功能，而是让桌面猫看起来更像“活着的猫”。
- 已引入 visual presence 相关实现和 `verify:m3:livelike` 门禁。
- Reset 之后，M3 作为历史经验保留，不再作为当前 MVP 的实现主线。

## 当前限制

- 桌面窗口仍默认 click-through，交互入口主要是托盘。
- 最小信任系统已经存在，但仍是轻量版本，不等同于完整关系系统。
- 当前 Reset 阶段不包含复杂动机、孤独感、召唤、语音、AI、multi-cat / multi-screen、IK 或骨骼动画系统。
- M2 第一版只处理主显示器/当前工作区，不做多屏策略。

## 验证门禁

当前已落地门禁：

```bash
npm test
npm run build
npx tsc --noEmit --project tsconfig.json
npm run verify:m2:presence
npm run verify:m1-closure
npm run verify:m3:livelike
```

Pet MVP Reset 目标门禁（待实现完成后纳入）：

```bash
npm run verify:pet-mvp
```

## 当前结论

当前仓库已经完成过 **M1 基线 + M2 双模式存在感 + M3 鲜活感升级** 的探索。下一步不再继续加功能，而是按 Pet MVP Reset 收缩为宠物包驱动的桌面宠物陪伴应用。
