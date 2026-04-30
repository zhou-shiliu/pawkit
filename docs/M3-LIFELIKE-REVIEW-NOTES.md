# M3 鲜活感升级审查备注

> 审查时间：2026-04-30（Asia/Shanghai）  
> 审查范围：对照 `.omx/plans/prd-lifelike-presence-upgrade-m3.md` 与 `.omx/plans/test-spec-lifelike-presence-upgrade-m3.md`，检查当前仓库是否已具备 M3 鲜活感升级的实现、验证和文档基线。  
> 当前结论：**仓库当前仍以 M2 双模式存在感为可运行基线，M3 需求与测试规范已明确，但核心鲜活感实现、`verify:m3:livelike` 门禁和对应自动化证据尚未落地。**

## 当前差距（对照 M3 计划）

1. **主视觉仍是单一静态猫资源**  
   `src/renderer/components/StaticCatFigure/StaticCatFigure.tsx` 仍只渲染 `cat-static.svg`，没有多姿态资源层、`data-visual-state` 或 `data-cat-pose` 暴露。
2. **缺少 renderer 侧视觉状态机**  
   当前只有 M2 的 `presence.mode` 与 roaming 相位；还没有 M3 计划要求的视觉状态规范化、dwell time、随机性控制和单一视觉调度所有者。
3. **缺少 M3 自动化门禁**  
   当前 `package.json` 只包含 `verify:m2:presence` 与 `verify:m1-closure`，尚无 `verify:m3:livelike`、`scripts/verify-m3-lifelike-presence.js` 或 `scripts/test-visual-presence-mode.js`。
4. **自动化采样尚未记录 visual state**  
   当前运行时验证主要记录 presence、roaming、window bounds 与 care HUD；尚未采样 `data-visual-state`、`data-cat-pose` 或 pose 锚点稳定性信号。

## 文档与实现协同约束

### 必须保护的现有门禁

- `npm run verify:m2:presence`
- `npm run verify:m1-closure`

### 关键回归风险

1. **M1 验证语义漂移**  
   `verify:m1:manual` 必须继续使用 `PAWKIT_AUTOMATION_PRESENCE_OVERRIDE=idle` 强制保持 M1 roaming 语义，否则默认工作态会掩盖 M1 漫游回归。
2. **窗口移动所有权分裂**  
   `mainWindow.setBounds` 必须继续保持单一所有者；不能让 roaming tick、presence tick 与未来 visual tick 同时争抢窗口位置。
3. **roaming / dock 持久化污染**  
   `cat.roaming` 必须继续代表真实漫游位置；工作态 dock 坐标不能反复覆盖 M1 roaming 快照。
4. **工作态提示过滤回退**  
   M3 任何视觉升级都不能破坏 M2 的 work-mode care prompt 过滤：非紧急抑制、紧急保留、idle 维持 M1 行为。

## 文档 lane 的安全编辑面

适合本 lane 维护的文件：

- `README.md`
- `SPEC.md`
- `docs/M3-LIFELIKE-PRD.md`
- `docs/M3-LIFELIKE-TEST-SPEC.md`
- `docs/M3-LIFELIKE-QA-CHECKLIST.md`
- `docs/M3-LIFELIKE-REVIEW-NOTES.md`

本 lane 避免直接改动的共享实现面：

- `src/main.js`
- `src/shared/presence.js`
- `src/shared/validationMetrics.js`
- `src/preload.js`
- `src/renderer/App.tsx`
- `src/renderer/App.module.css`

## 对后续实现 / 验证 lane 的交接建议

1. **先落地可测试的 visual state 合约，再替换主视觉资源**：优先保证 `data-visual-state` / `data-cat-pose`、随机性控制和 dwell time 可被自动化稳定观察。
2. **把 M3 验证命令单独立起来**：新增 `npm run verify:m3:livelike`，并让它与 `verify:m2:presence`、`verify:m1-closure` 并列，而不是覆盖现有门禁。
3. **保持 README / SPEC 与实现状态一致**：在 `verify:m3:livelike` 真正存在前，不应把 M3 说成“已完成”；应明确它是当前分支的目标升级，而 M2 仍是当前可运行基线。
