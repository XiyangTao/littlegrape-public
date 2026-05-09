import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon from '@/components/Icon';

interface UserAgreementProps {
  agreed: boolean;
  onToggle: () => void;
  onViewPrivacyPolicy: () => void;
  onViewUserAgreement: () => void;
}

export default function UserAgreement({
  agreed,
  onToggle,
  onViewPrivacyPolicy,
  onViewUserAgreement
}: UserAgreementProps) {
  const { theme } = useTheme();
  const { t } = useI18n();

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 24,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: agreed ? theme.colors.primary : theme.colors.border.medium,
      backgroundColor: agreed ? theme.colors.primary : 'transparent',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
      marginTop: 2,
    },
    agreementText: {
      flex: 1,
      lineHeight: 20,
    },
    normalText: {
      fontSize: 14,
      color: theme.colors.text.secondary,
    },
    linkText: {
      fontSize: 14,
      color: theme.colors.primary,
      fontWeight: '500',
    },
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.checkbox} onPress={onToggle} activeOpacity={0.7}>
        {agreed && (
          <Icon name="check" size={14} color={theme.colors.text.inverse} />
        )}
      </TouchableOpacity>

      <View style={styles.agreementText}>
        <Text style={styles.normalText}>
          {t('auth.login.agreement.text')}
          <Text style={styles.linkText} onPress={onViewUserAgreement}>
            《{t('auth.login.agreement.userAgreement')}》
          </Text>
          {t('auth.login.agreement.and')}
          <Text style={styles.linkText} onPress={onViewPrivacyPolicy}>
            《{t('auth.login.agreement.privacyPolicy')}》
          </Text>
        </Text>
      </View>
    </View>
  );
}