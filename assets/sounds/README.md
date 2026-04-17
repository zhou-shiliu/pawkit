# Project Mew 音频库

## 目录结构
```
sounds/
├── ambient/          # 环境音（猫在家里的背景声）
├── meow/             # 喵叫（各种情绪）
├── purr/             # 呼噜声
├── interact/         # 互动音效
└── system/           # 系统提示音
```

## 需要的音频清单

### 1. 喵叫类 (meow/)
| 文件名 | 用途 | 情绪 | 搜索关键词 |
|--------|------|------|-----------|
| meow_short.mp3 | 日常回应、叫主人 | 好奇/打招呼 | cat meow short |
| meow_long.mp3 | 想引起注意、撒娇 | 渴望/撒娇 | cat meow long |
| meow_hungry.mp3 | 饥饿时叫 | 饥饿/焦躁 | cat meow hungry |
| meow_angry.mp3 | 被惹生气 | 愤怒/不满 | cat meow angry |
| meow_sad.mp3 | 孤独、想被关注 | 哀怨/可怜 | cat meow sad |
| meow_surprised.mp3 | 被吓到/突然发现 | 惊讶/警觉 | cat meow surprised |
| meow_content.mp3 | 被摸舒服了 | 满足 | cat meow content |
| meow_greeting.mp3 | 见到主人回家 | 兴奋/欢迎 | cat meow greeting |

### 2. 呼噜类 (purr/)
| 文件名 | 用途 | 搜索关键词 |
|--------|------|-----------|
| purr_soft.mp3 | 放松、被抚摸 | cat purr soft |
| purr_sleepy.mp3 | 打盹时的呼噜 | cat purr sleepy |
| purr_happy.mp3 | 非常满足 | cat purr happy |

### 3. 互动音效 (interact/)
| 文件名 | 用途 | 搜索关键词 |
|--------|------|-----------|
| chirp.mp3 | 发现猎物/鸟 | cat chirp bird |
| chattering.mp3 | 看到窗外鸟（牙齿打颤） | cat chattering |
| hiss.mp3 | 生气/警告/应激 | cat hiss |
| growl.mp3 | 低沉警告 | cat growl |
| yowl.mp3 | 长时间独处/发情 | cat yowl |
| mew_kitten.mp3 | 小猫叫声（可爱） | kitten mew |
| lick.mp3 | 舔毛声 | cat licking |
| scratch.mp3 | 抓挠声（磨爪子） | cat scratch |
| jump_land.mp3 | 跳落声 | cat jump landing |
| stretch.mp3 | 伸懒腰 | cat stretch |

### 4. 环境音 (ambient/)
| 文件名 | 用途 | 搜索关键词 |
|--------|------|-----------|
| ambient_home.mp3 | 家里环境音（模糊猫叫背景） | cat ambient home |
| ambient_night.mp3 | 夜晚环境音 | night ambient cat |
| rain_window.mp3 | 窗外雨声（猫喜欢看雨） | rain window cat |

### 5. 系统音效 (system/)
| 文件名 | 用途 | 说明 |
|--------|------|------|
| food_bowl_empty.mp3 | 猫粮碗空了提醒 | 短提示音 |
| water_empty.mp3 | 水碗空了提醒 | 短提示音 |
| notification.mp3 | 通知声 | 柔和提示音 |

---

## 来源

优先从以下网站收集（CC0/免费商用）：

1. **Freesound.org** - 最多猫叫声效
   - 搜索词：`cat [sound_type]` + `license:"Creative Commons 0"`
   - 示例：https://freesound.org/search/?q=cat+meow&f=license%3A%22Creative+Commons+0%22

2. **Pixabay.com** - 免费可商用
   - 搜索词：cat sound effect free

3. **Mixkit.co** - 免费可商用
   - 搜索词：cat sounds free

---

## 版权说明

所有音频必须使用 **CC0 (Public Domain)** 或 **Free Cultural Works** 许可，
确保可用于商业项目且无需署名。

检查许可：`license:"Creative Commons 0"` 或 `license:"Attribution"`

---

## 下载后检查清单

- [ ] 每个情绪类别至少 1 个音频
- [ ] 总时长：ambient 30s-3min，其他 1-10s
- [ ] 格式：MP3 或 WAV
- [ ] 音质：清晰的单一声源，无过多背景噪音
- [ ] 版权：确认 CC0/免费商用
