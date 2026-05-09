import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { apiClient } from '@/api';
import type { InvitationRecord, InvitationStats } from '@/api/modules/invitation';
import Icon, { IconNames } from '@/components/Icon';
import { formatDateDisplay } from '@/utils/dateUtils';

export default function InviteScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const navigation = useNavigation<any>();
  const styles = createStyles(theme);

  const [inviteCode, setInviteCode] = useState<string>('');
  const [stats, setStats] = useState<InvitationStats | null>(null);
  const [records, setRecords] = useState<InvitationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputCode, setInputCode] = useState('');

  const fetchData = async () => {
    const [codeRes, statsRes, listRes] = await Promise.all([
      apiClient.getInviteCode(),
      apiClient.getInvitationStats(),
      apiClient.getInvitationList(),
    ]);
    if (codeRes.success) setInviteCode(codeRes.data.inviteCode);
    if (statsRes.success) setStats(statsRes.data);
    if (listRes.success) setRecords(listRes.data);
  };

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const loadData = async () => {
        try {
          setIsLoading(true);
          const [codeRes, statsRes, listRes] = await Promise.all([
            apiClient.getInviteCode(),
            apiClient.getInvitationStats(),
            apiClient.getInvitationList(),
          ]);
          if (cancelled) return;
          if (codeRes.success) setInviteCode(codeRes.data.inviteCode);
          if (statsRes.success) setStats(statsRes.data);
          if (listRes.success) setRecords(listRes.data);
        } catch (error) {
          if (cancelled) return;
          console.error('加载邀请数据失败:', error);
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      };
      loadData();
      return () => { cancelled = true; };
    }, [])
  );

  const handleCopyCode = async () => {
    await Clipboard.setStringAsync(inviteCode);
    Alert.alert(t('invite.copied'), t('invite.copiedDesc'));
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: t('invite.shareMessage', { code: inviteCode }),
      });
    } catch (error) {
      // 用户取消分享
    }
  };

  const handleApplyCode = async () => {
    if (!inputCode.trim()) return;
    try {
      const result = await apiClient.applyInviteCode(inputCode.trim());
      if (result.success) {
        Alert.alert(t('invite.applySuccess'), t('invite.applySuccessDesc'));
        setInputCode('');
        fetchData();
      } else {
        const errorMsg = result.error === 'invalid_code' ? t('invite.invalidCode')
          : result.error === 'self_invite' ? t('invite.selfInvite')
          : result.error === 'already_invited' ? t('invite.alreadyInvited')
          : t('invite.applyFailed');
        Alert.alert(t('common.error'), errorMsg);
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('invite.applyFailed'));
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('invite.title')}</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('invite.title')}</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 我的邀请码 */}
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>{t('invite.myCode')}</Text>
          <Text style={styles.codeText}>{inviteCode}</Text>
          <View style={styles.codeActions}>
            <TouchableOpacity style={styles.codeButton} onPress={handleCopyCode}>
              <Icon name="content-copy" size={18} color={theme.colors.primary} />
              <Text style={styles.codeButtonText}>{t('invite.copy')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Icon name="share" size={18} color={theme.colors.text.inverse} />
              <Text style={styles.shareButtonText}>{t('invite.share')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 邀请统计 */}
        {stats && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalInvited}</Text>
              <Text style={styles.statLabel}>{t('invite.totalInvited')}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.totalXpEarned}</Text>
              <Text style={styles.statLabel}>{t('invite.xpEarned')}</Text>
            </View>
          </View>
        )}

        {/* 输入邀请码 */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>{t('invite.enterCode')}</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.codeInput}
              placeholder={t('invite.codePlaceholder')}
              placeholderTextColor={theme.colors.text.disabled}
              value={inputCode}
              onChangeText={setInputCode}
              autoCapitalize="characters"
              maxLength={6}
            />
            <TouchableOpacity
              style={[styles.applyButton, !inputCode.trim() && styles.applyButtonDisabled]}
              onPress={handleApplyCode}
              disabled={!inputCode.trim()}
            >
              <Text style={styles.applyButtonText}>{t('invite.apply')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 邀请记录 */}
        <View style={styles.recordsSection}>
          <Text style={styles.sectionTitle}>{t('invite.records')}</Text>
          {records.length === 0 ? (
            <Text style={styles.emptyText}>{t('invite.noRecords')}</Text>
          ) : (
            records.map(record => (
              <View key={record.id} style={styles.recordCard}>
                <View style={styles.recordAvatar}>
                  <Icon name="person" size={24} color={theme.colors.text.tertiary} />
                </View>
                <View style={styles.recordInfo}>
                  <Text style={styles.recordName}>{record.invitee.nickname || t('invite.anonymous')}</Text>
                  <Text style={styles.recordDate}>
                    {formatDateDisplay(record.createdAt)}
                  </Text>
                </View>
                {record.rewardGranted && (
                  <Text style={styles.rewardBadge}>+100 XP</Text>
                )}
              </View>
            ))
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, paddingHorizontal: theme.spacing.md },

  codeCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.spacing.borderRadius.lg,
    padding: theme.spacing.lg, alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  codeLabel: { fontSize: theme.typography.fontSize.sm, color: 'rgba(255,255,255,0.8)', marginBottom: theme.spacing.sm },
  codeText: {
    fontSize: theme.fontScale(32), fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.inverse, letterSpacing: 6, marginBottom: theme.spacing.md,
  },
  codeActions: { flexDirection: 'row', gap: theme.spacing.md },
  codeButton: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md, borderRadius: theme.spacing.borderRadius.md,
  },
  codeButtonText: { fontSize: theme.typography.fontSize.sm, color: theme.colors.text.inverse },
  shareButton: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.3)', paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md, borderRadius: theme.spacing.borderRadius.md,
  },
  shareButtonText: { fontSize: theme.typography.fontSize.sm, color: theme.colors.text.inverse, fontWeight: theme.typography.fontWeight.semibold },

  statsRow: {
    flexDirection: 'row', backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.md, padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: {
    fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
  statLabel: { fontSize: theme.typography.fontSize.xs, color: theme.colors.text.secondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: theme.colors.border.light },

  inputSection: { marginBottom: theme.spacing.lg },
  sectionTitle: {
    fontSize: theme.typography.fontSize.base, fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary, marginBottom: theme.spacing.sm,
  },
  inputRow: { flexDirection: 'row', gap: theme.spacing.sm },
  codeInput: {
    flex: 1, backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.md, paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.fontSize.lg, color: theme.colors.text.primary,
    letterSpacing: 4, textAlign: 'center',
  },
  applyButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.spacing.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    justifyContent: 'center',
  },
  applyButtonDisabled: { opacity: 0.5 },
  applyButtonText: {
    fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.text.inverse,
  },

  recordsSection: { marginBottom: theme.spacing.lg },
  emptyText: { fontSize: theme.typography.fontSize.sm, color: theme.colors.text.tertiary },
  recordCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    borderRadius: theme.spacing.borderRadius.md,
    padding: theme.spacing.md, marginBottom: theme.spacing.xs,
  },
  recordAvatar: {
    width: theme.scale(40), height: theme.scale(40), borderRadius: theme.scale(20),
    backgroundColor: theme.colors.border.light,
    justifyContent: 'center', alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  recordInfo: { flex: 1 },
  recordName: {
    fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
  },
  recordDate: { fontSize: theme.typography.fontSize.xxs, color: theme.colors.text.tertiary, marginTop: 2 },
  rewardBadge: {
    fontSize: theme.typography.fontSize.xs, color: theme.colors.primary,
    fontWeight: theme.typography.fontWeight.bold,
  },
});
