# M1 自动化验收报告

- 生成时间：2026-04-30T01:25:21.389Z
- 自动化结果：**通过**

## 验收项结果

- **startupSpawn**：通过 — Initial roaming snapshot found at /var/folders/mw/g3dxvp9s03s7929vd52rqq700000gn/T/pawkit-m1-qa-m9G3bI/home/Library/Preferences/electron-store-nodejs/config.json
- **autonomousRoaming**：通过 — positions=14, phases=[spawn, pause, turn, move], locomotion=[idle, walk]
- **boundarySafety**：通过 — Bounds={"minX":0,"maxX":1760,"minY":31,"maxY":859}
- **careStateBootstrap**：通过 — hunger=50.00, hydration=62.00, happiness=50.00, trust=1.00
- **careStatusVisible**：通过 — visible=true, text="Food50Water62Play50Trust1.0"
- **restoreNearLastPosition**：通过 — bestDistance=0.00px (tolerance=16px)
- **careActions**：通过 — before={food:49.99,water:61.99,play:50.00,trust:1.00} after={food:77.99,water:87.99,play:72.00,trust:1.19}
- **carePersistence**：通过 — after={food:77.99,water:87.99,play:72.00,trust:1.19} relaunch={food:77.99,water:87.99,play:72.00,trust:1.19}

## 指标明细

```json
{
  "workArea": {
    "x": 0,
    "y": 31,
    "width": 1920,
    "height": 988
  },
  "bounds": {
    "minX": 0,
    "maxX": 1760,
    "minY": 31,
    "maxY": 859
  },
  "initialSnapshot": {
    "x": 1180,
    "y": 595,
    "phase": "spawn",
    "locomotion": "idle",
    "facing": "right",
    "lastUpdatedAt": 1777512322225
  },
  "initialCareSnapshot": {
    "hunger": 50,
    "hydration": 62,
    "happiness": 50,
    "trustLevel": 1,
    "lastFed": null,
    "lastWatered": null,
    "lastPet": null,
    "lastUpdatedAt": 1777512321983
  },
  "rendererStatus": {
    "capturedAt": "2026-04-30T01:25:22.696Z",
    "presenceMode": "idle",
    "text": "Food50Water62Play50Trust1.0",
    "visible": true,
    "rect": {
      "x": 8,
      "y": 13,
      "width": 144,
      "height": 32
    },
    "careStatus": {
      "text": "Food50Water62Play50Trust1.0",
      "visible": true,
      "rect": {
        "x": 8,
        "y": 13,
        "width": 144,
        "height": 32
      }
    },
    "careHud": {
      "text": "",
      "visible": false,
      "rect": null
    }
  },
  "firstRunSampleCount": 32,
  "firstRunFinalSnapshot": {
    "at": "2026-04-30T01:25:29.609Z",
    "x": 811,
    "y": 824,
    "phase": "pause",
    "locomotion": "idle",
    "facing": "left",
    "lastUpdatedAt": 1777512329245
  },
  "uniquePositions": 14,
  "uniquePhases": [
    "spawn",
    "pause",
    "turn",
    "move"
  ],
  "uniqueLocomotion": [
    "idle",
    "walk"
  ],
  "restoreTolerancePx": 16,
  "beforeRelaunch": {
    "x": 811,
    "y": 824,
    "phase": "turn",
    "locomotion": "idle",
    "facing": "right",
    "lastUpdatedAt": 1777512329737
  },
  "relaunchSampleCount": 12,
  "bestRestoreDistance": 0,
  "careActionBefore": {
    "name": "Whiskers",
    "hunger": 49.991857499999995,
    "hydration": 61.990952777777785,
    "happiness": 49.99638111111111,
    "trustLevel": 1,
    "lastUpdatedAt": 1777512331754,
    "lastFed": null,
    "lastWatered": null,
    "lastPet": null
  },
  "careActionAfter": {
    "name": "Whiskers",
    "hunger": 77.99168333333333,
    "hydration": 87.99075925925926,
    "happiness": 71.9963037037037,
    "trustLevel": 1.19,
    "lastUpdatedAt": 1777512331963,
    "lastFed": 1777512331886,
    "lastWatered": 1777512331924,
    "lastPet": 1777512331963
  },
  "persistedCareAfterRelaunch": {
    "hunger": 77.99168333333333,
    "hydration": 87.99075925925926,
    "happiness": 71.9963037037037,
    "trustLevel": 1.19,
    "lastFed": 1777512331886,
    "lastWatered": 1777512331924,
    "lastPet": 1777512331963,
    "lastUpdatedAt": 1777512331963
  }
}
```
