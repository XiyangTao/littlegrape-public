"""
时区感知的日期时间工具
替代已弃用的 datetime.utcnow()
"""

from datetime import datetime, timezone, timedelta
from typing import Union

CN_TZ = timezone(timedelta(hours=8))


def now_utc() -> datetime:
    """获取当前 UTC 时间（带时区信息）"""
    return datetime.now(timezone.utc)


def now_cn() -> datetime:
    """获取当前北京时间（带时区信息）"""
    return datetime.now(CN_TZ)


def format_timestamp(ts: Union[float, datetime]) -> str:
    """将 Unix 时间戳或 datetime 对象格式化为 ISO 字符串（UTC，带时区标识）"""
    if isinstance(ts, datetime):
        if ts.tzinfo is None:
            # 无时区的 datetime 视为 UTC
            ts = ts.replace(tzinfo=timezone.utc)
        return ts.isoformat()
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
