import React from 'react';
import { View, Text, TouchableOpacity, LayoutAnimation } from 'react-native';
import { Theme } from '@/context/ThemeProvider';
import Icon from '@/components/Icon';
import { type Phoneme } from '@/data/phonemes';
import { createStyles } from './styles';

interface PhonemeTipProps {
  phoneme: Phoneme;
  expanded: boolean;
  onToggle: () => void;
  theme: Theme;
  t: (key: string, options?: any) => string;
}

export const PhonemeTip: React.FC<PhonemeTipProps> = ({
  phoneme,
  expanded,
  onToggle,
  theme,
  t,
}) => {
  const styles = createStyles(theme);

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onToggle();
  };

  return (
    <View style={styles.tipCard}>
      <TouchableOpacity
        style={styles.tipHeader}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        <Text style={styles.tipHeaderText}>{t('phonemePractice.tip.title')}</Text>
        <Icon
          name={expanded ? 'expand-less' : 'expand-more'}
          size={20}
          color={theme.colors.text.secondary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.tipBody}>
          <View style={styles.tipRow}>
            <Text style={styles.tipLabel}>{t('phonemePractice.tip.mouthTip')}</Text>
            <Text style={styles.tipContent}>{phoneme.mouthTip}</Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.tipLabel}>{t('phonemePractice.tip.method')}</Text>
            <Text style={styles.tipContent}>{phoneme.description}</Text>
          </View>
          {phoneme.commonMistakes.length > 0 && (
            <View style={styles.tipRow}>
              <Text style={styles.tipLabel}>{t('phonemePractice.tip.commonMistakes')}</Text>
              {phoneme.commonMistakes.map((m, i) => (
                <Text key={i} style={styles.tipMistake}>• {m}</Text>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};
