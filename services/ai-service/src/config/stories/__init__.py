"""
Story Mode 配置加载器
加载 characters/ 和 episodes/ 下的 JSON 配置文件
"""

import json
import os
from typing import Dict, Any, Optional

from utils.logger import log_info, log_error


# 配置文件目录
_STORIES_DIR = os.path.dirname(os.path.abspath(__file__))
_CHARACTERS_DIR = os.path.join(_STORIES_DIR, "characters")
_EPISODES_DIR = os.path.join(_STORIES_DIR, "episodes")

# 缓存
_characters: Dict[str, Dict[str, Any]] = {}
_episodes: Dict[str, Dict[str, Any]] = {}


def _load_json(filepath: str) -> Dict[str, Any]:
    """加载单个 JSON 文件"""
    with open(filepath, "r", encoding="utf-8") as f:
        return json.load(f)


def _load_all():
    """加载所有配置文件（启动时调用一次）"""
    global _characters, _episodes

    # 加载角色配置
    if os.path.isdir(_CHARACTERS_DIR):
        for filename in os.listdir(_CHARACTERS_DIR):
            if filename.endswith(".json"):
                filepath = os.path.join(_CHARACTERS_DIR, filename)
                try:
                    data = _load_json(filepath)
                    char_id = data.get("character_id")
                    if char_id:
                        _characters[char_id] = data
                        log_info(f"Loaded character: {char_id}")
                except Exception as e:
                    log_error(f"Failed to load character {filename}: {e}")

    # 加载 episode 配置
    if os.path.isdir(_EPISODES_DIR):
        for filename in os.listdir(_EPISODES_DIR):
            if filename.endswith(".json"):
                filepath = os.path.join(_EPISODES_DIR, filename)
                try:
                    data = _load_json(filepath)
                    ep_id = data.get("episode_id")
                    if ep_id:
                        _episodes[ep_id] = data
                        log_info(f"Loaded episode: {ep_id}")
                except Exception as e:
                    log_error(f"Failed to load episode {filename}: {e}")

    log_info(f"Story config loaded: {len(_characters)} characters, {len(_episodes)} episodes")


def get_character(character_id: str) -> Optional[Dict[str, Any]]:
    """获取角色配置"""
    if not _characters:
        _load_all()
    return _characters.get(character_id)


def get_episode(episode_id: str) -> Optional[Dict[str, Any]]:
    """获取 episode 配置"""
    if not _episodes:
        _load_all()
    return _episodes.get(episode_id)


def get_all_episodes() -> Dict[str, Dict[str, Any]]:
    """获取所有 episode 配置"""
    if not _episodes:
        _load_all()
    return _episodes


def reload():
    """重新加载所有配置（开发用）"""
    global _characters, _episodes
    _characters = {}
    _episodes = {}
    _load_all()
