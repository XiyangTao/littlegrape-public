import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '@/context/ThemeProvider';
import Icon, { IconNames } from '@/components/Icon';
import { createStyles } from './styles';

interface FreeModeCardProps {
  isSelected: boolean;
  theme: Theme;
  t: (key: string) => string;
  onPress: () => void;
}

export default function FreeModeCard({ isSelected, theme, t, onPress }: FreeModeCardProps) {
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
            ? [theme.colors.primary, theme.colors.secondary]
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
                  : [theme.colors.primary, theme.colors.secondary]
              }
              style={styles.iconGradient}
            >
              <Icon
                name={IconNames.forum}
                size={36}
                color={isSelected ? theme.colors.text.inverse : theme.colors.primary}
              />
            </LinearGradient>
          </View>

          <View style={styles.modeInfo}>
            <Text style={[
              styles.modeTitle,
              isSelected && styles.modeTitleActive
            ]}>
              {t('conversation.mode.free.title')}
            </Text>
            <Text style={[
              styles.modeDescription,
              isSelected && styles.modeDescriptionActive
            ]}>
              {t('conversation.mode.free.description')}
            </Text>

            {/* 特点标签 */}
            <View style={styles.featureTags}>
              <View style={[styles.featureTag, isSelected && styles.featureTagActive]}>
                <Icon name={IconNames.star} size={12} color={isSelected ? theme.colors.warning : theme.colors.primary} />
                <Text style={[styles.featureTagText, isSelected && styles.featureTagTextActive]}>
                  {t('conversation.mode.free.feature1')}
                </Text>
              </View>
              <View style={[styles.featureTag, isSelected && styles.featureTagActive]}>
                <Icon name={IconNames.chat} size={12} color={isSelected ? theme.colors.warning : theme.colors.primary} />
                <Text style={[styles.featureTagText, isSelected && styles.featureTagTextActive]}>
                  {t('conversation.mode.free.feature2')}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}
