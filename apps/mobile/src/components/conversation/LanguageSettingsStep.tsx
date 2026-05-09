import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import CountryFlag from 'react-native-country-flag';
import { useTheme, Theme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon, { IconNames } from '@/components/Icon';
import SetupHeader from './SetupHeader';
import ProgressIndicator from './ProgressIndicator';
import {
  DifficultyLevel,
  EnglishVariant,
  ConversationStyle,
} from '@/types/conversation';
import {
  DIFFICULTY_LEVELS,
  ENGLISH_VARIANTS,
  CONVERSATION_STYLES,
} from '@/constants/conversation';

interface LanguageSettingsStepProps {
  initialSettings: {
    difficulty: DifficultyLevel;
    variant: EnglishVariant;
    style: ConversationStyle;
  };
  onNext: (settings: {
    difficulty: DifficultyLevel;
    variant: EnglishVariant;
    style: ConversationStyle;
  }) => void;
  onBack: () => void;
}

export default function LanguageSettingsStep({
  initialSettings,
  onNext,
  onBack,
}: LanguageSettingsStepProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  const [difficulty, setDifficulty] = useState<DifficultyLevel>(
    initialSettings.difficulty
  );
  const [variant, setVariant] = useState<EnglishVariant>(initialSettings.variant);
  const [style, setStyle] = useState<ConversationStyle>(initialSettings.style);

  const handleNext = () => {
    onNext({ difficulty, variant, style });
  };

  return (
    <SafeAreaView style={styles.container}>
      <SetupHeader title={t('conversation.language.title')} onBack={onBack} />
      <ProgressIndicator currentStep={1} totalSteps={3} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 难度等级 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name={IconNames.signal} size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>
              {t('conversation.language.difficultyLabel')}
            </Text>
          </View>
          <View style={styles.difficultyList}>
            {DIFFICULTY_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.value}
                onPress={() => setDifficulty(level.value)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={
                    difficulty === level.value
                      ? [theme.colors.primary, theme.colors.secondary]
                      : [theme.colors.background.primary, theme.colors.background.primary]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.difficultyCard,
                    difficulty === level.value && styles.difficultyCardActive,
                  ]}
                >
                  <View style={styles.difficultyHeader}>
                    <Text
                      style={[
                        styles.difficultyTitle,
                        difficulty === level.value && styles.difficultyTitleActive,
                      ]}
                    >
                      {t(`conversation.difficulty.${level.value}.label`)}
                    </Text>
                    {difficulty === level.value && (
                      <Icon name={IconNames.checkCircle} size={20} color={theme.colors.background.primary} />
                    )}
                  </View>

                  <View style={styles.difficultyMeta}>
                    <View style={[
                      styles.cefrBadge,
                      difficulty === level.value && styles.cefrBadgeActive,
                    ]}>
                      <Text style={[
                        styles.cefrText,
                        difficulty === level.value && styles.cefrTextActive,
                      ]}>
                        {level.cefr}
                      </Text>
                    </View>
                    <Text style={styles.metaDivider}>·</Text>
                    <Text style={[
                      styles.difficultyVocab,
                      difficulty === level.value && styles.difficultyVocabActive,
                    ]}>
                      {t('conversation.language.vocabulary')} {level.vocab}
                    </Text>
                  </View>

                  <Text style={[
                    styles.difficultyDescription,
                    difficulty === level.value && styles.difficultyDescriptionActive,
                  ]}>
                    {t(`conversation.difficulty.${level.value}.description`)}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 英语变体 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name={IconNames.language} size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>
              {t('conversation.language.variantLabel')}
            </Text>
          </View>
          <View style={styles.variantContainer}>
            {ENGLISH_VARIANTS.map((v) => (
              <TouchableOpacity
                key={v.value}
                style={[
                  styles.variantCard,
                  variant === v.value && styles.variantCardActive,
                ]}
                onPress={() => setVariant(v.value)}
                activeOpacity={0.7}
              >
                {v.flagCode ? (
                  <CountryFlag isoCode={v.flagCode} size={12} style={styles.flagIcon} />
                ) : (
                  <Icon
                    name={v.iconName as any}
                    size={24}
                    color={
                      variant === v.value
                        ? theme.colors.primary
                        : theme.colors.text.secondary
                    }
                  />
                )}
                <Text
                  style={[
                    styles.variantLabel,
                    variant === v.value && styles.variantLabelActive,
                  ]}
                >
                  {t(`conversation.variant.${v.value}.label`)}
                </Text>
                {variant === v.value && (
                  <View style={styles.variantCheckIcon}>
                    <Icon name={IconNames.check} size={18} color={theme.colors.primary} />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 对话风格 */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name={IconNames.chat} size={20} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>
              {t('conversation.language.styleLabel')}
            </Text>
          </View>
          <View style={styles.styleContainer}>
            {CONVERSATION_STYLES.map((s) => (
              <TouchableOpacity
                key={s.value}
                style={[
                  styles.styleCard,
                  style === s.value && styles.styleCardActive,
                ]}
                onPress={() => setStyle(s.value)}
                activeOpacity={0.7}
              >
                <Icon
                  name={s.iconName as any}
                  size={28}
                  color={
                    style === s.value
                      ? theme.colors.primary
                      : theme.colors.text.secondary
                  }
                />
                <View style={styles.styleInfo}>
                  <Text
                    style={[
                      styles.styleLabel,
                      style === s.value && styles.styleLabelActive,
                    ]}
                  >
                    {t(`conversation.style.${s.value}.label`)}
                  </Text>
                  <Text style={styles.styleDesc}>
                    {t(`conversation.style.${s.value}.description`)}
                  </Text>
                </View>
                {style === s.value && (
                  <Icon name={IconNames.check} size={20} color={theme.colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 下一步按钮 */}
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>{t('conversation.setup.next')}</Text>
          <Icon name={IconNames.next} size={20} color={theme.colors.text.inverse} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.tertiary,
    },
    content: {
      flex: 1,
    },
    section: {
      paddingHorizontal: theme.spacing.lg,
      marginBottom: theme.spacing.xl,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
    },
    // 难度等级样式
    difficultyList: {
      gap: theme.spacing.sm,
    },
    difficultyCard: {
      padding: theme.spacing.md,
      borderRadius: theme.spacing.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border.light,
      backgroundColor: theme.colors.background.primary,
      gap: theme.spacing.xs,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 1,
    },
    difficultyCardActive: {
      borderColor: 'transparent',
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 6,
    },
    difficultyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    difficultyTitle: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      letterSpacing: -0.2,
    },
    difficultyTitleActive: {
      color: theme.colors.text.inverse,
    },
    difficultyMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    cefrBadge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 3,
      borderRadius: theme.spacing.borderRadius.full,
      backgroundColor: theme.colors.background.secondary,
    },
    cefrBadgeActive: {
      backgroundColor: theme.colors.background.primary + '25',
    },
    cefrText: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      letterSpacing: 0.5,
    },
    cefrTextActive: {
      color: theme.colors.text.inverse,
    },
    metaDivider: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.disabled,
      fontWeight: theme.typography.fontWeight.medium,
    },
    difficultyVocab: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      fontWeight: theme.typography.fontWeight.medium,
      letterSpacing: 0.2,
    },
    difficultyVocabActive: {
      color: theme.colors.text.inverse,
      opacity: 0.95,
    },
    difficultyDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      lineHeight: 18,
      marginTop: 0,
    },
    difficultyDescriptionActive: {
      color: theme.colors.text.inverse,
      opacity: 0.9,
    },
    // 英语变体样式
    variantContainer: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    variantCard: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.background.primary,
      padding: theme.spacing.md,
      borderRadius: theme.spacing.borderRadius.md,
      borderWidth: 2,
      borderColor: theme.colors.border.light,
      position: 'relative',
    },
    variantCardActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.background.secondary,
    },
    variantLabel: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.medium,
      color: theme.colors.text.secondary,
    },
    variantLabelActive: {
      color: theme.colors.text.primary,
    },
    variantCheckIcon: {
      position: 'absolute',
      top: theme.spacing.xs,
      right: theme.spacing.xs,
    },
    flagIcon: {
      marginRight: theme.spacing.xs,
    },
    checkBadge: {
      position: 'absolute',
      top: theme.spacing.xs,
      right: theme.spacing.xs,
      backgroundColor: theme.colors.primary,
      width: 20,
      height: 20,
      borderRadius: theme.spacing.borderRadius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // 对话风格样式
    styleContainer: {
      gap: theme.spacing.sm,
    },
    styleCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background.primary,
      padding: theme.spacing.md,
      borderRadius: theme.spacing.borderRadius.md,
      borderWidth: 2,
      borderColor: theme.colors.border.light,
      gap: theme.spacing.sm,
    },
    styleCardActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.background.secondary,
    },
    styleInfo: {
      flex: 1,
    },
    styleLabel: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.xxs,
    },
    styleLabelActive: {
      color: theme.colors.text.primary,
    },
    styleDesc: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
    },
    // 下一步按钮
    nextButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primary,
      marginHorizontal: theme.spacing.lg,
      marginVertical: theme.spacing.xl,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.spacing.borderRadius.lg,
      gap: theme.spacing.xs,
    },
    nextButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.inverse,
    },
  });
