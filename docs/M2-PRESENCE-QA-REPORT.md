# M2 双模式存在感自动化验收报告

- 生成时间：2026-04-30T01:24:27.252Z
- 自动化结果：**通过**

## 验收项结果

- **defaultWorkMode**：通过 — mode=work, threshold=600, docked=true, renderer=work
- **workModeStopsRoaming**：通过 — uniqueRoamingPositions=1
- **idleRestoresRoaming**：通过 — mode=idle, positions=18, phases=[spawn, pause, turn, move]
- **liveIdleToWork**：通过 — sequence=idle>idle>idle>idle>idle>idle>idle>idle>idle>idle>idle>idle>idle>idle>idle>idle>idle>work>work>work>work>work>work>work>work>work>work>work, idlePositions=7, finalDocked=true
- **thresholdPersistence**：通过 — runtime=1800, store=1800
- **manualOverride**：通过 — forcedWork=work/work, forcedIdle=idle/idle
- **workPromptFiltering**：通过 — workGentleHud=false, workUrgentHud=true, idleGentleHud=true

## 指标明细

```json
{
  "defaultWork": {
    "sampleCount": 17,
    "latest": {
      "at": "2026-04-30T01:24:32.897Z",
      "presence": {
        "mode": "work",
        "idleThresholdSeconds": 600,
        "systemIdleSeconds": 0,
        "idleState": "active",
        "manualOverride": "auto",
        "lastModeChangedAt": 1777512268600,
        "lastUpdatedAt": 1777512272705,
        "dock": {
          "x": 1724,
          "y": 709,
          "facing": "left",
          "locomotion": "idle",
          "phase": "pause",
          "lastUpdatedAt": 1777512272897
        }
      },
      "roaming": {
        "x": 1127,
        "y": 604,
        "facing": "right",
        "locomotion": "idle",
        "phase": "spawn",
        "lastUpdatedAt": 1777512268600
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
    "uniquePositions": 18,
    "phases": [
      "spawn",
      "pause",
      "turn",
      "move"
    ],
    "latest": {
      "at": "2026-04-30T01:24:39.957Z",
      "presence": {
        "mode": "idle",
        "idleThresholdSeconds": 600,
        "systemIdleSeconds": 600,
        "idleState": "idle",
        "manualOverride": "auto",
        "lastModeChangedAt": 1777512273564,
        "lastUpdatedAt": 1777512279671,
        "dock": {
          "x": 1724,
          "y": 709,
          "facing": "left",
          "locomotion": "idle",
          "phase": "pause",
          "lastUpdatedAt": 1777512279957
        }
      },
      "roaming": {
        "x": 1016,
        "y": 466,
        "facing": "left",
        "locomotion": "walk",
        "phase": "move",
        "lastUpdatedAt": 1777512279924
      },
      "windowBounds": {
        "x": 1016,
        "y": 466,
        "width": 160,
        "height": 160
      },
      "automationIdleSequenceIndex": 0,
      "renderer": {
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
    "idleUniquePositions": 7,
    "final": {
      "at": "2026-04-30T01:24:46.970Z",
      "presence": {
        "mode": "work",
        "idleThresholdSeconds": 600,
        "systemIdleSeconds": 0,
        "idleState": "active",
        "manualOverride": "auto",
        "lastModeChangedAt": 1777512284682,
        "lastUpdatedAt": 1777512286699,
        "dock": {
          "x": 1724,
          "y": 709,
          "facing": "left",
          "locomotion": "idle",
          "phase": "pause",
          "lastUpdatedAt": 1777512286970
        }
      },
      "roaming": {
        "x": 1194,
        "y": 571,
        "facing": "left",
        "locomotion": "walk",
        "phase": "move",
        "lastUpdatedAt": 1777512284618
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
    "lastModeChangedAt": 1777512287537
  },
  "promptFiltering": {
    "workGentle": {
      "capturedAt": "2026-04-30T01:25:01.634Z",
      "presenceMode": "work",
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
      "capturedAt": "2026-04-30T01:25:02.777Z",
      "presenceMode": "work",
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
      "capturedAt": "2026-04-30T01:25:03.821Z",
      "presenceMode": "idle",
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
