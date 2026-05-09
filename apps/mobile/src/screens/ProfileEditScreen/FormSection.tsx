import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';
import Icon, { IconNames } from '@/components/Icon';
import { DatePicker } from '@/components/DatePicker';
import { createStyles } from './styles';

interface FormSectionProps {
  formData: {
    nickname: string;
    bio: string;
    gender: string;
    birthday: string;
  };
  validationErrors: {
    nickname?: string;
    bio?: string;
  };
  isLoading: boolean;
  showDatePicker: boolean;
  setShowDatePicker: (visible: boolean) => void;
  selectedDate: Date;
  GENDER_OPTIONS: { value: string; label: string }[];
  formatDisplayDate: (dateString: string) => string;
  updateFormData: (field: 'nickname' | 'bio' | 'gender' | 'birthday', value: string) => void;
  handleDateConfirm: () => void;
  handleDateChange: (newDate: Date) => void;
}

export default function FormSection({
  formData,
  validationErrors,
  isLoading,
  showDatePicker,
  setShowDatePicker,
  selectedDate,
  GENDER_OPTIONS,
  formatDisplayDate,
  updateFormData,
  handleDateConfirm,
  handleDateChange,
}: FormSectionProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(theme);

  return (
    <>
      {/* 表单区域 */}
      <View style={styles.formSection}>
        {/* 昵称 */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t('profileEdit.fields.nickname')}</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.textInput, validationErrors.nickname && styles.inputError]}
              placeholder={t('profileEdit.fields.nicknamePlaceholder')}
              placeholderTextColor={theme.colors.text.secondary}
              value={formData.nickname}
              onChangeText={(value) => updateFormData('nickname', value)}
              maxLength={20}
              editable={!isLoading}
            />
            {validationErrors.nickname && (
              <Text style={styles.errorText}>{validationErrors.nickname}</Text>
            )}
          </View>
        </View>

        {/* 个性签名 */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t('profileEdit.fields.bio')}</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, validationErrors.bio && styles.inputError]}
              placeholder={t('profileEdit.fields.bioPlaceholder')}
              placeholderTextColor={theme.colors.text.secondary}
              value={formData.bio}
              onChangeText={(value) => updateFormData('bio', value)}
              maxLength={24}
              editable={!isLoading}
              returnKeyType="done"
            />
            <View style={styles.inputFooter}>
              <Text style={styles.charCount}>{formData.bio.length}/24</Text>
            </View>
            {validationErrors.bio && (
              <Text style={styles.errorText}>{validationErrors.bio}</Text>
            )}
          </View>
        </View>

        {/* 性别 */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t('profileEdit.fields.gender')}</Text>
          <View style={styles.genderOptions}>
            {GENDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.genderOption,
                  formData.gender === option.value && styles.genderOptionActive
                ]}
                onPress={() => updateFormData('gender', option.value)}
                disabled={isLoading}
              >
                <Text style={[
                  styles.genderLabel,
                  formData.gender === option.value && styles.genderLabelActive
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 生日 */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{t('profileEdit.fields.birthday')}</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
            disabled={isLoading}
          >
            <Text style={[
              styles.dateText,
              !formData.birthday && styles.datePlaceholder
            ]}>
              {formatDisplayDate(formData.birthday)}
            </Text>
            <Icon name={IconNames.right} size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 日期选择器模态框 */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{t('profileEdit.fields.birthday')}</Text>
              <TouchableOpacity onPress={handleDateConfirm}>
                <Text style={styles.modalConfirmText}>{t('common.confirm')}</Text>
              </TouchableOpacity>
            </View>

            {/* 使用新的日期选择器组件 */}
            <View style={styles.datePickerContainer}>
              <DatePicker
                value={selectedDate}
                onDateChange={handleDateChange}
                maximumDate={new Date()}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
