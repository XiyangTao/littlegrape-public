import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
  AppState,
  StatusBar,
} from 'react-native';
import Alipay from '@uiw/react-native-alipay';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { useQuota, useQuotaStore } from '@/stores';
import { apiClient } from '@/api';
import type { PlanInfo } from '@/api/modules/order';
import Icon, { IconNames } from '@/components/Icon';
import { toast } from '@/stores/ToastStore';
import { getErrorMessage } from '@/utils/errorUtils';

// 套餐 UI 配置（不含价格，价格从 API 获取）
const PLAN_UI: Record<string, { badge: 'popular' | null }> = {
  free:  { badge: null },
  basic: { badge: 'popular' },
  pro:   { badge: null },
  max:   { badge: null },
};

// 套餐排序（用于比较）
const PLAN_ORDER: Record<string, number> = { free: 0, basic: 1, pro: 2, max: 3 };

export default function PlanSelectScreen() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const { t } = useI18n();
  const { quota } = useQuota();
  const styles = createStyles(theme);

  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [actualPrice, setActualPrice] = useState<number | null>(null); // 实际支付价格（含折算）
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [successPlan, setSuccessPlan] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const wasTrialRef = useRef(false); // 支付前的体验期状态（支付后 quota 会更新，不能用实时值判断）
  const prevPlanRef = useRef('free'); // 支付前的套餐类型

  const currentPlan = quota?.planType || 'free';
  const currentOrder = PLAN_ORDER[currentPlan] || 0;
  const currentBillingCycle = quota?.billingCycle || 'monthly';
  const hasScheduledRenewal = !!quota?.nextPlanType;
  const priceRequestRef = useRef(0); // 价格请求序列号，防竞态
  const pendingOrderRef = useRef<{ orderId: string; plan: string } | null>(null); // 待确认的订单

  // 从支付宝返回 App 时，快速检查一次支付结果（兜底：Alipay SDK 返回值丢失的情况）
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      const pending = pendingOrderRef.current;
      if (nextState === 'active' && pending && isPurchasing) {
        // 只做一次快速检查，不轮询（Alipay SDK 正常返回时会走主流程处理）
        try {
          await new Promise(resolve => setTimeout(resolve, 2000));
          // 如果 pending 已被 Alipay SDK 主流程清除，说明 SDK 正常返回了，不需要兜底
          if (!pendingOrderRef.current) return;
          pendingOrderRef.current = null;
          const checkResult = await apiClient.checkOrderPayment(pending.orderId);
          if (checkResult.success && checkResult.data.paid) {
            await useQuotaStore.getState().fetchQuota();
            setIsPurchasing(false);
            setSuccessPlan(pending.plan);
          } else {
            setIsPurchasing(false);
          }
        } catch {
          setIsPurchasing(false);
        }
      }
    });
    return () => sub.remove();
  }, [isPurchasing]);

  // 从 API 获取套餐列表
  useEffect(() => {
    apiClient.getPlans().then(resp => {
      if (resp.success && resp.data) {
        setPlans(resp.data);
      }
    }).catch(() => {});
  }, []);

  const isTrial = quota?.isTrial || false;

  // 是否在续费窗口期（到期前 7 天内或已过期）且无待生效续费
  const canRenew = useMemo(() => {
    if (hasScheduledRenewal) return false; // 已续费，不允许重复续费
    if (currentPlan === 'free' || quota?.daysLeft == null) return false;
    return quota.daysLeft <= 7;
  }, [hasScheduledRenewal, quota?.daysLeft, currentPlan]);

  const handleSelectPlan = useCallback(async (planKey: string) => {
    const planOrder = PLAN_ORDER[planKey] || 0;
    if (planKey === 'free') return;
    if (planOrder < currentOrder) return;
    // 禁止年付→月付（同级或升级都不允许降周期）
    if (currentBillingCycle === 'yearly' && billingCycle === 'monthly' && currentPlan !== 'free' && !isTrial) return;
    // 同级允许：续费窗口内 或 月付→年付切换
    const isCycleUpgrade = planKey === currentPlan && currentBillingCycle === 'monthly' && billingCycle === 'yearly';
    if (planOrder === currentOrder && !canRenew && !isCycleUpgrade) return;
    setSelectedPlan(planKey);
    setActualPrice(null); // 清空旧价格，避免中间态闪烁

    // 获取实际支付价格（用序列号防竞态）
    const requestId = ++priceRequestRef.current;
    try {
      const resp = await apiClient.getUpgradePrice(planKey, billingCycle);
      if (requestId !== priceRequestRef.current) return; // 已有更新的请求，丢弃
      if (resp.success && resp.data) {
        setActualPrice(resp.data.amount);
      }
    } catch {
      if (requestId !== priceRequestRef.current) return;
      // 获取失败用原价
      const plan = plans.find(p => p.planType === planKey);
      setActualPrice(plan ? (billingCycle === 'yearly' ? plan.yearlyPrice : plan.price) : 0);
    }
  }, [currentOrder, currentPlan, currentBillingCycle, canRenew, billingCycle, plans, isTrial]);

  const handlePurchase = useCallback(async () => {
    if (!selectedPlan) return;

    try {
      setIsPurchasing(true);
      // 记住支付前的状态（支付成功后 fetchQuota 会更新 quota，不能用实时值判断）
      wasTrialRef.current = quota?.isTrial || false;
      prevPlanRef.current = currentPlan;
      const response = await apiClient.createOrder(selectedPlan, 'alipay', billingCycle);
      if (!response.success || !response.data) {
        toast.error(t('plan.createOrderFailed'));
        return;
      }

      const { order, orderString } = response.data;

      if (Platform.OS !== 'web') {
        // 记录待确认订单，AppState 监听会在用户手动切回时兜底检查
        pendingOrderRef.current = { orderId: order.id, plan: selectedPlan };

        // 调起支付宝 App 支付
        const alipayResult = await Alipay.alipay(orderString);

        // Alipay SDK 正常返回，清除 pending 标记（避免 AppState 重复处理）
        const pending = pendingOrderRef.current;
        pendingOrderRef.current = null;
        if (!pending) return; // 已被 AppState 监听处理过

        if (alipayResult.resultStatus === '9000') {
          // 轮询订单状态，后端会主动查询支付宝确认支付结果
          let confirmed = false;
          for (let i = 0; i < 10; i++) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            try {
              const checkResult = await apiClient.checkOrderPayment(order.id);
              if (checkResult.success && checkResult.data.paid) {
                confirmed = true;
                break;
              }
            } catch {}
          }
          await useQuotaStore.getState().fetchQuota();
          if (confirmed) {
            setSuccessPlan(selectedPlan);
          } else {
            // 支付宝已扣款但后端未确认，提示用户稍后查看
            toast.warning(t('plan.paymentProcessingDesc'));
          }
        } else if (alipayResult.resultStatus === '6001') {
          // 用户取消
        } else {
          setPaymentError(t('plan.paymentFailedDesc'));
        }
      } else {
        // 开发环境 → 模拟支付
        Alert.alert(
          t('plan.paymentPending'),
          t('plan.paymentPendingDesc'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('plan.simulatePay'),
              onPress: async () => {
                try {
                  const simResult = await apiClient.simulatePayment(order.id);
                  if (simResult.success) {
                    await useQuotaStore.getState().fetchQuota();
                    setSuccessPlan(selectedPlan);
                  }
                } catch {
                  toast.error(t('plan.paymentFailed'));
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      setPaymentError(getErrorMessage(error) || t('plan.createOrderFailed'));
    } finally {
      setIsPurchasing(false);
    }
  }, [selectedPlan, billingCycle, currentPlan, quota?.isTrial, t]);

  const selectedPlanInfo = selectedPlan ? plans.find(p => p.planType === selectedPlan) : null;
  const fullPrice = selectedPlanInfo
    ? (billingCycle === 'yearly' ? selectedPlanInfo.yearlyPrice : selectedPlanInfo.price)
    : 0;
  const selectedPrice = actualPrice ?? fullPrice;
  const isCycleUpgradeSelected = selectedPlan === currentPlan && currentBillingCycle === 'monthly' && billingCycle === 'yearly';
  const isUpgradeDiscount = selectedPlan && ((PLAN_ORDER[selectedPlan] || 0) > currentOrder || isCycleUpgradeSelected) && currentPlan !== 'free' && !isTrial && actualPrice !== null && actualPrice < fullPrice;
  const isRenewalPurchase = selectedPlan === currentPlan && !isTrial && !isCycleUpgradeSelected;

  // ==================== 支付成功页 ====================
  if (successPlan) {
    const isRenewalSuccess = successPlan === prevPlanRef.current && !wasTrialRef.current;
    return (
      <SuccessScreen
        planName={t(`plan.${successPlan}.name`)}
        isRenewal={isRenewalSuccess}
        periodEnd={isRenewalSuccess ? (quota?.nextPeriodEnd || quota?.periodEnd || '') : (quota?.periodEnd || '')}
        theme={theme}
        t={t}
        onDone={() => {
          useQuotaStore.getState().fetchQuota();
          navigation.goBack();
        }}
      />
    );
  }

  // ==================== 支付失败页 ====================
  if (paymentError) {
    return (
      <FailureScreen
        errorMessage={paymentError}
        theme={theme}
        t={t}
        onRetry={() => setPaymentError(null)}
        onBack={() => navigation.goBack()}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor={theme.colors.background.primary} barStyle="dark-content" />
      {/* 导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('plan.title')}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 月付/年付切换 */}
        <View style={styles.cycleToggle}>
          <TouchableOpacity
            style={[styles.cycleBtn, billingCycle === 'monthly' && styles.cycleBtnActive]}
            onPress={() => { setBillingCycle('monthly'); setSelectedPlan(null); setActualPrice(null); }}
          >
            <Text style={[styles.cycleBtnText, billingCycle === 'monthly' && styles.cycleBtnTextActive]}>
              {t('plan.monthly')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cycleBtn, billingCycle === 'yearly' && styles.cycleBtnActive]}
            onPress={() => { setBillingCycle('yearly'); setSelectedPlan(null); setActualPrice(null); }}
          >
            <Text style={[styles.cycleBtnText, billingCycle === 'yearly' && styles.cycleBtnTextActive]}>
              {t('plan.yearly')}
            </Text>
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{t('plan.yearlyDiscount')}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* 套餐卡片列表 */}
        {plans.map((plan) => {
          const planKey = plan.planType;
          const isCurrent = planKey === currentPlan && billingCycle === currentBillingCycle;
          const isSelected = planKey === selectedPlan;
          const isDowngrade = (PLAN_ORDER[planKey] || 0) < currentOrder;
          const isSameLevel = (PLAN_ORDER[planKey] || 0) === currentOrder;
          const isFree = planKey === 'free';
          const canCycleUpgrade = planKey === currentPlan && currentBillingCycle === 'monthly' && billingCycle === 'yearly';
          const isCycleDowngrade = currentBillingCycle === 'yearly' && billingCycle === 'monthly' && currentPlan !== 'free' && !isTrial;
          const disabled = isDowngrade || isFree || isCycleDowngrade || (isSameLevel && !canRenew && !canCycleUpgrade);
          const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.price;
          const planName = t(`plan.${planKey}.name`);
          const usageKey = billingCycle === 'yearly' ? `plan.${planKey}.usageYearly` : `plan.${planKey}.usage`;
          const usageDesc = t(usageKey, { defaultValue: t(`plan.${planKey}.usage`) });
          const features: string[] = t(`plan.${planKey}.features`, { returnObjects: true }) as any;
          const badge = PLAN_UI[planKey]?.badge;

          return (
            <TouchableOpacity
              key={planKey}
              style={[
                styles.planCard,
                isSelected && styles.planCardSelected,
                disabled && !isCurrent && styles.planCardDisabled,
              ]}
              onPress={() => handleSelectPlan(planKey)}
              disabled={disabled}
              activeOpacity={0.7}
            >
              {/* 当前套餐左侧色条 */}
              {isCurrent && <View style={styles.currentAccent} />}

              {/* 标签 */}
              {badge === 'popular' && !isCurrent && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>{t('plan.popular')}</Text>
                </View>
              )}

              {/* 头部：名称 + 价格 */}
              <View style={styles.planHeader}>
                <View style={styles.planNameRow}>
                  <Text style={[styles.planName, isSelected && styles.planNameSelected]}>
                    {planName}
                  </Text>
                  {isCurrent && (
                    <View style={styles.currentTag}>
                      <Text style={styles.currentTagText}>{t('plan.currentBadge')}</Text>
                    </View>
                  )}
                </View>
                {!isFree && (
                  <View style={styles.priceRow}>
                    <Text style={[styles.priceSymbol, isSelected && styles.priceSelected]}>¥</Text>
                    <Text style={[styles.priceValue, isSelected && styles.priceSelected]}>{price}</Text>
                    <Text style={styles.pricePeriod}>
                      {billingCycle === 'yearly' ? t('plan.perYear') : t('plan.perMonth')}
                    </Text>
                  </View>
                )}
              </View>

              {/* 用量描述 */}
              <Text style={styles.usageDesc}>{usageDesc}</Text>

              {/* 功能列表 */}
              <View style={styles.featureList}>
                {features.map((feat, i) => (
                  <View key={i} style={styles.featureRow}>
                    <MaterialIcons
                      name="check"
                      size={16}
                      color={isSelected ? theme.colors.primary : theme.colors.text.tertiary}
                    />
                    <Text style={[styles.featureText, isSelected && styles.featureTextSelected]}>
                      {feat}
                    </Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* 底部按钮 */}
      {selectedPlan && (
        <View style={styles.bottomBar}>
          {isUpgradeDiscount && (
            <Text style={styles.prorationHint}>
              {t('plan.prorationHint', { original: fullPrice, actual: selectedPrice })}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.purchaseButton, isPurchasing && styles.purchaseButtonDisabled]}
            onPress={handlePurchase}
            disabled={isPurchasing}
          >
            {isPurchasing ? (
              <ActivityIndicator color={theme.colors.text.inverse} />
            ) : (
              <Text style={styles.purchaseButtonText}>
                {isRenewalPurchase
                  ? t('plan.renewNow', { price: selectedPrice })
                  : isUpgradeDiscount
                    ? t('plan.upgradeNow', { price: selectedPrice })
                    : t('plan.purchaseNow', { price: selectedPrice })
                }
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

// ==================== 支付成功全屏页 ====================

function SuccessScreen({ planName, isRenewal, periodEnd, theme, t, onDone }: {
  planName: string;
  isRenewal: boolean;
  periodEnd: string;
  theme: Theme;
  t: (key: string, opts?: any) => string;
  onDone: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const ss = successStyles(theme);

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={ss.container}>
      <StatusBar backgroundColor={theme.colors.background.primary} barStyle="dark-content" />
      <View style={ss.content}>
        {/* 对勾动画 */}
        <Animated.View style={[ss.checkCircle, { transform: [{ scale: scaleAnim }] }]}>
          <MaterialIcons name="check" size={48} color="#FFFFFF" />
        </Animated.View>

        {/* 标题 */}
        <Animated.Text style={[ss.title, { opacity: fadeAnim }]}>
          {isRenewal ? t('plan.renewalSuccessTitle') : t('plan.successTitle')}
        </Animated.Text>

        {/* 套餐名 */}
        <Animated.Text style={[ss.planName, { opacity: fadeAnim }]}>
          {planName}
        </Animated.Text>

        {/* 描述 */}
        <Animated.Text style={[ss.desc, { opacity: fadeAnim }]}>
          {isRenewal
            ? t('plan.renewalSuccessDesc', { date: periodEnd ? new Date(periodEnd).toLocaleDateString() : '' })
            : t('plan.successDesc')
          }
        </Animated.Text>
      </View>

      {/* 底部按钮 */}
      <View style={ss.bottom}>
        <TouchableOpacity style={ss.doneButton} onPress={onDone} activeOpacity={0.8}>
          <Text style={ss.doneButtonText}>{t('plan.startUsing')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ==================== 支付失败全屏页 ====================

function FailureScreen({ errorMessage, theme, t, onRetry, onBack }: {
  errorMessage: string;
  theme: Theme;
  t: (key: string, opts?: any) => string;
  onRetry: () => void;
  onBack: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const fs = failureStyles(theme);

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={fs.container}>
      <StatusBar backgroundColor={theme.colors.background.primary} barStyle="dark-content" />
      <View style={fs.content}>
        <Animated.View style={[fs.errorCircle, { transform: [{ scale: scaleAnim }] }]}>
          <MaterialIcons name="close" size={48} color="#FFFFFF" />
        </Animated.View>

        <Animated.Text style={[fs.title, { opacity: fadeAnim }]}>
          {t('plan.failureTitle')}
        </Animated.Text>

        <Animated.Text style={[fs.desc, { opacity: fadeAnim }]}>
          {errorMessage}
        </Animated.Text>
      </View>

      <View style={fs.bottom}>
        <TouchableOpacity style={fs.retryButton} onPress={onRetry} activeOpacity={0.8}>
          <Text style={fs.retryButtonText}>{t('plan.retryPayment')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={fs.backButton} onPress={onBack} activeOpacity={0.8}>
          <Text style={fs.backButtonText}>{t('plan.backToPlans')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const failureStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  errorCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: theme.fontScale(24),
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  desc: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: theme.fontScale(24),
  },
  bottom: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.md,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  backButton: {
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.tertiary,
  },
});

const successStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
    ...theme.spacing.shadows.sm,
  },
  title: {
    fontSize: theme.fontScale(24),
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  planName: {
    fontSize: theme.fontScale(20),
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.md,
  },
  desc: {
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: theme.fontScale(24),
  },
  bottom: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  doneButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.md,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
});

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },

  // ==================== 月付/年付切换 ====================
  cycleToggle: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.full,
    padding: 3,
    marginBottom: theme.spacing.lg,
  },
  cycleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.sm + 2,
    borderRadius: theme.spacing.borderRadius.full,
    gap: theme.spacing.xs,
  },
  cycleBtnActive: {
    backgroundColor: theme.colors.card,
    ...theme.spacing.shadows.sm,
  },
  cycleBtnText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.tertiary,
  },
  cycleBtnTextActive: {
    color: theme.colors.text.primary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
  discountBadge: {
    backgroundColor: theme.colors.error + '15',
    borderRadius: theme.spacing.borderRadius.full,
    paddingHorizontal: theme.spacing.xs + 2,
    paddingVertical: 1,
  },
  discountText: {
    fontSize: theme.typography.fontSize.xxs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.error,
  },

  // ==================== 套餐卡片 ====================
  planCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.border.light,
  },
  currentAccent: {
    position: 'absolute',
    left: 0,
    top: theme.spacing.sm,
    bottom: theme.spacing.sm,
    width: 3,
    borderRadius: 2,
    backgroundColor: theme.colors.primary,
  },
  planCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.card,
    ...theme.spacing.shadows.sm,
  },
  planCardDisabled: {
    opacity: 0.45,
    borderColor: 'transparent',
  },
  popularBadge: {
    position: 'absolute',
    top: 0,
    right: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xxs,
    borderBottomLeftRadius: theme.spacing.borderRadius.sm,
    borderBottomRightRadius: theme.spacing.borderRadius.sm,
  },
  popularText: {
    fontSize: theme.typography.fontSize.xxs,
    fontWeight: theme.typography.fontWeight.bold,
    color: '#FFFFFF',
  },

  // ==================== 头部 ====================
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  planNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  planName: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  planNameSelected: {
    color: theme.colors.primary,
  },
  currentTag: {
    backgroundColor: theme.colors.primary + '15',
    paddingHorizontal: theme.spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: theme.spacing.borderRadius.full,
  },
  currentTagText: {
    fontSize: theme.typography.fontSize.xxs,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.primary,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceSymbol: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  priceValue: {
    fontSize: theme.fontScale(24),
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.primary,
  },
  priceSelected: {
    color: theme.colors.primary,
  },
  pricePeriod: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
    marginLeft: 2,
  },

  // ==================== 用量 & 功能 ====================
  usageDesc: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  featureList: {
    gap: theme.spacing.xs,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  featureText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
  },
  featureTextSelected: {
    color: theme.colors.text.primary,
  },

  // ==================== 底部 ====================
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.background.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border.light,
  },
  purchaseButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.md,
    alignItems: 'center',
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.inverse,
  },
  prorationHint: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
});
