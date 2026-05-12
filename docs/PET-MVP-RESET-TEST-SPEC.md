# 测试规范：Pet MVP Reset

## 测试目标

验证 Pawkit 是否已经从复杂照料应用收缩为一个可用的桌面宠物播放器。

测试重点不是旧 M1/M2/M3 的照料完整度，而是：

- 宠物包可以加载。
- 动画可以播放。
- 动作 fallback 可靠。
- 点击和活跃状态能驱动语义反馈。
- 默认界面不再暴露复杂照料系统。
- 宠物位置、鼠标控制和屏幕边界可靠。

## 建议门禁

Pet MVP Reset 完成后新增：

```bash
npm run verify:pet-mvp
```

该门禁应至少运行：

```bash
npm test
npm run build
npx tsc --noEmit --project tsconfig.json
node scripts/verify-pet-mvp.js
```

## 单元测试

### A. 宠物包校验

覆盖文件建议：

```text
scripts/test-pet-package.js
```

断言：

- 缺失 `pet.json` 时失败。
- 缺失 `spritesheet.webp` 时失败。
- 缺失 frame 尺寸时失败。
- 缺失全部可播放动作时失败。
- 合法宠物包通过校验。

### B. Codex Pet Adapter

断言：

- `run left`、`runLeft`、`Run Left` 都能规范化为同一动作。
- `Idle` 与 `idle` 可以统一解析。
- 原始 manifest 被转换为 normalized manifest。
- adapter 不把原始格式差异泄漏给 renderer。

### C. 动作 fallback

断言：

- `idle` 语义优先使用 `Idle`，缺失时使用 `waiting`。
- `working` 语义优先使用 `waiting`，缺失时使用 `Idle`。
- `attention` 语义优先使用 `wave`，缺失时使用 `jump`。
- `success` 语义优先使用 `jump`，再 fallback 到 `review`、`wave`。
- `failed` 语义优先使用 `failed`，缺失时使用 `Idle`。
- `movingLeft` 优先使用 `run left`，缺失时使用 `run`。
- 所有语义最终至少能 fallback 到一个可播放动作或明确错误状态。

### D. Behavior Controller

断言：

- 应用启动后进入 `idle`。
- 用户活跃时进入 `working`。
- 点击宠物时进入 `attention`，一次性动作结束后回到 `idle` 或 `working`。
- 长时间无操作后进入 `sleepy`。
- 任务成功事件进入 `success`。
- 任务失败事件进入 `failed`。

## 集成测试

### E. 默认启动

断言：

- 默认宠物包被加载。
- renderer 根节点包含 `data-pet-id`。
- renderer 根节点包含 `data-pet-state="idle"` 或等价状态。
- renderer 根节点包含 `data-pet-animation`。
- 10 秒采样内 animation frame 或 animation name 有变化。

### F. 点击反馈

断言：

- 模拟点击宠物后，运行时收到 `petClicked`。
- 语义状态短暂进入 `attention`。
- 动画解析为 `wave`、`jump` 或 fallback 动作。
- 一次性动作结束后返回稳定状态。

### G. 宠物切换

断言：

- 可列出内置宠物。
- 可切换 active pet。
- 切换后 manifest 和 spritesheet 路径更新。
- 切换失败不会破坏当前正在播放的宠物。

### H. 导入校验

断言：

- 合法宠物包可以导入用户宠物库。
- 非法宠物包被拒绝，并返回明确错误。
- 导入失败不写入 active pet。

### I. 默认 UI 收缩

断言：

- 默认界面不展示 `Food`、`Water`、`Play`、`Trust` 面板。
- 默认界面不展示旧验证报告入口。
- 默认托盘只展示 Pet MVP 必需操作。

### J. 位置与屏幕边界

断言：

- 首次启动时，默认位置在主显示器 work area 内。
- 恢复保存位置前，会校验目标 display 是否仍存在。
- 保存位置超出 work area 时，会被 clamp 回可见区域。
- bottom/right 边缘位置不会导致宠物主体被裁掉。
- overlay bounds 至少覆盖宠物主体、阴影、点击热区和预留气泡区域。
- 显示器移除后，宠物会迁移回主显示器可见区域。

### K. 鼠标控制

断言：

- 单击宠物触发 `attention`。
- 小于拖拽阈值的移动仍按点击处理。
- 超过拖拽阈值后进入拖拽模式。
- 拖拽结束后持久化 clamp 后的位置。
- 拖拽不会同时触发点击反馈。

## 手工 QA

### 第一眼体验

- [ ] 启动 10 秒内能看到动态宠物。
- [ ] 宠物轮廓清晰，小窗口常驻不糊。
- [ ] 宠物不是单张静态图加 CSS 摇晃的感觉。
- [ ] 用户不用阅读说明也知道这是一个桌宠。

### 低打扰体验

- [ ] 用户活跃时，宠物不会横穿主要工作区。
- [ ] 动作不会高频闪烁。
- [ ] 点击反馈明确但不吵。
- [ ] 隐藏/显示路径容易找到。

### 宠物包体验

- [ ] 可以切换内置宠物。
- [ ] 可以导入兼容宠物包。
- [ ] 宠物包错误能被看懂。
- [ ] 切换宠物后应用无需重启。

### 桌面位置体验

- [ ] 宠物首次启动位置自然，不贴死左上角。
- [ ] 宠物可以被拖到用户想要的位置。
- [ ] 靠近屏幕边缘时，宠物和气泡不会被裁掉。
- [ ] 切换桌面或显示器变化后，可以通过托盘恢复宠物可见。
- [ ] 退出重启后，宠物恢复到上次可见位置。

## 通过条件

Pet MVP Reset 通过必须同时满足：

1. `npm run verify:pet-mvp` 通过。
2. 默认启动不展示旧照料 UI。
3. 默认宠物包可播放。
4. 点击反馈可见。
5. 缺失动作 fallback 有自动化覆盖。
6. 宠物位置、拖拽和可见区域 clamp 有测试覆盖。
7. README / SPEC / Goal / Architecture / Test Spec 一致。

## 不再作为 MVP 门禁的内容

以下内容可以保留测试，但不作为 Reset MVP 的完成前置条件：

- M1 照料闭环完整体验。
- M2 双模式完整体验。
- M3 鲜活感文档中的多姿态猫状态。
- 本地验证报告。
- Food / Water / Play / Trust UI。

这些能力后续可作为增强模块重新接入。
