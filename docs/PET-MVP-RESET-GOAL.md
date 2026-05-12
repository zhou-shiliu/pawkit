# Goal: Pet MVP Reset

## 目标一句话

把 Pawkit 收缩为一个 **Codex Pet 风格兼容的桌面宠物播放器**：用户打开应用后，能在 10 秒内看到一个动态、可替换、低打扰的桌面宠物。

## 为什么重置

当前 Pawkit 已经完成 M1/M2/M3 方向的多层能力，包括照料闭环、双模式存在感和鲜活感升级。但这些能力让产品更像一个复杂陪伴应用，而不是一个能被快速理解和快速喜欢的桌宠 MVP。

Pet MVP Reset 的判断是：

- MVP 第一性目标不是照料系统完整，而是宠物形象先成立。
- 用户第一眼应该感受到“它活着”，而不是先理解状态面板、数值和模式。
- 兼容 Codex Pet 风格资源，可以让宠物外形变成可替换资产，而不是被 Pawkit 的单一猫咪 UI 绑定。

## 用户承诺

第一版只承诺这些体验：

1. 打开应用后，一个动态宠物自动出现在桌面上。
2. 宠物会播放基础动作，不再像静态图片。
3. 用户可以点击宠物，宠物会有即时反馈。
4. 用户可以更换或导入宠物包。
5. 用户工作时，宠物保持低打扰。
6. 用户不需要理解照料数值、复杂设置或验证报告。

## MVP 范围

### In Scope

- 内置一个默认宠物包。
- 支持 Codex Pet 风格宠物包：
  - `pet.json`
  - `spritesheet.webp`
- 支持宠物包校验和优雅失败提示。
- 支持基础动画播放：
  - `idle`
  - `running-right`
  - `running-left`
  - `waving`
  - `jumping`
  - `failed`
  - `waiting`
  - `running`
  - `review`
- 支持 Pawkit 语义状态到宠物动作的映射。
- 支持托盘基础操作：
  - 显示/隐藏宠物
  - 更换宠物
  - 导入宠物
  - 退出
- 支持桌面位置基础能力：
  - 鼠标拖拽宠物
  - 保存和恢复位置
  - 限制在可见屏幕边界内
  - 显示器变化后自动回到可见区域
  - 气泡或状态提示不被窗口边界裁切
- 支持本地保存：
  - 当前宠物
  - 窗口位置
  - 显示/隐藏偏好
- 支持最小自动化验证门禁。

### Out of Scope

- 不做照料数值默认入口。
- 不做 Food / Water / Play / Trust 面板。
- 不做复杂设置页。
- 不做音效、语音或音频反馈。
- 不做 AI 聊天。
- 不做多屏策略。
- 不做公开发布准备。
- 不做宠物生成器 Hatchery。
- 不做骨骼、IK 或复杂动画系统。
- 不把旧 M1/M2/M3 系统作为 MVP 正面体验。

## 语义状态

Pawkit 内部只保留少量语义状态。它们描述“当前意图”，不直接绑定某个宠物资源的具体动作名。

| Pawkit 语义 | 触发来源 | Codex Pet 动作优先级 |
| --- | --- | --- |
| `idle` | 应用启动、无特殊事件 | `idle` -> `waiting` |
| `working` | 用户活跃、需要低打扰 | `waiting` -> `running` -> `idle` |
| `attention` | 用户点击宠物 | `waving` -> `jumping` -> `idle` |
| `success` | 外部任务成功或正向事件 | `jumping` -> `review` -> `waving` |
| `failed` | 外部任务失败或负向事件 | `failed` -> `idle` |
| `sleepy` | 长时间无操作 | `waiting` -> `idle` |
| `movingRight` | 宠物向右移动 | `running-right` -> `running` -> `idle` |
| `movingLeft` | 宠物向左移动 | `running-left` -> `running-right` -> `running` -> `idle` |

## 社区宠物来源

CodexPets.app 已经提供社区宠物库、宠物上传入口和安装工具，可作为 Pawkit 的兼容参考和未来导入源。

首版策略：

- 支持用户导入 CodexPets 风格宠物包。
- 不默认打包社区宠物资产，除非许可证和授权明确。
- 内置宠物包应使用 Pawkit 自有或明确授权的原创资产。
- 可参考 CodexPets 的 gallery、search、install 和 petagotchi 体验设计，但不能把社区资源直接当作内置资产复制进仓库。

## 成功标准

Pet MVP Reset 完成时，必须满足：

1. 首次启动默认宠物可见，并且 10 秒内有明确动态变化。
2. 宠物不是 React/CSS 拼出来的静态插画，而是由宠物包资源驱动。
3. 至少一个内置宠物包可以被加载、校验和播放。
4. 缺失某个动作时，运行时会 fallback，不会白屏或崩溃。
5. 点击宠物会触发 `attention` 反馈。
6. 宠物可以被移动到用户想要的位置，并且不会跑出可见屏幕。
7. 切换桌面、显示器变化或恢复旧坐标后，宠物仍能回到可见区域。
8. 托盘能显示/隐藏、切换或导入宠物、退出应用。
9. 旧照料系统不会出现在 MVP 默认界面。
10. 新增 Pet MVP 验证门禁通过。
11. README / SPEC / 架构文档 / 测试规范使用同一套目标定义。

## 执行规则

后续实现前，先阅读：

1. `docs/PET-MVP-RESET-GOAL.md`
2. `docs/PET-MVP-RESET-ARCHITECTURE.md`
3. `docs/PET-MVP-RESET-TEST-SPEC.md`

任何新增功能都必须回答：

- 它是否让用户更快看到一个活着的宠物？
- 它是否服务于宠物包播放、切换或低打扰存在？
- 它是否会把 MVP 拉回复杂照料应用？

如果答案偏离 MVP，默认推迟到 Reset 之后的增强阶段。
