# M2 双模式存在感自动化验收报告

- 生成时间：2026-04-30T03:43:14.427Z
- 自动化结果：**通过**

## 验收项结果

- **defaultWorkMode**：通过 — mode=work, threshold=600, docked=true, renderer=work
- **workModeStopsRoaming**：通过 — uniqueRoamingPositions=1
- **idleRestoresRoaming**：通过 — mode=idle, positions=12, phases=[spawn, pause, turn, move]
- **liveIdleToWork**：通过 — sequence=idle>idle>idle>idle>idle>idle>idle>idle>idle>idle>idle>idle>idle>idle>idle>idle>idle>work>work>work>work>work>work>work>work>work>work>work, idlePositions=9, finalDocked=true
- **thresholdPersistence**：通过 — runtime=1800, store=1800
- **manualOverride**：通过 — forcedWork=work/work, forcedIdle=idle/idle
- **workPromptFiltering**：通过 — workGentleHud=false, workUrgentHud=true, idleGentleHud=true

## 指标明细

```json
{
  "defaultWork": {
    "sampleCount": 17,
    "latest": {
      "at": "2026-04-30T03:43:18.511Z",
      "presence": {
        "mode": "work",
        "idleThresholdSeconds": 600,
        "systemIdleSeconds": 0,
        "idleState": "active",
        "manualOverride": "auto",
        "lastModeChangedAt": 1777520594600,
        "lastUpdatedAt": 1777520597687,
        "dock": {
          "x": 1724,
          "y": 709,
          "facing": "left",
          "locomotion": "idle",
          "phase": "pause",
          "lastUpdatedAt": 1777520598511
        }
      },
      "roaming": {
        "x": 1293,
        "y": 663,
        "facing": "right",
        "locomotion": "idle",
        "phase": "spawn",
        "lastUpdatedAt": 1777520594600
      },
      "windowBounds": {
        "x": 1724,
        "y": 709,
        "width": 160,
        "height": 160
      },
      "automationIdleSequenceIndex": 0,
      "renderer": {
        "presenceMode": "work",
        "visualState": "settle",
        "catPose": "sit",
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
      }
    },
    "uniqueRoamingPositions": 1
  },
  "idleRoaming": {
    "sampleCount": 28,
    "uniquePositions": 12,
    "phases": [
      "spawn",
      "pause",
      "turn",
      "move"
    ],
    "latest": {
      "at": "2026-04-30T03:43:25.421Z",
      "presence": {
        "mode": "idle",
        "idleThresholdSeconds": 600,
        "systemIdleSeconds": 600,
        "idleState": "idle",
        "manualOverride": "auto",
        "lastModeChangedAt": 1777520599038,
        "lastUpdatedAt": 1777520605154,
        "dock": {
          "x": 1724,
          "y": 709,
          "facing": "left",
          "locomotion": "idle",
          "phase": "pause",
          "lastUpdatedAt": 1777520605421
        }
      },
      "roaming": {
        "x": 983,
        "y": 321,
        "facing": "left",
        "locomotion": "walk",
        "phase": "move",
        "lastUpdatedAt": 1777520605394
      },
      "windowBounds": {
        "x": 983,
        "y": 321,
        "width": 160,
        "height": 160
      },
      "automationIdleSequenceIndex": 0,
      "renderer": {
        "presenceMode": "idle",
        "visualState": "walk-a",
        "catPose": "walk-a",
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
      }
    }
  },
  "liveTransition": {
    "sampleCount": 28,
    "modeSequence": [
      "idle",
      "idle",
      "idle",
      "idle",
      "idle",
      "idle",
      "idle",
      "idle",
      "idle",
      "idle",
      "idle",
      "idle",
      "idle",
      "idle",
      "idle",
      "idle",
      "idle",
      "work",
      "work",
      "work",
      "work",
      "work",
      "work",
      "work",
      "work",
      "work",
      "work",
      "work"
    ],
    "idleUniquePositions": 9,
    "final": {
      "at": "2026-04-30T03:43:32.312Z",
      "presence": {
        "mode": "work",
        "idleThresholdSeconds": 600,
        "systemIdleSeconds": 0,
        "idleState": "active",
        "manualOverride": "auto",
        "lastModeChangedAt": 1777520610014,
        "lastUpdatedAt": 1777520612030,
        "dock": {
          "x": 1724,
          "y": 709,
          "facing": "left",
          "locomotion": "idle",
          "phase": "pause",
          "lastUpdatedAt": 1777520612312
        }
      },
      "roaming": {
        "x": 1134,
        "y": 503,
        "facing": "right",
        "locomotion": "walk",
        "phase": "move",
        "lastUpdatedAt": 1777520609946
      },
      "windowBounds": {
        "x": 1724,
        "y": 709,
        "width": 160,
        "height": 160
      },
      "automationIdleSequenceIndex": 6,
      "renderer": {
        "presenceMode": "work",
        "visualState": "settle",
        "catPose": "sit",
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
      }
    }
  },
  "thresholdStore": {
    "idleThresholdSeconds": 1800,
    "manualOverride": "auto",
    "lastModeChangedAt": 1777520612879
  },
  "promptFiltering": {
    "workGentle": {
      "capturedAt": "2026-04-30T03:43:46.750Z",
      "presenceMode": "work",
      "visualState": "settle",
      "catPose": "sit",
      "text": "Food28Water62Play50Trust1.0",
      "visible": true,
      "rect": {
        "x": 8,
        "y": 13,
        "width": 144,
        "height": 32
      },
      "careStatus": {
        "text": "Food28Water62Play50Trust1.0",
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
    "workUrgent": {
      "capturedAt": "2026-04-30T03:43:47.828Z",
      "presenceMode": "work",
      "visualState": "settle",
      "catPose": "sit",
      "text": "Food18Water62Play50Trust1.0",
      "visible": true,
      "rect": {
        "x": 8,
        "y": 13,
        "width": 144,
        "height": 32
      },
      "careStatus": {
        "text": "Food18Water62Play50Trust1.0",
        "visible": true,
        "rect": {
          "x": 8,
          "y": 13,
          "width": 144,
          "height": 32
        }
      },
      "careHud": {
        "text": "肚子有点空了",
        "visible": true,
        "rect": {
          "x": 43,
          "y": 60,
          "width": 74,
          "height": 50
        }
      }
    },
    "idleGentle": {
      "capturedAt": "2026-04-30T03:43:48.845Z",
      "presenceMode": "idle",
      "visualState": "settle",
      "catPose": "sit",
      "text": "Food28Water62Play50Trust1.0",
      "visible": true,
      "rect": {
        "x": 8,
        "y": 13,
        "width": 144,
        "height": 32
      },
      "careStatus": {
        "text": "Food28Water62Play50Trust1.0",
        "visible": true,
        "rect": {
          "x": 8,
          "y": 13,
          "width": 144,
          "height": 32
        }
      },
      "careHud": {
        "text": "想吃点东西",
        "visible": true,
        "rect": {
          "x": 43,
          "y": 60,
          "width": 74,
          "height": 50
        }
      }
    }
  }
}
```
