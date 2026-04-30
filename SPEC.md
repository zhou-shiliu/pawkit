# Pawkit 工程说明

## 当前目标

当前仓库已经完成 **M1：桌面存在感 + 最小照料闭环** 与 **M2：双模式存在感**。

当前分支的新增目标是 **M3：鲜活感升级 / Lifelike Presence Upgrade**：在 work / idle 边界不回退的前提下，引入有限多姿态与更像猫的状态切换，让用户愿意整天开着观察。

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
    ├── hooks/              当前已包含 presence / roaming / care hydration；M3 计划在此层新增 visual presence 状态所有者
    ├── systems/
    └── components/
```

> 注：M3 计划中的 `visualPresence` 相关 shared / hook / pose 资源仍在实现中；在对应文件真正落地前，不应把它们记为已完成能力。

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

### M3：鲜活感升级（当前分支目标）

- 目标不是增加更多功能，而是让桌面猫看起来更像“活着的猫”。
- 计划新增有限姿态资源、renderer 侧 visual state 规范化、以及 work / idle 差异化状态集合。
- M3 必须新增独立验证门禁 `verify:m3:livelike`，同时继续通过 `verify:m2:presence` 与 `verify:m1-closure`。
- 在该门禁与实现真正落地前，仓库当前可运行结论仍以 M2 为准。

## 当前限制

- 桌面窗口仍默认 click-through，交互入口主要是托盘。
- 最小信任系统已经存在，但仍是轻量版本，不等同于完整关系系统。
- 当前阶段不包含复杂动机、孤独感、召唤、语音、AI、multi-cat / multi-screen、IK 动画或 sprite 动画系统。
- M2 第一版只处理主显示器/当前工作区，不做多屏策略。

## 验证门禁

当前已落地门禁：

```bash
npm test
npm run build
npx tsc --noEmit --project tsconfig.json
npm run verify:m2:presence
npm run verify:m1-closure
```

M3 目标门禁（待实现完成后纳入）：

```bash
npm run verify:m3:livelike
```

## 当前结论

当前仓库已经不是“纯漫游 M1”，而是 **M1 基线 + M2 双模式存在感**，并正在朝 **M3 鲜活感升级** 推进。当前应先完成可复验的姿态/视觉状态门禁，再决定是否继续扩展更多体验层。
