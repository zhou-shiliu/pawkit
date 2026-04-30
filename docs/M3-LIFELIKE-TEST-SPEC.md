# 测试规范：M3 鲜活感升级 / Lifelike Presence Upgrade

## 测试目标

验证 Pawkit 在不破坏 M1/M2 基础能力的前提下，是否完成了“从静态图到更像猫的行为状态切换”的升级，并达到用户愿意长期开着观察的最低门槛。

---

## 验证门禁

完整门禁建议：

```bash
npm test
npm run build
npx tsc --noEmit --project tsconfig.json
npm run verify:m3:livelike
npm run verify:m2:presence
npm run verify:m1-closure
```

---

## Unit Tests

建议新增：

- `scripts/test-visual-presence-mode.js`

### A. 视觉状态规范化

验证：

- 非法 visual state 回退到默认态
- work / idle 下不允许的状态会被过滤
- walk 相位下只能出现 `walk-*` 系列

### B. 状态解析逻辑

验证：

- `work + pause` 可解析到 `settle / look-left / look-right / blink / small-shift`
- `idle + move` 可解析到 `walk-a / walk-b`
- `idle + pause` 可解析到 `settle / look-left / look-right / groom / stretch`
- 启动首屏路径能在限定时间窗内进入非初始状态
- work 模式不会解析到 idle-only 状态集合
- idle-move 不会解析到 `groom / stretch`

### C. 随机性可控

验证：

- 在关闭随机性或固定种子模式下，visual state sequence 可重复
- 自动化测试不依赖不稳定随机结果
- 主姿态切换节奏满足 work/idle 的最短 dwell time 约束

---

## Renderer / Component Tests

如使用前端测试工具或轻量脚本验证，重点断言：

1. 根节点存在 `data-presence-mode`
2. 猫组件存在 `data-visual-state`
3. `visualState` 变化会切换对应姿态资源 / CSS class
4. `facing` 与 `visualState` 切换不会造成明显越界或布局抖动
5. 根节点或猫组件应暴露稳定的 `data-cat-pose` 或等价标识，避免自动化依赖图片二进制差异

---

## Integration / Runtime Verification

新增脚本：

```bash
npm run verify:m3:livelike
```

对应脚本：

- `scripts/verify-m3-lifelike-presence.js`

### A. 启动第一眼观感

环境：

```bash
PAWKIT_AUTOMATION_VISUAL_STATE_FILE=<tmp>
PAWKIT_AUTOMATION_DISABLE_VISUAL_RANDOMNESS=1
electron .
```

断言：

- 启动后 3-8 秒内，`data-visual-state` 至少变化一次
- 初始与后续状态不相同
- 不再只有单一 pose 持续不变

### B. 工作态鲜活感

环境：

```bash
PAWKIT_AUTOMATION_IDLE_SECONDS=0
```

断言：

- `presence.mode === work`
- 在采样窗口内至少出现 2 个以上 visual states
- 不出现 roaming 式横向连续移动
- work 模式最终仍保持 docked
- visual state 切换频率低于 work 模式上限，不出现高频抖动

### C. 闲置态鲜活感

环境：

```bash
PAWKIT_AUTOMATION_IDLE_SECONDS=600
```

断言：

- `presence.mode === idle`
- 除 roaming position 变化外，visual state 也发生切换
- `move` 相位与 `pause` 相位的 visual state 有差异
- `walk-a / walk-b` 与 pause 态可明确区分

### D. work / idle 边界差异

断言：

- work 模式 visual states 集合是受限的
- idle 模式 visual states 集合比 work 更丰富
- idle -> work 同进程切换后，visual state 会回到低打扰集合
- idle -> work 后不会残留 idle-only 大动作

### E. 资源切换稳定性

断言：

- pose 切换时图片尺寸和锚点稳定
- 不出现明显跳跃、裁切、闪烁
- 阴影与主视觉能同步跟随主要状态变化
- 左右朝向镜像与姿态切换组合时不出现错位

---

## Regression Gates

### F. M2 回归

必须继续通过：

- `npm run verify:m2:presence`

重点关注：

- work 模式贴边仍成立
- idle 恢复 roaming 仍成立
- manual override 与 threshold persistence 不回退
- 非紧急提示过滤不回退

### G. M1 回归

必须继续通过：

- `npm run verify:m1-closure`

重点关注：

- roaming 基础语义不回退
- care actions / persistence 不回退
- startup / boundary / restore 仍成立

---

## Manual QA

建议新增：

- `docs/M3-LIVELIKE-QA-CHECKLIST.md`

手工检查项应至少包括：

- [ ] 启动第一眼不再像单一静态图
- [ ] 工作态看起来像“活着”，但不吵
- [ ] 闲置态明显比工作态更活
- [ ] 猫的状态切换像猫，而不是随机切图
- [ ] 视觉状态切换没有明显闪烁 / 裁切 / 变形
- [ ] 保持单屏、无语音、无复杂设置、无 AI 聊天
- [ ] 打开一天后主观上仍愿意继续挂着观察

---

## Pass / Fail Criteria

### Engineering Pass

满足以下条件即算工程通过：

1. visual state 单测通过
2. `verify:m3:livelike` 通过
3. `verify:m2:presence` 通过
4. `verify:m1-closure` 通过
5. 手工 QA 清单通过

### Product Pass

在 Engineering Pass 基础上，再由真实使用反馈确认：

- 用户主观反馈达到：  
  **“它不再像静态图，我愿意整天开着继续观察。”**

---

## 需要特别盯住的失败模式

1. **只是加了更多图，但仍不像猫**
2. **工作态鲜活感升级过头，重新变打扰**
3. **idle/work 切换时视觉状态不一致或突兀**
4. **资源/姿态切换导致锚点漂移**
5. **自动化无法稳定识别状态变化**
6. **主观上更鲜活，但工程上无法稳定复验**
