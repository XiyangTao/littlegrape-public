import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/stores/AuthStore';
import { useI18n } from '@/context/I18nProvider';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import { parseLocalDate } from '@/utils/dateUtils';
import { getErrorMessage } from '@/utils/errorUtils';

export function useProfileForm() {
  const navigation = useNavigation<any>();
  const { user, updateProfile, isLoading } = useAuth();
  const { t } = useI18n();
  const { toast, AlertComponent } = useCustomAlert();

  const [formData, setFormData] = useState({
    nickname: user?.nickname || '',
    bio: user?.bio || '',
    gender: user?.gender || 'private', // 默认保密
    birthday: user?.birthday || '',
  });

  const [validationErrors, setValidationErrors] = useState<{
    nickname?: string;
    bio?: string;
  }>({});

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (user?.birthday) {
      return parseLocalDate(user.birthday);
    }
    return new Date(2000, 0, 1);
  });

  // ==================== 常量定义 ====================

  const GENDER_OPTIONS = [
    { value: 'male', label: t('profileEdit.fields.genderMale') },
    { value: 'female', label: t('profileEdit.fields.genderFemale') },
    { value: 'private', label: t('profileEdit.fields.genderPrivate') },
  ];

  // ==================== 工具函数 ====================

  // 格式化日期显示
  const formatDisplayDate = (dateString: string): string => {
    if (!dateString) return t('profileEdit.fields.birthdayPlaceholder');
    const [y, m, d] = dateString.split('-').map(Number);
    return `${y}年${m}月${d}日`;
  };

  // ==================== 表单验证 ====================
  const validateForm = (): boolean => {
    const errors: { nickname?: string; bio?: string } = {};

    if (formData.nickname.trim()) {
      if (formData.nickname.length < 2) {
        errors.nickname = t('profileEdit.validation.nicknameMinLength');
      } else if (formData.nickname.length > 10) {
        errors.nickname = t('profileEdit.validation.nicknameMaxLength');
      } else if (/^\d/.test(formData.nickname)) {
        errors.nickname = t('profileEdit.validation.nicknameNoNumberStart');
      } else if (/^\d+$/.test(formData.nickname)) {
        errors.nickname = t('profileEdit.validation.nicknameNoAllNumbers');
      } else if (/[\s@.。#$%^&*()=+{}\[\]|\\:;"'<>?,/~`!，！？；：""''（）【】《》]/.test(formData.nickname)) {
        errors.nickname = t('profileEdit.validation.nicknameNoSpecialChars');
      }
    }

    if (formData.bio && formData.bio.length > 24) {
      errors.bio = t('profileEdit.validation.bioMaxLength');
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ==================== 表单处理 ====================

  // 更新表单数据
  const updateFormData = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field as keyof typeof validationErrors]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof typeof validationErrors];
        return newErrors;
      });
    }
  };

  const handleDateConfirm = () => {
    const year = selectedDate.getFullYear();
    const month = (selectedDate.getMonth() + 1).toString().padStart(2, '0');
    const day = selectedDate.getDate().toString().padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    updateFormData('birthday', formattedDate);
    setShowDatePicker(false);
  };

  const handleDateChange = (newDate: Date) => {
    setSelectedDate(newDate);
  };

  // ==================== 保存资料 ====================
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const updateData: any = {};

      // 收集需要更新的字段
      if (formData.nickname !== (user?.nickname || '')) {
        updateData.nickname = formData.nickname || undefined;
      }
      if (formData.bio !== (user?.bio || '')) {
        updateData.bio = formData.bio || undefined;
      }
      if (formData.gender !== (user?.gender || '')) {
        updateData.gender = formData.gender || undefined;
      }
      if (formData.birthday !== (user?.birthday || '')) {
        updateData.birthday = formData.birthday || undefined;
      }

      if (Object.keys(updateData).length === 0) {
        toast(t('common.error'), t('profileEdit.messages.noChanges'), 'error');
        return;
      }

      await updateProfile(updateData);

      toast(t('common.success'), t('profileEdit.messages.updateSuccess'), 'success');

      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      toast(t('common.error'), getErrorMessage(error) || t('profileEdit.messages.updateFailed'), 'error');
    }
  };

  return {
    formData,
    validationErrors,
    showDatePicker,
    setShowDatePicker,
    selectedDate,
    isLoading,
    user,
    GENDER_OPTIONS,
    formatDisplayDate,
    updateFormData,
    handleDateConfirm,
    handleDateChange,
    handleSave,
    toast,
    AlertComponent,
  };
}
