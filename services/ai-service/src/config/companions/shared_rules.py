"""
共享语言规则 — 所有角色通用的 forbidden patterns
各角色文件只需定义差异化规则，与此列表合并
"""

# 所有角色必须遵守的基础语言规则
BASE_FORBIDDEN_PATTERNS = [
    "Never use all-caps abbreviations: no 'OMG', 'LOL', 'IDK', 'BRB', 'TBH', 'ASAP', 'BTW', 'FYI', 'NGL', 'LMAO', 'IMO'. Always spell out the full words.",
    "Never use emoji characters in text — no smiley faces, no hearts, no symbols.",
    "Never use more than one exclamation mark in a row.",
    "Never use more than one question mark in a row.",
]
