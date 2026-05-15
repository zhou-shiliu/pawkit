# M1 收口退出标准

该文档定义当前分支何时才能被认定为 **M1 已完成**。

## 当前 M1 范围

### M1-A：桌面存在感

- 自动出现
- 自主漫游
- 边界限制
- 重启恢复
- 开发/打包运行时一致
- 静态猫咪主视觉与按需提示可见

### M1-B：最小照料闭环

- `Food / Water / Play / Trust` 状态存在
- 状态随时间衰减
- 托盘支持 `Feed / Give water / Pet`
- 状态变化持久化并回显到界面

## 当前不在 M1 范围内的内容

- 复杂动机系统
- 孤独感系统
- 召唤机制
- 复杂互动模式
- 语音/AI
- multi-cat / multi-screen
- IK 动画
- sprite 动画系统

## 必须同时满足的门槛

1. 单一运行时路径明确成立
   - 开发与打包环境不再依赖竞争运行时路径
2. 回归检查通过
   - `npm test`
   - `npm run build`
   - `npx tsc --noEmit --project tsconfig.json`
3. 打包证明通过
   - `npm run pack`
   - `npm run verify:runtime`
4. M1 自动化基线通过
   - `npm run verify:m1:manual`
5. M1 手工验收通过
   - `docs/archive/care-route/M1-MANUAL-QA-CHECKLIST.md` 条目逐项确认
6. 文档与代码一致
   - README、计划、测试规范、验收清单、退出标准使用同一版 M1 定义

## 推荐验证顺序

```bash
npm run verify:m1-closure
```

然后再人工执行：

- `docs/archive/care-route/M1-MANUAL-QA-CHECKLIST.md`

## 结论门槛

只有在以上六项全部满足之后，当前分支才能被认定为 M1 完成。  
在此之前，应继续把当前分支视为 **M1 收口分支**。
