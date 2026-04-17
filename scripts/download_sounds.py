#!/usr/bin/env python3
"""
Project Mew 音频库收集脚本

用途：从 Pixabay/Mixkit 自动下载免费的猫叫声效
使用方法：python download_sounds.py

来源：
- Pixabay (免费，可商用)
- Mixkit (免费，可商用)
"""

import os
import json
import urllib.request
import urllib.parse
import re
from pathlib import Path

# 目标目录
BASE_DIR = Path(__file__).parent.parent / "assets" / "sounds"
SCRIPTS_DIR = Path(__file__).parent

# 音频清单配置
SOUNDS = {
    "meow": {
        "short": {
            "name": "meow_short.mp3",
            "search": "cat meow short",
            "source": "pixabay",
        },
        "long": {
            "name": "meow_long.mp3",
            "search": "cat meow long",
            "source": "pixabay",
        },
        "hungry": {
            "name": "meow_hungry.mp3",
            "search": "cat hungry meow",
            "source": "pixabay",
        },
        "angry": {
            "name": "meow_angry.mp3",
            "search": "angry cat meow",
            "source": "pixabay",
        },
        "sad": {
            "name": "meow_sad.mp3",
            "search": "sad cat meow",
            "source": "pixabay",
        },
        "surprised": {
            "name": "meow_surprised.mp3",
            "search": "cat meow surprised",
            "source": "pixabay",
        },
        "content": {
            "name": "meow_content.mp3",
            "search": "happy cat meow",
            "source": "pixabay",
        },
        "greeting": {
            "name": "meow_greeting.mp3",
            "search": "cat greeting meow",
            "source": "pixabay",
        },
    },
    "purr": {
        "soft": {
            "name": "purr_soft.mp3",
            "search": "cat purr soft",
            "source": "pixabay",
        },
        "sleepy": {
            "name": "purr_sleepy.mp3",
            "search": "cat purr sleepy",
            "source": "pixabay",
        },
        "happy": {
            "name": "purr_happy.mp3",
            "search": "cat purr happy",
            "source": "pixabay",
        },
    },
    "interact": {
        "chirp": {
            "name": "chirp.mp3",
            "search": "cat chirp bird",
            "source": "pixabay",
        },
        "chattering": {
            "name": "chattering.mp3",
            "search": "cat chattering",
            "source": "pixabay",
        },
        "hiss": {
            "name": "hiss.mp3",
            "search": "cat hiss",
            "source": "pixabay",
        },
        "growl": {
            "name": "growl.mp3",
            "search": "cat growl",
            "source": "pixabay",
        },
        "yowl": {
            "name": "yowl.mp3",
            "search": "cat yowl",
            "source": "pixabay",
        },
        "mew_kitten": {
            "name": "mew_kitten.mp3",
            "search": "kitten mew",
            "source": "pixabay",
        },
        "lick": {
            "name": "lick.mp3",
            "search": "cat licking",
            "source": "pixabay",
        },
        "scratch": {
            "name": "scratch.mp3",
            "search": "cat scratch",
            "source": "pixabay",
        },
        "jump_land": {
            "name": "jump_land.mp3",
            "search": "cat jump landing",
            "source": "pixabay",
        },
        "stretch": {
            "name": "stretch.mp3",
            "search": "cat stretch",
            "source": "pixabay",
        },
    },
    "ambient": {
        "home": {
            "name": "ambient_home.mp3",
            "search": "home ambient cat",
            "source": "pixabay",
            "is_long": True,
        },
        "night": {
            "name": "ambient_night.mp3",
            "search": "night ambient",
            "source": "pixabay",
            "is_long": True,
        },
        "rain_window": {
            "name": "rain_window.mp3",
            "search": "rain window",
            "source": "pixabay",
            "is_long": True,
        },
    },
    "system": {
        "food_empty": {
            "name": "food_bowl_empty.mp3",
            "search": "notification soft",
            "source": "pixabay",
            "is_short": True,
        },
        "notification": {
            "name": "notification.mp3",
            "search": "notification soft",
            "source": "pixabay",
            "is_short": True,
        },
    },
}


def ensure_dirs():
    """创建目录结构"""
    categories = ["meow", "purr", "interact", "ambient", "system"]
    for cat in categories:
        d = BASE_DIR / cat
        d.mkdir(parents=True, exist_ok=True)
        print(f"目录: {d}")


def download_file(url: str, dest: Path, description: str) -> bool:
    """下载文件"""
    if dest.exists():
        print(f"  [跳过] {dest.name} (已存在)")
        return True

    try:
        print(f"  [下载] {description}: {dest.name}")
        print(f"         来源: {url}")

        # 设置请求头，模拟浏览器
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                "Accept": "*/*",
            },
        )

        with urllib.request.urlopen(req, timeout=30) as response:
            data = response.read()
            dest.write_bytes(data)

        size = len(data)
        print(f"  [成功] {dest.name} ({size} bytes)")
        return True

    except Exception as e:
        print(f"  [失败] {dest.name}: {e}")
        return False


def search_pixabay(query: str, is_long: bool = False) -> str:
    """
    从 Pixabay 搜索并获取音频下载链接

    Pixabay API (免费, 需要 API key):
    https://pixabay.com/api/docs/

    免费搜索 (无需 API key):
    https://pixabay.com/api/?key=&q=cat+meow&audio_type=effect
    (key 可以留空，但有限制)

    更好的方式：使用 Pixabay 的音频页面直接搜索
    https://pixabay.com/audio/search/?q=cat+meow
    """
    # Pixabay API (需要免费的 API key)
    # 申请地址: https://pixabay.com/api/
    # 免费额度: 每天 200 次请求

    API_KEY = os.environ.get("PIXABAY_API_KEY", "")

    if not API_KEY:
        print("  [提示] 未设置 PIXABAY_API_KEY，使用备用方案")
        return ""

    encoded_query = urllib.parse.quote(query)
    url = f"https://pixabay.com/api/?key={API_KEY}&q={encoded_query}&audio_type=effect&per_page=3"

    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
            },
        )

        with urllib.request.urlopen(req, timeout=15) as response:
            data = json.loads(response.read())

            if data.get("hits"):
                # 返回第一个结果的下载链接
                return data["hits"][0].get("audio", "")

    except Exception as e:
        print(f"  [错误] Pixabay API 请求失败: {e}")

    return ""


def search_pixabay_page(query: str) -> list:
    """
    通过搜索页面 HTML 获取音频链接
    这是一个备用方案，不依赖 API key
    """
    encoded_query = urllib.parse.quote(query)
    url = f"https://pixabay.com/audio/search/?q={encoded_query}&order=ec"

    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
        )

        with urllib.request.urlopen(req, timeout=15) as response:
            html = response.read().decode("utf-8")

            # 查找音频链接
            # Pixabay 页面结构：<audio><source src="...">
            # 或者查找 data-url 属性
            urls = re.findall(r'"(https://cdn\.pixabay\.com/audio/[^"]+\.mp3)"', html)

            if urls:
                return list(set(urls))[:3]  # 去重，返回前3个

    except Exception as e:
        print(f"  [错误] 搜索页面解析失败: {e}")

    return []


def main():
    print("=" * 60)
    print("Project Mew 音频库收集脚本")
    print("=" * 60)
    print()
    print(f"目标目录: {BASE_DIR}")
    print()

    # 创建目录
    print("[1] 创建目录结构...")
    ensure_dirs()
    print()

    # 下载音频
    print("[2] 下载音频文件...")
    print()

    total = 0
    success = 0
    skipped = 0
    failed = 0

    for category, sounds in SOUNDS.items():
        print(f"  [{category.upper()}]")

        for key, info in sounds.items():
            total += 1
            dest = BASE_DIR / category / info["name"]

            if dest.exists():
                print(f"    [跳过] {info['name']} (已存在)")
                skipped += 1
                continue

            query = info["search"]

            # 尝试从 Pixabay 搜索
            urls = search_pixabay_page(query)

            if urls:
                # 下载第一个结果
                if download_file(urls[0], dest, info["search"]):
                    success += 1
                else:
                    failed += 1
            else:
                print(f"    [未找到] {info['name']} (搜索: {query})")
                failed += 1

        print()

    # 总结
    print("=" * 60)
    print("下载完成")
    print(f"  总计: {total}")
    print(f"  成功: {success}")
    print(f"  跳过: {skipped}")
    print(f"  失败: {failed}")
    print("=" * 60)
    print()

    # 提示用户手动补充
    if failed > 0:
        print("[!] 部分文件下载失败，请手动从以下网站补充：")
        print()
        print("  Freesound.org (推荐，需注册下载):")
        print("    - 喵叫: https://freesound.org/search/?q=cat+meow&f=license%3A%22Creative+Commons+0%22")
        print("    - 呼噜: https://freesound.org/search/?q=cat+purr&f=license%3A%22Creative+Commons+0%22")
        print("    - 嘶嘶: https://freesound.org/search/?q=cat+hiss&f=license%3A%22Creative+Commons+0%22")
        print()
        print("  Pixabay.com (无需注册):")
        print("    - https://pixabay.com/audio/search/?q=cat+meow")
        print("    - https://pixabay.com/audio/search/?q=cat+purr")
        print()


if __name__ == "__main__":
    main()
