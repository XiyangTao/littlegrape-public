import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '@/context/ThemeProvider';
import Icon, { IconNames } from '@/components/Icon';
import { createStyles } from './styles';

interface ScenarioModeCardProps {
  isSelected: boolean;
  theme: Theme;
  t: (key: string) => string;
  onPress: () => void;
}

export default function ScenarioModeCard({ isSelected, theme, t, onPress }: ScenarioModeCardProps) {
  const styles = createStyles(theme);

  return (
    <TouchableOpacity
      style={styles.modeCardWrapper}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={
          isSelected
            ? [theme.colors.secondary, theme.colors.warning]
            : [theme.colors.background.primary, theme.colors.background.primary]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.modeCard,
          isSelected && styles.modeCardActive,
        ]}
      >
        {/* 背景装饰 */}
        <View style={styles.decorationCircle1} />
        <View style={styles.decorationCircle2} />

        {/* 标签 */}
        {isSelected && (
          <View style={styles.badge}>
            <Icon name={IconNames.check} size={14} color={theme.colors.text.inverse} />
            <Text style={styles.badgeText}>{t('conversation.mode.selected')}</Text>
          </View>
        )}

        <View style={styles.modeContent}>
          <View style={[
            styles.iconContainer,
            isSelected && styles.iconContainerActive
          ]}>
            <LinearGradient
              colors={
                isSelected
                  ? [theme.colors.background.primary + '50', theme.colors.background.primary + '20']
                  : [theme.colors.secondary, theme.colors.warning]
              }
              style={styles.iconGradient}
            >
              <Icon
                name={IconNames.theaterComedy}
                size={36}
                color={isSelected ? theme.colors.text.inverse : theme.colors.secondary}
              />
            </LinearGradient>
          </View>

          <View style={styles.modeInfo}>
            <View style={styles.modeTitleRow}>
              <Text style={[
                styles.modeTitle,
                isSelected && styles.modeTitleActive
              ]}>
                {t('conversation.mode.scenario.title')}
              </Text>
            </View>
            <Text style={[
              styles.modeDescription,
              isSelected && styles.modeDescriptionActive
            ]}>
              {t('conversation.mode.scenario.description')}
            </Text>

            {/* 特点标签 */}
            <View style={styles.featureTags}>
              <View style={[styles.featureTag, isSelected && styles.featureTagActive]}>
                <Icon name={IconNames.target} size={12} color={isSelected ? theme.colors.warning : theme.colors.secondary} />
                <Text style={[styles.featureTagText, isSelected && styles.featureTagTextActive]}>
                  {t('conversation.mode.scenario.feature1')}
                </Text>
              </View>
              <View style={[styles.featureTag, isSelected && styles.featureTagActive]}>
                <Icon name={IconNames.library} size={12} color={isSelected ? theme.colors.warning : theme.colors.secondary} />
                <Text style={[styles.featureTagText, isSelected && styles.featureTagTextActive]}>
                  {t('conversation.mode.scenario.feature2')}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}
