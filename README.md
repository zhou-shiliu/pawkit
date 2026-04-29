# Pawkit

Pawkit 是一个桌面猫咪陪伴应用。当前主线已经从 **M1：桌面存在感 + 最小照料闭环** 推进到 **M2：双模式存在感**：工作时猫咪贴边陪伴、降低打扰；用户闲置后恢复 M1 自由漫游。

## 当前能力

### M1 基线：桌面存在感 + 最小照料闭环

1. 桌面存在感
   - 启动自动出现
   - 自主漫游
   - 屏幕边界限制
   - 重启后位置恢复
   - 静态猫咪主视觉与按需提示常驻可见
2. 最小照料闭环
   - `Food / Water / Play / Trust` 状态存在且会衰减
   - 菜单栏/托盘支持 `Feed / Give water / Pet`
   - 状态变化会持久化并回显到界面

### M2：双模式存在感

- 工作态：默认活跃时进入，猫咪贴主显示器边缘，不横穿工作区，只保留轻微呼吸/浮动微动。
- 闲置态：达到闲置阈值后恢复 M1 漫游。
- 恢复活动：自动从闲置态回到工作态并重新贴边。
- 闲置阈值：默认 `10 分钟`，托盘可选 `10 分钟 / 30 分钟 / 1 小时`。
- 模式控制：托盘可选 `自动 / 强制工作态 / 强制闲置态`。
- 提示策略：工作态抑制非紧急照料气泡，紧急需求仍可轻量提示；闲置态保持 M1 提示行为。

## 当前验证方式

- 所有验证数据都只保存在本地，不接第三方统计。
- 应用会记录需求提示出现、菜单栏打开、喂食/加水/陪玩动作，以及从提示出现到首次响应的大致耗时。
- 可以直接通过菜单栏里的 `打开验证报告` 查看当前本地摘要。
- M2 自动化验证会覆盖默认工作态、闲置漫游、同进程 idle→work 恢复、阈值持久化、手动覆盖和工作态提示过滤。

## 下一阶段方向

下一阶段建议进入 **M3：体验调参与验证闭环**：基于本地验证报告和手工使用反馈，调整工作态贴边位置、微动强度、提示阈值和托盘文案，而不是立即引入复杂设置页、声音、语音、sprite 或 IK。

## 常用命令

```bash
npm install
npm test
npm run build
npx tsc --noEmit --project tsconfig.json
npm run verify:runtime
npm run verify:m1:manual
npm run verify:m1-closure
npm run verify:m2:presence
npm run electron:dev
```

## 参考文档

- 产品愿景：`docs/MVP-SPEC.md`
- 验证方案：`docs/VALIDATION-PLAN.md`
- M1 需求：`.omx/plans/prd-presence-first-roaming-m1.md`
- M1 测试规范：`.omx/plans/test-spec-presence-first-roaming-m1.md`
- M2 PRD：`.omx/plans/prd-dual-presence-mode.md`
- M2 测试规范：`.omx/plans/test-spec-dual-presence-mode.md`
- M2 手工 QA：`docs/M2-PRESENCE-QA-CHECKLIST.md`
- M1 收口标准：`docs/NEXT-PHASE-EXIT-CRITERIA.md`
