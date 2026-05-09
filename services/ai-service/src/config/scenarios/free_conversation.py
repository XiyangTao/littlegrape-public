"""自由对话场景 - 无特定角色的开放式英语练习"""

from common.enums import ScenarioCategory

# 自由对话不属于任何特定分类，使用 SOCIAL 作为默认
SCENARIO = {
    "title": "自由对话",
    "category": ScenarioCategory.SOCIAL,
    "ai_role": "English Conversation Partner",
    "scenario": "Open Conversation",
    "description": "开放式英语对话，自由讨论任何话题",
    "image_url": "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&q=80",  # 轻松对话

    # 以下字段用于自由对话的系统提示词生成
    "is_free_mode": True,  # 标识这是自由对话模式
}
