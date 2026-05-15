# PRD：M3 鲜活感升级 / Lifelike Presence Upgrade

## 背景

Pawkit 已完成：

- **M1：桌面存在感 + 最小照料闭环**
- **M2：双模式存在感**

当前产品已经达到“技术可运行、可验证、可自用试挂”的状态，但尚未达到用户当前定义的“正常使用”门槛：**我自己愿意长期开着用**。

经 deep-interview 明确，当前阻止长期日用的首要问题不是功能缺失，而是：

> 猫咪看起来仍然像一张简单静态图片，不像一个鲜活的猫。

因此，M3 不再优先补更多通用功能，而是聚焦 **鲜活感 / 生命感升级**。

---

## RALPLAN-DR 摘要

### Principles

1. **先做鲜活感，不做功能膨胀**：M3 的成功标准是“更像猫”，而不是加入更多系统。
2. **保持 M2 边界约束**：工作态仍然低打扰，闲置态仍然比工作态更活跃。
3. **小而真，不大而空**：优先用有限但可信的状态切换建立生命感，而不是堆复杂交互。
4. **验证可见变化，而非抽象主观感受**：必须把“鲜活感”拆成可观测、可验收的状态表现。
5. **不破坏现有门禁**：`verify:m2:presence` 与 `verify:m1-closure` 必须继续成立。
6. **状态切换必须有单一调度所有者**：不能在多个组件/动画源里同时各自决定姿态与节奏。

### Decision Drivers

1. 用户长期日用的核心阻碍是“形象不鲜活”。
2. 用户已明确接受比 M2 更明显的视觉/行为升级。
3. 但用户也明确不希望阶段目标膨胀成语音、AI 聊天、多屏或公开发布准备。

### Viable Options

| Option | Description | Pros | Cons | Decision |
| --- | --- | --- | --- | --- |
| A. 继续单主视觉，只加更强 CSS 微动 | 保留 1 张主图，增强呼吸、位移、缩放、阴影与提示层 | 改动最小，风险低 | 很难真正摆脱“静态图”感，难达成“更像猫的状态切换” | Reject |
| B. 轻量多姿态状态层 | 增加有限数量的猫姿态资源 + 轻量视觉状态机，在 work/idle 下切换姿态与小动作 | 最符合“像猫”的最低成功标准；复杂度可控；可复用现有 presence/roaming 边界 | 需要新增视觉资源与状态映射，验证复杂度上升 | **Choose** |
| C. 完整 sprite/骨骼/高复杂动画系统 | 引入更完整动画资源体系和更复杂动作表达 | 鲜活感潜力最大 | 明显超出当前边界，开发/资源/验证成本太高 | Reject |

### 决策

选择 **Option B：轻量多姿态状态层**。

---

## 目标

让 Pawkit 从“会移动的静态图”升级成“看起来像一只在桌面上活着的猫”，并且优先满足：

> 用户看到它后，会愿意先整天开着观察。

### 最低成功标准

用户在 deep-interview 中确认的最低成功标准是：

- **桌面猫出现更像猫的行为状态切换**

这意味着 M3 必须至少让用户感知到：

- 猫不再始终是同一张姿态
- 猫会在不同场景下切换不同“猫样”状态
- 工作态与闲置态的状态表现存在清晰层级差异

---

## 范围

### In Scope

1. 新增 **轻量多姿态视觉资源层**
   - 在当前单一 `cat-static.svg` 基础上，扩展为有限姿态集合
   - 姿态数量以“够用建立生命感”为目标，而不是丰富收藏型美术系统

2. 新增 **renderer 侧视觉状态机**
   - 基于 `presence.mode`、`roaming.phase`、时间片和轻量随机性驱动状态切换
   - 不在主进程增加第二套复杂行为系统

3. 定义 **最小猫样状态集合**
   - 建议最少包括：
     - `sit_idle`
     - `look_around`
     - `blink_or_breathe`
     - `groom_or_settle`
     - `stretch_or_shift`
     - `walk_pose`（用于 roaming 过程）
   - 首版必须收敛为有限最小集合，建议 V1 只允许：
     - work：`settle` / `look-left` / `look-right` / `blink` / `small-shift`
     - idle-pause：`settle` / `look-left` / `look-right` / `groom` / `stretch`
     - idle-move：`walk-a` / `walk-b`
     - idle-turn：`turn-reset`
   - 不允许在 V1 中继续扩成大姿态库

4. 区分 **work / idle** 模式下的允许状态
   - work：低打扰、贴边、轻状态切换
   - idle：更明显的状态变化，与 roaming 协同

5. 优化 **启动第一眼观感**
   - 启动后不再只看到单一静态图
   - 初始 3-8 秒内应出现至少一次明确的猫样状态变化

6. 新增 M3 自动化/半自动化验证
   - 验证状态切换是否发生
   - 验证 work/idle 的状态边界差异
   - 验证鲜活感升级不破坏现有 M2 门禁

7. 更新文档
   - README / SPEC / M3 PRD / M3 test spec / QA checklist

### Out of Scope / Non-goals

用户已明确下一阶段仍然不做：

- 不做语音 / 音效
- 不做多屏策略
- 不做复杂设置页
- 不做 AI 聊天 / 对话陪伴
- 不重做照料 / 数值系统
- 不做公开发布准备

---

## 用户体验目标

### 工作态（work）

工作态仍然遵守 M2 的“低打扰”原则，但不应再像静态立牌。

应具备：

- 明确但克制的姿态变化
- 比 M2 更像猫的微状态切换
- 不横穿屏幕中央
- 不制造频繁、突兀、吸引注意力过强的动作

工作态建议允许的视觉状态：

- `settle`
- `look-left`
- `look-right`
- `blink`
- `small-shift`

工作态建议禁止：

- 明显夸张的大动作
- 高频动作切换
- 类似“表演型”的连续动作

### 闲置态（idle）

闲置态应比当前 M2 更有陪伴感。

应具备：

- roaming 之外的停顿态表现
- 在 pause / turn / move 之间出现更猫样的过渡感
- 比工作态明显更活跃，但不杂乱

闲置态建议允许的视觉状态：

- 走动姿态切换
- 停下后观察/整理/伸展
- 短暂停顿中的小动作

### 启动第一眼

启动后 3-8 秒内，用户应能看到：

- 至少一次与静态图明显不同的状态切换
- 明确感受到“它不是一张固定贴图”

---

## 技术设计

### 1. 视觉资源层

新增有限姿态资源（命名示例）：

- `cat-sit.svg`
- `cat-look-left.svg`
- `cat-look-right.svg`
- `cat-groom.svg`
- `cat-stretch.svg`
- `cat-walk-a.svg`
- `cat-walk-b.svg`

资源原则：

- 保持同一美术风格与体量
- 尽量共享轮廓比例，避免切换时大幅跳动
- 资源数量控制在首版可维护范围内
- 使用统一画板尺寸（建议继续沿用 160×160 窗口尺度）
- 使用统一落点/地面锚点，避免姿态切换时“漂移”
- 默认以右向母版绘制，左向优先使用镜像；仅在确有必要时新增非对称版本

### 2. 视觉状态模型

新增 renderer 级 visual state（示例）：

- `settle`
- `look-left`
- `look-right`
- `blink`
- `small-shift`
- `groom`
- `stretch`
- `walk-a`
- `walk-b`
- `turn-reset`

建议采用明确的双层实现：

- `src/shared/visualPresence.js`
  - 负责视觉状态规范化
  - 根据 `presence.mode` / `roaming.phase` / 当前状态 / 时间片解析下一个 visual state
  - 保持纯函数，可单测

- `src/renderer/hooks/useVisualPresenceState.ts`
  - 作为 visual state 的**单一调度所有者**
  - 负责 tick、dwell time、固定种子/禁用随机性支持，以及向组件输出当前 visual state

**架构约束：**

- visual state 的解析必须由 **单一所有者** 负责（`visualPresence.js` + `useVisualPresenceState.ts`）
- 不允许 `App.tsx`、`StaticCatFigure`、CSS 动画分别各自独立决定“下一姿态”
- CSS 只负责辅助次级运动（如轻微呼吸/细节摆动），不负责主姿态切换决策

### 3. 状态驱动关系

建议映射：

- `presence.mode = work`
  - 优先 `settle / look-left / look-right / blink / small-shift`
- `presence.mode = idle && roaming.phase = move`
  - 使用 `walk-a / walk-b`
- `presence.mode = idle && roaming.phase = pause`
  - 优先 `settle / look-left / look-right / groom / stretch`
- `presence.mode = idle && roaming.phase = turn`
  - 允许短时方向重置态

### 3.1 节奏约束（避免 work 态重新变吵）

建议直接固定首版节奏边界：

- **work 模式**
  - 主姿态切换最短间隔：`>= 4s`
  - 明显姿态切换频率：`<= 1 次 / 8s`
  - 禁止连续高频切换

- **idle 模式**
  - 停顿态主姿态切换最短间隔：`>= 2s`
  - walking 可按更高频率在 `walk-a / walk-b` 间交替

这类节奏边界必须被自动化配置或固定种子模式验证。

### 4. 组件边界

当前 `StaticCatFigure` 应演进为更通用的视觉呈现组件，例如：

- `CatFigure`

输入可包括：

- `facing`
- `trustLevel`
- `visualState`
- `presenceMode`

### 5. 自动化可测性

需要为自动化增加可观测状态：

- DOM 上暴露 `data-visual-state`
- 必要时暴露 `data-cat-pose`
- 自动化 renderer snapshot 中记录 visual state

建议新增环境变量支持：

- `PAWKIT_AUTOMATION_VISUAL_STATE_FILE`
- `PAWKIT_AUTOMATION_VISUAL_SEQUENCE`
- `PAWKIT_AUTOMATION_DISABLE_VISUAL_RANDOMNESS=1`
- `PAWKIT_AUTOMATION_VISUAL_SEED`

### 6. 验证脚本

新增：

- `scripts/verify-m3-lifelike-presence.js`

验证内容：

- work 模式中能看到至少 2-3 个低打扰视觉状态
- idle 模式中能看到更丰富的视觉状态切换
- 启动首屏在限定时间内出现状态变化
- M2 与 M1 现有门禁继续通过

---

## 验收标准

1. 用户第一眼不再把它视为“简单静态图片”
2. 工作态下存在可感知但克制的猫样状态切换
3. 闲置态下状态变化明显多于工作态
4. `walk-a / walk-b / turn-reset / settle / blink / groom / stretch` 等状态具有清晰差异
5. 启动后 3-8 秒内至少出现一次明确状态变化
6. `verify:m2:presence` 继续通过
7. `verify:m1-closure` 继续通过
8. 新增 `verify:m3:livelike` 通过
9. README / SPEC / M3 文档一致

其中：

- 1-5 用于证明“鲜活感升级是否成立”
- 6-9 属于工程与 QA 门禁
- 用户“愿意整天开着”的主观结论应在手工 QA/真实使用反馈中记录，而不是替代工程门禁

---

## 风险

1. **资源多了但仍不鲜活**
   - 需要避免“多几张图但依旧像切 PPT”

2. **工作态重新变吵**
   - 鲜活感增强不能破坏 M2 的 anti-interruption 原则

3. **验证困难**
   - 若不在 DOM / snapshot 中显式暴露 visual state，自动化将难以稳定判断

4. **实现层级失控**
   - 必须避免演进成完整动画系统

5. **姿态切换像翻 PPT**
   - 即使资源数变多，只要缺少节奏与锚点约束，仍可能不像猫

---

## Follow-ups

M3 完成后，再根据真实长期自用反馈判断：

- 是否需要继续增强直接交互
- 是否需要引入更丰富行为节律
- 是否值得进入小范围外部试用
