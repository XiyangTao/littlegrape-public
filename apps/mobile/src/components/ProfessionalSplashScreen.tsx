import React, { useEffect, useRef } from 'react';
import {
  View,
  Image,
  Text,
  StyleSheet,
  Animated,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { scale, fontScale } from '@/utils/responsive';
import { useI18n } from '@/context/I18nProvider';

interface ProfessionalSplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

// 固定的启动屏颜色，不受主题影响
const SPLASH_COLORS = {
  primary: '#6B46C1',           // 深紫色主题色
  background: {
    primary: '#FFFFFF',
    secondary: '#F8FAFC',
  },
  text: {
    primary: '#1E293B',
    secondary: '#475569',
    disabled: '#94A3B8',
  },
  border: {
    light: '#E2E8F0',
  },
};

export function ProfessionalSplashScreen({
  onComplete,
  duration = 3000
}: ProfessionalSplashScreenProps) {
  const { width: screenWidth } = useWindowDimensions();
  const { t } = useI18n();
  const s = (size: number) => scale(size, screenWidth);
  const fs = (size: number) => fontScale(size, screenWidth);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // 设置状态栏
    StatusBar.setHidden(true);

    // 启动动画序列
    Animated.sequence([
      // Logo 出现动画
      Animated.parallel([
        Animated.timing(logoScaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      // 文字滑入动画
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // 自动结束
    const timer = setTimeout(() => {
      StatusBar.setHidden(false);
      onComplete();
    }, duration);

    return () => {
      clearTimeout(timer);
      StatusBar.setHidden(false);
    };
  }, [fadeAnim, slideAnim, logoScaleAnim, onComplete, duration]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: SPLASH_COLORS.background.secondary,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: s(40),
      paddingTop: s(60),
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: s(48),
    },
    logoBackground: {
      width: s(140),
      height: s(140),
      borderRadius: s(70),
      backgroundColor: SPLASH_COLORS.background.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: SPLASH_COLORS.primary,
      shadowOffset: {
        width: 0,
        height: 12,
      },
      shadowOpacity: 0.15,
      shadowRadius: 20,
      elevation: 12,
    },
    logoInnerShadow: {
      width: s(120),
      height: s(120),
      borderRadius: s(60),
      backgroundColor: SPLASH_COLORS.background.primary,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: SPLASH_COLORS.border.light,
    },
    logo: {
      width: s(90),
      height: s(90),
    },
    brandContainer: {
      alignItems: 'center',
      marginTop: s(16),
    },
    titleContainer: {
      alignItems: 'center',
      marginBottom: s(12),
    },
    appName: {
      fontSize: fs(36),
      fontWeight: '700',
      color: SPLASH_COLORS.text.primary,
      letterSpacing: 0.5,
      textAlign: 'center',
    },
    titleUnderline: {
      width: s(60),
      height: 3,
      backgroundColor: SPLASH_COLORS.primary,
      marginTop: s(8),
      borderRadius: 2,
    },
    appNameChinese: {
      fontSize: fs(20),
      fontWeight: '600',
      color: SPLASH_COLORS.primary,
      marginBottom: s(20),
      letterSpacing: 2,
    },
    slogan: {
      fontSize: fs(18),
      color: SPLASH_COLORS.text.secondary,
      textAlign: 'center',
      letterSpacing: 1,
      lineHeight: fs(26),
      marginBottom: s(8),
      fontWeight: '500',
    },
    subSlogan: {
      fontSize: fs(14),
      color: SPLASH_COLORS.text.disabled,
      textAlign: 'center',
      letterSpacing: 0.5,
      fontWeight: '400',
    },
    footer: {
      position: 'absolute',
      bottom: s(50),
      left: 0,
      right: 0,
      alignItems: 'center',
    },
    decorativeLine: {
      width: s(80),
      height: 2,
      backgroundColor: SPLASH_COLORS.border.light,
      marginBottom: s(12),
      borderRadius: 1,
    },
    footerText: {
      fontSize: fs(12),
      color: SPLASH_COLORS.text.disabled,
      fontWeight: '500',
      letterSpacing: 0.8,
    },
    decorativeElements: {
      position: 'absolute',
      width: '100%',
      height: '100%',
    },
    circle: {
      position: 'absolute',
      backgroundColor: `${SPLASH_COLORS.primary}08`,
      borderRadius: 999,
    },
    circle1: {
      width: s(200),
      height: s(200),
      top: s(-100),
      right: s(-100),
    },
    circle2: {
      width: s(150),
      height: s(150),
      bottom: s(-75),
      left: s(-75),
    },
    circle3: {
      width: s(100),
      height: s(100),
      top: '25%',
      left: s(-50),
    },
  });

  return (
    <View style={styles.container}>

      {/* 主内容区域 */}
      <View style={styles.content}>
        {/* Logo 区域 */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: logoScaleAnim }]
            }
          ]}
        >
          {/* Logo 背景圆圈 */}
          <View style={styles.logoBackground}>
            <View style={styles.logoInnerShadow}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </View>
        </Animated.View>

        {/* 品牌信息 */}
        <Animated.View
          style={[
            styles.brandContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          {/* 主标题 */}
          <View style={styles.titleContainer}>
            <Text style={styles.appName}>LittleGrape</Text>
            <View style={styles.titleUnderline} />
          </View>

          {/* 中文名称 */}
          <Text style={styles.appNameChinese}>{t('splash.appNameChinese')}</Text>

          {/* 标语 */}
          <Text style={styles.slogan}>{t('splash.slogan')}</Text>

          {/* 副标语 */}
          <Text style={styles.subSlogan}>{t('splash.subSlogan')}</Text>
        </Animated.View>
      </View>

      {/* 底部装饰 */}
      <View style={styles.footer}>
        <View style={styles.decorativeLine} />
        <Text style={styles.footerText}>{t('splash.footer')}</Text>
      </View>

      {/* 装饰性元素 */}
      <View style={styles.decorativeElements}>
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <View style={[styles.circle, styles.circle3]} />
      </View>
    </View>
  );
}
