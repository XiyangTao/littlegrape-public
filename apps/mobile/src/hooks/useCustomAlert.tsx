import React, { useState, useCallback } from 'react';
import { CustomAlert } from '@/components/CustomAlert';

interface AlertConfig {
  title: string;
  message: string;
  type?: 'info' | 'success' | 'error';
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
  toastStyle?: boolean;
}

export function useCustomAlert() {
  const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);

  const showAlert = useCallback((config: AlertConfig) => {
    setAlertConfig(config);
  }, []);

  const hideAlert = useCallback(() => {
    setAlertConfig(null);
  }, []);

  const alert = useCallback((title: string, message: string, type?: 'info' | 'success' | 'error') => {
    showAlert({
      title,
      message,
      type,
      onConfirm: hideAlert,
      autoClose: true,
      autoCloseDelay: 1500,
      toastStyle: false,
    });
  }, [showAlert, hideAlert]);

  const toast = useCallback((title: string, message: string, type?: 'info' | 'success' | 'error') => {
    showAlert({
      title,
      message,
      type,
      onConfirm: hideAlert,
      autoClose: true,
      autoCloseDelay: 2000,
      toastStyle: true,
    });
  }, [showAlert, hideAlert]);

  const confirm = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    type?: 'info' | 'success' | 'error'
  ) => {
    showAlert({
      title,
      message,
      type,
      showCancel: true,
      onConfirm: () => {
        hideAlert();
        onConfirm();
      },
      onCancel: () => {
        hideAlert();
        onCancel?.();
      },
    });
  }, [showAlert, hideAlert]);

  const AlertComponent = React.useMemo(() => {
    if (!alertConfig) return null;

    return (
      <CustomAlert
        visible={!!alertConfig}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        showCancel={alertConfig.showCancel}
        onConfirm={alertConfig.onConfirm || hideAlert}
        onCancel={alertConfig.onCancel}
        autoClose={alertConfig.autoClose}
        autoCloseDelay={alertConfig.autoCloseDelay}
        toastStyle={alertConfig.toastStyle}
      />
    );
  }, [alertConfig, hideAlert]);

  return {
    alert,
    toast,
    confirm,
    AlertComponent,
  };
}