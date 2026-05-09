import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { PieChart, BarChart, LineChart } from 'react-native-gifted-charts';
import { useTheme } from '@/context/ThemeProvider';
import Icon, { IconNames } from '@/components/Icon';
import { LoadingView } from '@/components/common';
import ErrorView from '@/components/common/ErrorView';
import createStyles from './styles';
import { useUsageDetail } from './useUsageDetail';

export default function UsageDetailScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const {
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
  } = useUsageDetail();

  if (isLoading && serviceItems.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name={IconNames.back} size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('usage.title')}</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <LoadingView />
      </SafeAreaView>
    );
  }

  if (error && serviceItems.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name={IconNames.back} size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('usage.title')}</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <ErrorView message={error} onRetry={reload} />
      </SafeAreaView>
    );
  }

  const progressPercent = quota?.usagePercentage ?? 0;

  // 为 PieChart 填充颜色
  const coloredPieData = pieData.map(item => ({
    ...item,
    color: getServiceColor(item.colorKey, theme),
  }));

  // 为 BarChart 填充颜色
  const coloredBarData = barData.map(item => {
    const color = getServiceColor(item.colorKey, theme);
    return {
      value: item.value,
      label: item.label,
      frontColor: color,
      gradientColor: color + '60',
      topLabelComponent: () => (
        <Text style={{ fontSize: 10, color: theme.colors.text.tertiary, marginBottom: 4 }}>
          ¥{item.originalCost.toFixed(4)}
        </Text>
      ),
    };
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name={IconNames.back} size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('usage.title')}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={reload} />}
      >
        {/* [1] 总览渐变卡片 */}
        <LinearGradient
          colors={theme.colors.gradient.primary}
          style={styles.overviewCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.overviewTop}>
            <View>
              <Text style={styles.overviewLabel}>{t('usage.monthUsed')}</Text>
              <Text style={styles.overviewCost}>
                ¥{quota?.costConsumed?.toFixed(4) ?? '0.0000'}
              </Text>
            </View>
            <View style={styles.overviewBudget}>
              <Text style={styles.overviewBudgetLabel}>{t('usage.monthBudget')}</Text>
              <Text style={styles.overviewBudgetValue}>
                ¥{quota?.costBudget?.toFixed(2) ?? '0.00'}
              </Text>
            </View>
          </View>

          {/* 进度条 */}
          <View style={styles.progressBarOuter}>
            <View
              style={[
                styles.progressBarInner,
                { width: `${Math.min(progressPercent, 100)}%` },
              ]}
            />
          </View>

          <View style={styles.overviewBottom}>
            <View style={styles.planBadge}>
              <Text style={styles.planBadgeText}>
                {quota?.planName ?? t('usage.freePlan')}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => navigation.navigate('PlanSelect')}
            >
              <Text style={styles.upgradeButtonText}>{t('quota.upgradePlan')}</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* [2] 今日/本月 Tab 切换 */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'today' && styles.tabActive]}
            onPress={() => setActiveTab('today')}
          >
            <Text style={[styles.tabText, activeTab === 'today' && styles.tabTextActive]}>
              {t('usage.today')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'month' && styles.tabActive]}
            onPress={() => setActiveTab('month')}
          >
            <Text style={[styles.tabText, activeTab === 'month' && styles.tabTextActive]}>
              {t('usage.thisMonth')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* [3] 费用占比甜甜圈图 */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{t('usage.costBreakdown')}</Text>
          {coloredPieData.length > 0 ? (
            <View style={styles.donutContainer}>
              <PieChart
                donut
                data={coloredPieData}
                radius={70}
                innerRadius={45}
                innerCircleColor={theme.colors.card}
                centerLabelComponent={() => (
                  <View style={styles.donutCenter}>
                    <Text style={styles.donutCenterValue}>¥{totalCost.toFixed(4)}</Text>
                    <Text style={styles.donutCenterLabel}>{t('usage.totalCost')}</Text>
                  </View>
                )}
              />
              <View style={styles.legendContainer}>
                {coloredPieData.map(item => {
                  const percent = totalCost > 0
                    ? ((item.value / totalCost) * 100).toFixed(1)
                    : '0';
                  return (
                    <View key={item.serviceKey} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                      <Text style={styles.legendText}>{item.text}</Text>
                      <Text style={styles.legendPercent}>{percent}%</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyChartText}>{t('usage.noData')}</Text>
            </View>
          )}
        </View>

        {/* [4] 费用柱状图 */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{t('usage.costComparison')}</Text>
          {coloredBarData.some(d => d.value > 0) ? (
            <View style={styles.barChartWrapper}>
              <BarChart
                data={coloredBarData}
                barWidth={32}
                spacing={24}
                roundedTop
                showGradient
                noOfSections={4}
                yAxisThickness={0}
                xAxisThickness={1}
                xAxisColor={theme.colors.border.light}
                hideRules
                hideYAxisText
                barBorderTopLeftRadius={6}
                barBorderTopRightRadius={6}
                xAxisLabelTextStyle={{
                  fontSize: 10,
                  color: theme.colors.text.tertiary,
                  width: 48,
                  textAlign: 'center',
                }}
                height={150}
                isAnimated
              />
            </View>
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyChartText}>{t('usage.noData')}</Text>
            </View>
          )}
        </View>

        {/* [5] 每日费用趋势（仅本月 Tab 显示） */}
        {activeTab === 'month' && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>{t('usage.dailyCostTrend')}</Text>
            {dailyCostData.length > 0 ? (
              <View style={styles.areaChartWrapper}>
                <LineChart
                  areaChart
                  data={dailyCostData}
                  width={280}
                  height={160}
                  spacing={280 / Math.max(dailyCostData.length - 1, 1)}
                  color={theme.colors.primary}
                  startFillColor={theme.colors.primary + '40'}
                  endFillColor={theme.colors.primary + '05'}
                  thickness={2}
                  startOpacity={0.6}
                  endOpacity={0.05}
                  initialSpacing={0}
                  endSpacing={0}
                  noOfSections={4}
                  yAxisThickness={0}
                  xAxisThickness={1}
                  xAxisColor={theme.colors.border.light}
                  hideRules
                  hideDataPoints
                  hideYAxisText
                  curved
                  xAxisLabelTextStyle={{
                    fontSize: 9,
                    color: theme.colors.text.tertiary,
                    width: 36,
                    textAlign: 'center',
                  }}
                  pointerConfig={{
                    pointerStripHeight: 140,
                    pointerStripColor: theme.colors.border.medium,
                    pointerStripWidth: 1,
                    pointerColor: theme.colors.primary,
                    radius: 4,
                    pointerLabelWidth: 80,
                    pointerLabelHeight: 40,
                    pointerLabelComponent: (items: any) => (
                      <View style={{
                        backgroundColor: theme.colors.card,
                        padding: 6,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: theme.colors.border.light,
                      }}>
                        <Text style={{
                          fontSize: 11,
                          color: theme.colors.text.primary,
                          fontWeight: '600',
                          textAlign: 'center',
                        }}>
                          ¥{items[0]?.value?.toFixed(4) ?? '0'}
                        </Text>
                      </View>
                    ),
                  }}
                />
              </View>
            ) : (
              <View style={styles.emptyChart}>
                <Text style={styles.emptyChartText}>{t('usage.noData')}</Text>
              </View>
            )}
          </View>
        )}

        {/* [6] 服务用量卡片列表 */}
        <View style={styles.serviceSection}>
          {serviceItems.map((item) => {
            const color = getServiceColor(item.colorKey, theme);
            return (
              <View key={item.key} style={styles.serviceCard}>
                <View style={[styles.serviceIconWrap, { backgroundColor: color + '15' }]}>
                  <Icon name={item.icon} size={22} color={color} />
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{item.name}</Text>
                  <Text style={styles.serviceAmount}>{item.formattedAmount}</Text>
                </View>
                <Text style={[styles.serviceCost, { color }]}>
                  ¥{item.cost.toFixed(4)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* [7] 收费说明 */}
        <View style={styles.pricingSection}>
          <View style={styles.pricingSectionHeader}>
            <Icon name={IconNames.info} size={18} color={theme.colors.text.secondary} />
            <Text style={styles.pricingSectionTitle}>{t('usage.pricingTitle')}</Text>
          </View>
          {pricingItems.map((item, index) => (
            <View
              key={item.key}
              style={[
                styles.pricingRow,
                index === pricingItems.length - 1 && styles.pricingRowLast,
              ]}
            >
              <Text style={styles.pricingName}>{item.name}</Text>
              <Text style={styles.pricingValue}>
                {item.displayPrice} / {item.displayUnit}
              </Text>
            </View>
          ))}
          <Text style={styles.pricingNote}>{t('usage.pricingNote')}</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
