import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon, { IconNames } from '@/components/Icon';

export default function ConversationSettingsScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  const [smartFeedback, setSmartFeedback] = useState(true);
  const [expressionPolish, setExpressionPolish] = useState(true);
  const [autoDetect, setAutoDetect] = useState(true);
  const [voiceInput, setVoiceInput] = useState(true);
  const [saveHistory, setSaveHistory] = useState(true);

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name={IconNames.left} size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('conversation.settings')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 智能助手 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('conversation.settingsPage.smartAssistant')}</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name={IconNames.lightbulb} size={24} color={theme.colors.primary} style={styles.settingIcon} />
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{t('conversation.settingsPage.smartFeedback')}</Text>
                <Text style={styles.settingSubtitle}>{t('conversation.settingsPage.smartFeedbackDesc')}</Text>
              </View>
            </View>
            <Switch
              value={smartFeedback}
              onValueChange={setSmartFeedback}
              trackColor={{ false: theme.colors.border.light, true: theme.colors.primary }}
              thumbColor={smartFeedback ? theme.colors.background.primary : theme.colors.text.secondary}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name={IconNames.autoFix} size={24} color={theme.colors.green} style={styles.settingIcon} />
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{t('conversation.settingsPage.expressionPolish')}</Text>
                <Text style={styles.settingSubtitle}>{t('conversation.settingsPage.expressionPolishDesc')}</Text>
              </View>
            </View>
            <Switch
              value={expressionPolish}
              onValueChange={setExpressionPolish}
              trackColor={{ false: theme.colors.border.light, true: theme.colors.green }}
              thumbColor={expressionPolish ? theme.colors.background.primary : theme.colors.text.secondary}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name={IconNames.psychology} size={24} color={theme.colors.orange} style={styles.settingIcon} />
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{t('conversation.settingsPage.autoDetect')}</Text>
                <Text style={styles.settingSubtitle}>{t('conversation.settingsPage.autoDetectDesc')}</Text>
              </View>
            </View>
            <Switch
              value={autoDetect}
              onValueChange={setAutoDetect}
              trackColor={{ false: theme.colors.border.light, true: theme.colors.orange }}
              thumbColor={autoDetect ? theme.colors.background.primary : theme.colors.text.secondary}
            />
          </View>
        </View>

        {/* 其他设置 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('conversation.settingsPage.otherSettings')}</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name={IconNames.mic} size={24} color={theme.colors.purple} style={styles.settingIcon} />
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{t('conversation.settingsPage.voiceInput')}</Text>
                <Text style={styles.settingSubtitle}>{t('conversation.settingsPage.voiceInputDesc')}</Text>
              </View>
            </View>
            <Switch
              value={voiceInput}
              onValueChange={setVoiceInput}
              trackColor={{ false: theme.colors.border.light, true: theme.colors.purple }}
              thumbColor={voiceInput ? theme.colors.background.primary : theme.colors.text.secondary}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Icon name={IconNames.history} size={24} color={theme.colors.blue} style={styles.settingIcon} />
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{t('conversation.settingsPage.chatHistory')}</Text>
                <Text style={styles.settingSubtitle}>{t('conversation.settingsPage.chatHistoryDesc')}</Text>
              </View>
            </View>
            <Switch
              value={saveHistory}
              onValueChange={setSaveHistory}
              trackColor={{ false: theme.colors.border.light, true: theme.colors.blue }}
              thumbColor={saveHistory ? theme.colors.background.primary : theme.colors.text.secondary}
            />
          </View>
        </View>

        {/* 使用指南 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('conversation.settingsPage.guide')}</Text>

          <View style={styles.guideCard}>
            <Text style={styles.guideTitle}>{t('conversation.settingsPage.polishGuideTitle')}</Text>
            <Text style={styles.guideText}>
              {t('conversation.settingsPage.polishGuideContent')}
            </Text>
          </View>

          <View style={styles.guideCard}>
            <Text style={styles.guideTitle}>{t('conversation.settingsPage.feedbackGuideTitle')}</Text>
            <Text style={styles.guideText}>
              {t('conversation.settingsPage.feedbackGuideContent')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
  },
  placeholder: {
    width: 40, // 平衡左侧返回按钮
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  settingItem: {
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing.md,
    borderRadius: theme.spacing.borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: theme.spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: theme.typography.fontSize.xs,
    color: theme.colors.text.secondary,
  },
  guideCard: {
    backgroundColor: theme.colors.background.secondary,
    padding: theme.spacing.lg,
    borderRadius: theme.spacing.borderRadius.lg,
    marginBottom: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  guideTitle: {
    fontSize: theme.typography.fontSize.base,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  guideText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.text.secondary,
    lineHeight: 20,
  },
});