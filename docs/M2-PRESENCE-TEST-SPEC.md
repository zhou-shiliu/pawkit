# 测试规范：M2 双模式存在感

## 测试目标

验证 Pawkit M2 是否实现：用户活跃时工作态贴边微动，用户闲置达到阈值后恢复漫游，并且不破坏 M1 照料闭环。

## 自动化命令

推荐新增：

```bash
npm run verify:m2:presence
```

M2 完整门禁建议：

```bash
npm test
npm run build
npx tsc --noEmit --project tsconfig.json
npm run pack
npm run verify:runtime
npm run verify:m1:manual
npm run verify:m2:presence
```

## Unit Tests

新增 `scripts/test-presence-mode.js`：

1. `createInitialPresenceState` 默认：
   - `manualOverride = auto`
   - `idleThresholdSeconds = 600`
   - `mode = work`
2. `normalizePresenceState`：
   - 非法阈值回退到 600。
   - 只允许 600 / 1800 / 3600。
   - 非法 override 回退到 auto。
3. `resolvePresenceMode`：
   - auto + idleSeconds < threshold -> work。
   - auto + idleSeconds >= threshold -> idle。
   - override work -> work。
   - override idle -> idle。
   - locked / unknown 状态保守回 work。
4. `createDockedPoint`：
   - 输出坐标在 workArea 内。
   - 默认靠右侧边缘。
   - 小工作区也不越界。
5. `toPersistedPresenceState`：
   - 只持久化必要字段。

## Integration / Runtime Verification

新增或扩展脚本：`scripts/verify-m2-presence.js`。

### A. 默认工作态

环境：

```bash
PAWKIT_AUTOMATION_IDLE_SECONDS=0
PAWKIT_AUTOMATION_PRESENCE_STATUS_FILE=<tmp>
electron .
```

断言：

- `presence.mode === work`
- `idleThresholdSeconds === 600`
- window x/y 位于贴边区域
- roaming snapshot 不持续产生全屏位移
- renderer 仍能显示状态面板

### B. 闲置态恢复漫游

环境：

```bash
PAWKIT_AUTOMATION_IDLE_SECONDS=600
```

断言：

- `presence.mode === idle`
- roaming samples 出现多个不同 position
- phases 包含 `pause / turn / move`

### C. 恢复活动后重新贴边

模拟：

1. 启动时 idle seconds = 600，进入 idle。
2. 更新/重启为 idle seconds = 0 或用脚本触发 active。
3. 检查 mode 回到 work。

断言：

- mode changed idle -> work
- window 回到 dock point
- roaming state 被持久化，不丢失

### D. 阈值持久化

通过自动化或 IPC 设置阈值为 1800 / 3600。

断言：

- store 中持久化。
- 重启后仍保留。
- 托盘文案显示正确阈值。

### E. 手动覆盖

验证：

- `manualOverride = work` 时，即使 idleSeconds >= threshold 也为 work。
- `manualOverride = idle` 时，即使 idleSeconds = 0 也为 idle。
- `manualOverride = auto` 时恢复系统 idle 判断。

### F. M1 回归

必须继续通过：

- startupSpawn
- autonomousRoaming（可在强制 idle 或 verify:m1:manual 环境下保持 M1 语义）
- boundarySafety
- careStateBootstrap
- careStatusVisible
- restoreNearLastPosition
- careActions
- carePersistence

## Manual QA

新增 `docs/M2-PRESENCE-QA-CHECKLIST.md`：

- [ ] 首次启动默认工作态，猫贴边可见。
- [ ] 工作态猫不横穿屏幕。
- [ ] 工作态仍有轻微存在感。
- [ ] 托盘显示当前模式。
- [ ] 托盘可选择 10 分钟 / 30 分钟 / 1 小时。
- [ ] 10 分钟为默认阈值。
- [ ] 手动强制工作态生效。
- [ ] 手动强制闲置态生效。
- [ ] 自动模式恢复系统 idle 判断。
- [ ] 闲置达到阈值后猫恢复漫游。
- [ ] 恢复操作后猫重新贴边。
- [ ] 照料动作在两种模式均可用。

## Pass / Fail Criteria

M2 通过条件：

1. 所有 unit tests 通过。
2. `verify:m2:presence` 通过。
3. `verify:m1-closure` 通过。
4. 手工 QA 清单通过。
5. README / SPEC / PRD / test spec 使用同一版 M2 定义。

## Architect Review Test Addendum

本节补充第 1 轮架构评审要求的测试门禁。

### G. M1 验证兼容门禁

`npm run verify:m1:manual` 必须显式强制 M1 roaming 语义：

```bash
PAWKIT_AUTOMATION_PRESENCE_OVERRIDE=idle
```

断言：

- `autonomousRoaming` 仍采样到多个位置。
- phases 仍包含 `pause / turn / move`。
- M2 默认 work 模式不会污染 M1 验证结果。

### H. 单一窗口移动所有者

静态/结构检查：

- `mainWindow.setBounds` 只能出现在统一同步函数中。
- roaming tick、presence tick 不直接调用 `setBounds`。

运行时检查：

- work 模式连续采样窗口位置，位置稳定在 dock 区域。
- idle 模式连续采样窗口位置，位置随 roaming 变化。
- work/idle 切换期间不出现双 interval 抢写导致的位置抖动。

### I. roaming 与 dock 持久化分离

断言：

- work 模式持续运行后，`cat.roaming` 不被 dock 坐标反复覆盖。
- idle 模式移动后，`cat.roaming` 更新为真实漫游位置。
- 如存在 dock 持久化，使用 `cat.presence.dock` 或同类独立 key。

### J. activity abstraction 测试

环境变量模拟：

```bash
PAWKIT_AUTOMATION_IDLE_SECONDS=0
PAWKIT_AUTOMATION_IDLE_STATE=active
PAWKIT_AUTOMATION_IDLE_STATE=idle
PAWKIT_AUTOMATION_IDLE_STATE=locked
PAWKIT_AUTOMATION_IDLE_STATE=unknown
```

断言：

- active -> work
- idle -> idle
- locked -> work / quiet dock
- unknown -> work

### K. Presence IPC / Renderer Contract

断言：

- `get-presence-state` 返回当前 mode、threshold、override。
- `presence-state-updated` 在 mode 变化时推送。
- renderer 输出 `data-presence-mode="work"` 或 `"idle"`。
- work 模式 CSS 微动存在，但不依赖新动画资源。

### L. IPC Naming Consistency

断言：

- 主进程推送 channel 使用 `presence-state-updated`。
- preload 暴露方法名使用 `onPresenceStateUpdated(callback)`。
- renderer 不直接引用 raw IPC channel 字符串。

## Critic Review Test Addendum

### M. Work Mode Prompt Filtering

新增 pure unit tests（建议放入 `scripts/test-presence-mode.js` 或 care presentation 相关测试）：

1. `mode=work` 且 `Food/Water/Play` 最低值在 `[20, 35)`：
   - `shouldShowCarePrompt(...) === false`
   - renderer 不显示 prompt bubble
2. `mode=work` 且任一值 `< 20`：
   - `shouldShowCarePrompt(...) === true`
   - prompt 为轻量气泡，不触发声音/语音
3. `mode=idle` 且最低值 `< 35`：
   - 保持 M1 提示行为，允许显示 prompt bubble

`verify:m2:presence` 应增加运行时断言：

- work + non-urgent care state -> `[aria-label="care-hud"]` 不存在或不可见。
- work + urgent care state -> `[aria-label="care-hud"]` 可见。
- idle + non-urgent care state -> `[aria-label="care-hud"]` 可见。

### N. Live Session Idle-to-Work Resume

`verify:m2:presence` 必须使用单次 Electron 进程验证 live transition。

推荐自动化输入：

```json
{
  "sequence": [600, 600, 600, 600, 600, 0, 0],
  "stepMs": 700
}
```

通过环境变量传入：

```bash
PAWKIT_AUTOMATION_IDLE_SEQUENCE_FILE=<tmp-json>
PAWKIT_AUTOMATION_PRESENCE_STATUS_FILE=<tmp-status>
```

断言：

- 同一进程中观察到 `modeSequence` 包含 `idle -> work`。
- `idle` 阶段至少出现 2 个不同 roaming positions。
- `work` 阶段最终窗口位置等于/接近 dock point。
- 该过程不重启 Electron。
