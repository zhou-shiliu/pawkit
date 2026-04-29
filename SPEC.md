# Pawkit 工程说明

## 当前目标

当前仓库的工作目标是完成 **M1：桌面存在感 + 最小照料闭环**。

## 当前结构

```text
src/
├── main.js                 Electron 主进程入口
├── preload.js              预加载桥接
├── shared/
│   ├── roaming.js          漫游状态机与边界逻辑
│   └── careLoop.js         最小照料闭环逻辑
└── renderer/
    ├── App.tsx             桌面 UI
    ├── hooks/
    ├── systems/
    └── components/
```

## 当前能力

### M1-A：桌面存在感

- 自动出现
- 自主漫游
- 边界约束
- 重启恢复
- 开发/打包路径一致

### M1-B：最小照料闭环

- `hunger / hydration / happiness / trustLevel` 状态
- 状态随时间衰减
- 托盘支持喂食、喝水、抚摸
- 状态变化持久化
- 界面显示 `Food / Water / Play / Trust / Mood`

## 当前限制

- 桌面窗口仍默认 click-through，交互入口主要是托盘。
- 最小信任系统已经存在，但仍是轻量版本，不等同于完整关系系统。
- 当前阶段不包含复杂动机、孤独感、召唤、语音、IK 动画等能力。

## 当前结论

当前仓库已经不是“纯漫游 M1”，而是“扩展后的 M1 基线”。  
后续是否进入 M2，应以新的 M1 收口标准为准，而不是沿用旧的“漫游-only”标准。
