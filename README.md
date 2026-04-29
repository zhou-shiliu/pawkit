# Pawkit

Pawkit 是一个桌面猫咪陪伴应用。当前主线目标不是完整数字宠物系统，而是先把 **M1 基线** 收口，并用 `静态主视觉 + 头顶需求提示 + 菜单栏照料入口` 验证桌面存在感与最小照料闭环。

## 当前 M1 定义

当前仓库中的 M1 包含两部分：

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

## 当前状态

- 漫游主链已具备自动化验证能力。
- 最小照料闭环已经落地在代码中，并纳入当前 M1 口径。
- 当前仍不能直接宣布 M1 完成，原因是手工验收与文档收口还未全部完成。
- 当前已经补上本地验证记录，用来回答“用户会不会真的愿意照顾它”这个关键问题。

## 当前验证方式

- 所有验证数据都只保存在本地，不接第三方统计。
- 应用会记录需求提示出现、菜单栏打开、喂食/加水/陪玩动作，以及从提示出现到首次响应的大致耗时。
- 可以直接通过菜单栏里的 `打开验证报告` 查看当前本地摘要。

## 下一阶段方向

下一阶段的产品方向已经更新为 `双模式存在感`，但尚未在当前代码中实现：

- 工作态：猫咪贴边静止，不持续走动，只在紧急需求时提示
- 闲置态：用户一段时间无操作后，猫咪恢复自由活动
- 闲置阈值：做成可配置预设，而不是强绑系统屏保

详见：

- `.omx/plans/prd-dual-presence-mode.md`
- `.omx/plans/test-spec-dual-presence-mode.md`

## 常用命令

```bash
npm install
npm test
npm run build
npm run verify:runtime
npm run verify:m1:manual
npm run verify:m1-closure
npm run electron:dev
```

## 参考文档

- 产品愿景：`docs/MVP-SPEC.md`
- 验证方案：`docs/VALIDATION-PLAN.md`
- M1 需求：`.omx/plans/prd-presence-first-roaming-m1.md`
- M1 测试规范：`.omx/plans/test-spec-presence-first-roaming-m1.md`
- 下一阶段 PRD：`.omx/plans/prd-dual-presence-mode.md`
- 下一阶段测试规范：`.omx/plans/test-spec-dual-presence-mode.md`
- M1 收口标准：`docs/NEXT-PHASE-EXIT-CRITERIA.md`
