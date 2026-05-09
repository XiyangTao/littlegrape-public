import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeProvider';
import { useI18n } from '@/context/I18nProvider';

// 页面组件导入
import HomeScreen from '@/screens/tabs/HomeScreen';
import LearnCenterScreen from '@/screens/tabs/LearnCenterScreen';
import AIChatsScreen from '@/screens/tabs/AIChatsScreen';
import DiscoverScreen from '@/screens/tabs/DiscoverScreen';
import ProfileScreen from '@/screens/tabs/ProfileScreen';

const Tab = createBottomTabNavigator();

// Tab 图标映射
const TAB_ICONS: Record<string, string> = {
  Home: 'home',
  Words: 'school',
  AIChats: 'forum',
  Discover: 'explore',
  Profile: 'person',
};

export default function TabNavigator() {
  const { theme } = useTheme();
  const { t } = useI18n();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background.primary }} edges={['top', 'left', 'right']}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarIcon: ({ focused, size }) => (
            <MaterialIcons
              name={(TAB_ICONS[route.name] || 'home') as any}
              size={size}
              color={focused ? theme.colors.primary : theme.colors.text.disabled}
            />
          ),
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.text.disabled,
          tabBarStyle: {
            backgroundColor: theme.colors.background.primary,
            borderTopWidth: 0,
            elevation: 0,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: -1 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
          },
          tabBarLabelStyle: {
            fontSize: theme.typography.fontSize.xxs,
            fontWeight: theme.typography.fontWeight.medium,
          },
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: t('tabs.home') }}
        />
        <Tab.Screen
          name="Words"
          component={LearnCenterScreen}
          options={{ title: t('tabs.learn') }}
        />
        <Tab.Screen
          name="AIChats"
          component={AIChatsScreen}
          options={{ title: t('tabs.aiChats') }}
        />

        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ title: t('tabs.profile') }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}
