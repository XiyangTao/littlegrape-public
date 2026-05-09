import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import Icon from '@/components/Icon';
import { useI18n } from '@/context/I18nProvider';
import type { SmartTip as SmartTipData } from '@/api/modules/grammar';

interface SmartTipProps {
  tip: SmartTipData;
  visible: boolean;
  onClose: () => void;
  styles: any;
  theme: any;
}

export default function SmartTip({ tip, visible, onClose, styles, theme }: SmartTipProps) {
  const { t } = useI18n();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.smartTipOverlay}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <View style={styles.smartTipCard}>
          <View style={styles.smartTipHeader}>
            <Icon name="lightbulb" size={20} color={theme.colors.warning} />
            <Text style={styles.smartTipTitle}>{t('learn.smartTipTitle')}</Text>
          </View>

          <Text style={styles.smartTipRule}>{tip.rule}</Text>

          {tip.wrong ? (
            <Text style={styles.smartTipWrong}>{'\u2717'} {tip.wrong}</Text>
          ) : null}
          {tip.correct ? (
            <Text style={styles.smartTipCorrect}>{'\u2713'} {tip.correct}</Text>
          ) : null}

          {tip.examples && tip.examples.length > 0 && (
            <Text style={styles.smartTipExamples}>
              {tip.examples.join(', ')}
            </Text>
          )}

          <TouchableOpacity style={styles.smartTipButton} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.smartTipButtonText}>{t('learn.iKnow')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
