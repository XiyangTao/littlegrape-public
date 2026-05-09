import React, { useState } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import { WordHomeScreen } from '@/screens/words';
import PronunciationHomeScreen from '@/screens/pronunciation/PronunciationHomeScreen';
import GrammarHomeScreen from '@/screens/grammar/GrammarHomeScreen';
import SegmentedControl from '@/components/common/SegmentedControl';
import createStyles from './styles';

const SEGMENT_KEYS = ['learn.words', 'learn.pronunciation', 'learn.grammar'] as const;

export default function LearnCenterScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);
  const [activeIndex, setActiveIndex] = useState(0);

  const segments = SEGMENT_KEYS.map(key => t(key));

  return (
    <View style={styles.container}>
      <SegmentedControl
        segments={segments}
        activeIndex={activeIndex}
        onChange={setActiveIndex}
        theme={theme}
      />

      <View style={[styles.panel, activeIndex !== 0 && styles.hiddenPanel]}>
        <WordHomeScreen />
      </View>
      <View style={[styles.panel, activeIndex !== 1 && styles.hiddenPanel]}>
        <PronunciationHomeScreen />
      </View>
      <View style={[styles.panel, activeIndex !== 2 && styles.hiddenPanel]}>
        <GrammarHomeScreen />
      </View>
    </View>
  );
}
