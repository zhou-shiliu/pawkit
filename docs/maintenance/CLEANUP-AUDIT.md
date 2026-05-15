# Pawkit 清理盘点

最后更新：2026-05-15

## 当前产品基线

Pawkit 当前默认体验是 **Codex Pet 兼容的轻量桌面宠物陪伴应用**。默认入口应围绕：

- 宠物包加载与校验
- spritesheet 动画播放
- 桌面拖拽与位置记忆
- 托盘导入 / 切换 / 找回
- 轻量状态提示
- GitHub Release 三端下载

## 本轮已清理

### 文档归档

- `docs/releases/v0.1.0/`：集中存放第一个发布版本相关目标、架构、测试、QA、发布说明。
- `docs/archive/care-route/`：归档旧 M1/M2/M3 照料型路线文档。
- `docs/README.md`：新增文档索引，避免 README 承担过多内部文档导航。

### 删除的废弃资源

- `assets/sounds/`：当前 MVP 明确不包含音频/语音互动，源码也没有实际播放引用。
- `scripts/download-sounds.js`
- `scripts/download_sounds.py`
- `package.json` 中的 `download-sounds` 脚本与声音 extraResources 打包配置。

## 本轮不删除但建议后续评估的候选

这些文件仍被 legacy preview、历史验证脚本或自动测试引用；如果要删，应单独做一轮“移除 legacy care runtime”的小版本，并先调整测试边界。

### legacy care / presence / roaming 运行时

- `src/renderer/components/MoodText/`
- `src/renderer/components/StaticCatFigure/`
- `src/renderer/assets/cat-static.svg`
- `src/renderer/hooks/useCatState.ts`
- `src/renderer/hooks/usePresenceState.ts`
- `src/renderer/hooks/useRoamingCatState.ts`
- `src/renderer/hooks/useVisualPresenceState.ts`
- `src/renderer/systems/catBehavior.ts`
- `src/renderer/systems/roamingCat.ts`
- `src/renderer/systems/visualPresence.ts`
- `src/shared/careLoop.js`
- `src/shared/carePresentation.js`
- `src/shared/carePresentation.d.ts`
- `src/shared/presence.js`
- `src/shared/roaming.js`
- `src/shared/validationMetrics.js`

### legacy 验证脚本与测试

- `scripts/test-care-loop.js`
- `scripts/test-presence-mode.js`
- `scripts/test-roaming.js`
- `scripts/test-validation-metrics.js`
- `scripts/test-visual-presence-mode.js`
- `scripts/verify-m1-manual-qa.js`
- `scripts/verify-m2-presence.js`
- `scripts/verify-m3-lifelike-presence.js`

## 建议下一轮清理策略

1. 决定是否彻底移除 `dev:legacy`。
2. 如果移除，先把 `npm test` 收敛到当前 Pet MVP 测试。
3. 删除 legacy renderer 分支和对应 shared 模块。
4. 简化 `src/main.js` 中旧 care / presence / roaming / validation IPC 与定时器。
5. 保留一份历史说明在 `docs/archive/care-route/`，不再让旧路线污染默认产品入口。
