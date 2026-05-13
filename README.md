# Pawkit

Pawkit 是一个桌面宠物实验项目。当前产品方向已经从原先的 **M1/M2/M3 照料型桌面猫** 收缩为 **Pet MVP Reset**：优先做一个 Codex Pet 风格兼容的桌面宠物播放器，让用户先快速体验一个动态、可替换、低打扰的桌宠。

新的目标契约见：

- `docs/PET-MVP-RESET-GOAL.md`
- `docs/PET-MVP-RESET-ARCHITECTURE.md`
- `docs/PET-MVP-RESET-TEST-SPEC.md`
- `docs/PET-MVP-CLOSURE-PLAN.md`

> 旧 M1/M2/M3 能力暂时保留为历史能力和后续增强素材，但不再作为 MVP 默认体验的中心。

## 历史能力

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

## 历史验证方式

- 所有验证数据都只保存在本地，不接第三方统计。
- 应用会记录需求提示出现、菜单栏打开、喂食/加水/陪玩动作，以及从提示出现到首次响应的大致耗时。
- 可以直接通过菜单栏里的 `打开验证报告` 查看当前本地摘要。
- M2 自动化验证会覆盖默认工作态、闲置漫游、同进程 idle→work 恢复、阈值持久化、手动覆盖和工作态提示过滤。

## Pet MVP Reset 目标

Pet MVP Reset 聚焦“宠物播放器”，而不是继续扩展照料系统。当前文档约束如下：

- 内置原创占位宠物 `Pawkit Sprout`，新环境无需社区资产也能看到宠物。
- 支持 Codex Pet 风格宠物包：`pet.json + spritesheet.webp`。
- 通过 adapter 把外部宠物资源转换为 Pawkit 内部 normalized manifest。
- 用少量语义状态驱动动作：`idle / working / attention / success / failed / sleepy / movingLeft / movingRight`。
- 支持点击、双击、拖拽方向动作、位置保存/找回。
- 支持从托盘导入、切换宠物包；导入资产写入用户数据目录，不写入仓库。
- 默认托盘只保留显示、隐藏、找回/重置位置、导入、切换、退出。
- 默认界面不展示旧照料面板、复杂设置页或验证报告。
- `npm run dev` 与 `npm start` 都进入 Pet MVP 桌面宠物入口；旧照料界面仅作为 legacy 预览保留。
- `verify:pet-mvp` 是 Reset 后的主门禁；本阶段闭环计划见 `docs/PET-MVP-CLOSURE-PLAN.md`。

## 历史 M3 目标

M3 曾聚焦 **鲜活感 / 生命感升级**，而不是继续功能膨胀。历史文档约束如下：

- 在 M2 work / idle 边界上增加有限多姿态视觉资源与状态切换。
- 先解决“看起来不像活着的猫”的核心问题，而不是扩展语音、AI、多屏或复杂设置。
- 独立的 `verify:m3:livelike` 验证门禁用于保护当时的 M3 目标。
- Reset 之后，M3 作为历史经验保留，不再作为当前 MVP 的实现主线。

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
npm run verify:m3:livelike
npm run verify:pet-mvp
npm run dev        # 启动 Electron 桌面宠物 MVP
npm run dev:web    # 仅网页预览，不加载本地宠物包
npm run dev:legacy # 查看旧照料界面预览
```

## 参考文档

- 产品愿景：`docs/MVP-SPEC.md`
- 验证方案：`docs/VALIDATION-PLAN.md`
- Pet MVP Reset 目标：`docs/PET-MVP-RESET-GOAL.md`
- Pet MVP Reset 架构：`docs/PET-MVP-RESET-ARCHITECTURE.md`
- Pet MVP Reset 测试规范：`docs/PET-MVP-RESET-TEST-SPEC.md`
- Pet MVP 闭环计划：`docs/PET-MVP-CLOSURE-PLAN.md`
- M1 需求：`.omx/plans/prd-presence-first-roaming-m1.md`
- M1 测试规范：`.omx/plans/test-spec-presence-first-roaming-m1.md`
- M2 PRD：`docs/M2-PRESENCE-PRD.md`
- M2 测试规范：`docs/M2-PRESENCE-TEST-SPEC.md`
- M2 手工 QA：`docs/M2-PRESENCE-QA-CHECKLIST.md`
- M3 PRD：`docs/M3-LIFELIKE-PRD.md`
- M3 测试规范：`docs/M3-LIFELIKE-TEST-SPEC.md`
- M3 手工 QA：`docs/M3-LIFELIKE-QA-CHECKLIST.md`
- M3 审查备注：`docs/M3-LIFELIKE-REVIEW-NOTES.md`
- M1 收口标准：`docs/NEXT-PHASE-EXIT-CRITERIA.md`
