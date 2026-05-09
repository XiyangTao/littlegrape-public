import { useState, useMemo, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/stores/AuthStore';
import { useI18n } from '@/context/I18nProvider';
import { useQuota } from '@/stores';
import { apiClient } from '@/api';
import { useFocusLoader } from '@/hooks/useDataLoader';
import type { UsageStats, UsageHistoryRecord } from '@/api/modules/usage';
import type { Theme } from '@/context/ThemeProvider';

type TabType = 'today' | 'month';

// 服务定价常量（与后端 quotaService.ts SERVICE_PRICING 对齐）
const SERVICE_PRICING = {
  ai:            { unit: 'token',     pricePerUnit: 0.0000018, displayPrice: 0.0018 },
  tts:           { unit: 'character', pricePerUnit: 0.000124,  displayPrice: 0.124 },
  asr:           { unit: 'ms',        pricePerUnit: 0.00000108, displayPrice: 0.0648 },
  pronunciation: { unit: 'ms',        pricePerUnit: 0.00000219, displayPrice: 0.1314 },
  translation:        { unit: 'ms',        pricePerUnit: 0.00000368, displayPrice: 0.2208 },
  text_translation:   { unit: 'character', pricePerUnit: 0.000133,  displayPrice: 0.133 },
} as const;

type ServiceKey = keyof typeof SERVICE_PRICING;

// 服务配置（图标、颜色）
const SERVICE_CONFIG: Record<ServiceKey, { icon: string; colorKey: string }> = {
  ai:            { icon: 'chat',               colorKey: 'primary' },
  tts:           { icon: 'volume-up',          colorKey: 'info' },
  asr:           { icon: 'mic',                colorKey: 'success' },
  pronunciation: { icon: 'record-voice-over',  colorKey: 'warning' },
  translation:        { icon: 'language',           colorKey: 'error' },
  text_translation:   { icon: 'translate',          colorKey: 'teal' },
};

const SERVICE_KEYS: ServiceKey[] = ['ai', 'tts', 'asr', 'pronunciation', 'translation', 'text_translation'];

export interface ServiceItem {
  key: ServiceKey;
  icon: string;
  colorKey: string;
  name: string;
  formattedAmount: string;
  cost: number;
}

export interface PricingItem {
  key: string;
  name: string;
  displayUnit: string;
  displayPrice: string;
}

/** 格式化原始用量为可读字符串 */
function formatAmount(amount: number, serviceKey: ServiceKey): string {
  const pricing = SERVICE_PRICING[serviceKey];

  if (pricing.unit === 'ms') {
    const seconds = amount / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    return `${(seconds / 60).toFixed(1)}min`;
  }
  if (amount >= 10000) return `${(amount / 1000).toFixed(1)}k`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(2)}k`;
  return String(amount);
}

/** 根据原始用量计算成本（元） */
function calculateCost(amount: number, serviceKey: ServiceKey): number {
  const pricing = SERVICE_PRICING[serviceKey];
  return amount * pricing.pricePerUnit;
}

/** 获取当月起止日期 */
function getMonthRange(): { startDate: string; endDate: string; daysInMonth: number } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const mm = String(month + 1).padStart(2, '0');
  return {
    startDate: `${year}-${mm}-01`,
    endDate: `${year}-${mm}-${String(daysInMonth).padStart(2, '0')}`,
    daysInMonth,
  };
}

/** 将历史记录按日期聚合为每日总费用 */
function aggregateDailyCost(
  records: UsageHistoryRecord[],
  startDate: string,
  daysInMonth: number,
): { value: number; label: string; date: string }[] {
  // 按日期聚合费用
  const costByDate: Record<string, number> = {};
  for (const record of records) {
    const key = record.serviceType as ServiceKey;
    const pricing = SERVICE_PRICING[key];
    if (!pricing) continue;
    const cost = record.totalAmount * pricing.pricePerUnit;
    costByDate[record.date] = (costByDate[record.date] || 0) + cost;
  }

  // 生成当月每一天的数据点
  const [year, month] = startDate.split('-');
  const result: { value: number; label: string; date: string }[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dd = String(day).padStart(2, '0');
    const dateStr = `${year}-${month}-${dd}`;
    const cost = costByDate[dateStr] || 0;

    // 标签：只显示 1号、每隔 7 天、最后一天
    const showLabel = day === 1 || day % 7 === 0 || day === daysInMonth;
    result.push({
      value: cost,
      label: showLabel ? `${parseInt(month)}/${day}` : '',
      date: dateStr,
    });
  }

  return result;
}

export function useUsageDetail() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { t } = useI18n();
  const { quota } = useQuota();
  const [activeTab, setActiveTab] = useState<TabType>('today');

  const { startDate, endDate, daysInMonth } = useMemo(() => getMonthRange(), []);

  // 加载用量数据（当前统计 + 历史记录并行加载）
  const { data, isLoading, error, reload } = useFocusLoader<{
    stats: UsageStats | null;
    history: UsageHistoryRecord[];
  }>(
    async () => {
      if (!user?.id) return { stats: null, history: [] };
      const [statsRes, historyRes] = await Promise.all([
        apiClient.getUsageStats(user.id),
        apiClient.getUsageHistory(user.id, startDate, endDate),
      ]);
      return {
        stats: statsRes.success ? statsRes.data : null,
        history: historyRes.success ? historyRes.data.records : [],
      };
    },
    [user?.id, startDate, endDate],
  );

  const usageStats = data?.stats ?? null;
  const historyRecords = data?.history ?? [];

  // 构建服务列表数据
  const serviceItems = useMemo((): ServiceItem[] => {
    if (!usageStats) return [];

    return SERVICE_KEYS.map(key => {
      const config = SERVICE_CONFIG[key];
      const byService = usageStats.byService[key as keyof typeof usageStats.byService];
      const amount = activeTab === 'today'
        ? (byService?.today ?? 0)
        : (byService?.month ?? 0);

      return {
        key,
        icon: config.icon,
        colorKey: config.colorKey,
        name: t(`usage.service_${key}`),
        formattedAmount: formatAmount(amount, key),
        cost: calculateCost(amount, key),
      };
    });
  }, [usageStats, activeTab, t]);

  // 总费用
  const totalCost = useMemo(() => {
    return serviceItems.reduce((sum, item) => sum + item.cost, 0);
  }, [serviceItems]);

  // 甜甜圈图数据
  const pieData = useMemo(() => {
    if (serviceItems.length === 0 || totalCost === 0) return [];

    return serviceItems
      .filter(item => item.cost > 0)
      .map(item => ({
        value: item.cost,
        color: '', // 颜色在组件中通过 getServiceColor 填充
        colorKey: item.colorKey,
        text: item.name,
        serviceKey: item.key,
      }));
  }, [serviceItems, totalCost]);

  // 柱状图数据
  const barData = useMemo(() => {
    if (serviceItems.length === 0) return [];

    return serviceItems.map(item => ({
      value: item.cost * 10000, // 放大到可视化范围（原始值太小）
      label: item.name,
      colorKey: item.colorKey,
      serviceKey: item.key,
      originalCost: item.cost,
    }));
  }, [serviceItems]);

  // 每日费用趋势数据（面积图）
  const dailyCostData = useMemo(() => {
    if (historyRecords.length === 0) return [];
    return aggregateDailyCost(historyRecords, startDate, daysInMonth);
  }, [historyRecords, startDate, daysInMonth]);

  // 定价说明数据
  const pricingItems = useMemo((): PricingItem[] => {
    return SERVICE_KEYS.map(key => ({
      key,
      name: t(`usage.service_${key}`),
      displayUnit: t(`usage.unit_${key}`),
      displayPrice: `¥${SERVICE_PRICING[key].displayPrice}`,
    }));
  }, [t]);

  // 获取服务对应的颜色
  const getServiceColor = useCallback((colorKey: string, theme: Theme): string => {
    const colorMap: Record<string, string> = {
      primary: theme.colors.primary,
      info: theme.colors.info,
      success: theme.colors.success,
      warning: theme.colors.warning,
      error: theme.colors.error,
      teal: '#26A69A',
    };
    return colorMap[colorKey] || theme.colors.primary;
  }, []);

  return {
    navigation,
    t,
    quota,
    isLoading,
    error,
    reload,
    activeTab,
    setActiveTab,
    serviceItems,
    totalCost,
    pieData,
    barData,
    dailyCostData,
    pricingItems,
    getServiceColor,
  };
}
