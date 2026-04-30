# M2 双模式存在感手工 QA 清单

> 本轮执行时间：2026-04-30（Asia/Shanghai）  
> 执行方式：代理手工 QA + 自动化采样复核。主观体感项以代码/运行时证据确认“存在且不越界”，长期陪伴感仍建议继续收集真实使用反馈。

## 准备

- [x] 已执行 `npm test`
- [x] 已执行 `npm run build`
- [x] 已执行 `npm run verify:m2:presence`
- [x] 已执行 `npm run verify:m1-closure`

证据：

- `docs/M2-PRESENCE-QA-REPORT.md`：M2 自动化结果通过。
- `docs/M1-MANUAL-QA-REPORT.md`：M1 回归自动化结果通过。

## 工作态

- [x] 首次启动默认进入工作态。
- [x] 猫咪贴在主显示器工作区边缘且可见。
- [x] 工作态猫不会横穿屏幕中央。
- [x] 工作态仍有轻微呼吸/浮动存在感。
- [x] 工作态非紧急照料需求不主动弹气泡。
- [x] 工作态紧急照料需求仍可轻量提示。

证据：

- `defaultWorkMode` 通过：`mode=work, threshold=600, docked=true, renderer=work`。
- `workModeStopsRoaming` 通过：工作态采样期间 roaming 位置不持续变化。
- `workPromptFiltering` 通过：`workGentleHud=false, workUrgentHud=true`。
- `src/renderer/App.module.css` 已提供 `workPresenceBreath` 与 `workPresenceShadow` 微动。

## 闲置态

- [x] 达到当前闲置阈值后进入闲置态。
- [x] 闲置态恢复 M1 自由漫游。
- [x] 闲置态照料提示行为与 M1 一致。
- [x] 用户恢复活动后回到工作态并重新贴边。

证据：

- `idleRestoresRoaming` 通过：闲置态 phases 包含 `spawn / pause / turn / move`，且采样到多个位置。
- `liveIdleToWork` 通过：同一 Electron 进程内观察到 `idle -> work`，最终重新贴边。
- `workPromptFiltering` 通过：`idleGentleHud=true`，闲置态保留 M1 轻提示行为。

## 托盘菜单

- [x] 托盘显示当前模式。
- [x] 托盘显示当前控制方式。
- [x] 托盘显示当前闲置阈值。
- [x] 可选择 `自动`。
- [x] 可选择 `强制工作态`。
- [x] 可选择 `强制闲置态`。
- [x] 可选择 `10 分钟`。
- [x] 可选择 `30 分钟`。
- [x] 可选择 `1 小时`。
- [x] 阈值选择重启后保留。

证据：

- `src/main.js` 的托盘菜单包含当前模式、控制方式、闲置阈值、模式控制和阈值预设。
- `manualOverride` 通过：强制工作态与强制闲置态均生效。
- `thresholdPersistence` 通过：阈值更新后重启仍保留。

## 照料回归

- [x] `Feed` 在工作态和闲置态均可用。
- [x] `Give water` 在工作态和闲置态均可用。
- [x] `Pet` 在工作态和闲置态均可用。
- [x] `Food / Water / Play / Trust` 面板持续可见。
- [x] 打开验证报告可看到 presence mode、阈值与照料事件摘要。

证据：

- `npm run verify:m1-closure` 通过，覆盖 `careActions` 与 `carePersistence`。
- M1 报告确认 `Food / Water / Play / Trust` 面板可见。
- M2 报告记录 mode、threshold、manualOverride、renderer presence mode 和提示过滤结果。

## 结论

M2 双模式存在感本轮 QA 通过：自动化门禁、工作态边界、闲置态漫游、同进程恢复、托盘配置路径、提示过滤和照料回归均有证据支撑。

后续建议进入 M3：基于真实使用反馈调优贴边位置、微动强度、提示阈值和托盘文案。
