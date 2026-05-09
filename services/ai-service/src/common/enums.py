"""
共享枚举类型定义
"""

from enum import Enum

class DifficultyLevel(str, Enum):
    """难度等级 - 6个级别对应CEFR标准"""
    STARTER = "starter"              # A1 - 入门级 (500-1000词)
    ELEMENTARY = "elementary"        # A2 - 基础级 (2000-3000词)
    CET4 = "cet4"                   # B1 - 四级水平 (4000-5000词)
    CET6 = "cet6"                   # B2 - 六级水平 (5500-6500词)
    IELTS7_TEM8 = "ielts7_tem8"     # C1 - 雅思7分/专八 (8000-10000词)
    NATIVE = "native"                # C2 - 母语水平 (10000+词)

class EnglishVariant(str, Enum):
    """英语变体"""
    AMERICAN = "american"            # 美式英语
    BRITISH = "british"              # 英式英语

class ConversationStyle(str, Enum):
    """对话风格"""
    FORMAL = "formal"                # 正式场合
    CASUAL = "casual"                # 休闲日常
    SLANG = "slang"                  # 口语俚语

class ScenarioCategory(str, Enum):
    """场景分类 - 5个主要类别,与前端保持一致"""
    TRAVEL = "travel"                      # 旅游出行
    DINING_SHOPPING = "dining_shopping"    # 餐饮购物
    BUSINESS = "business"                  # 商务职场
    HEALTH = "health"                      # 医疗健康
    SOCIAL = "social"                      # 社交娱乐