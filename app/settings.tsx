import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { useAuthStore } from '../features/auth/authStore';
import useTaskStore from '../features/task/taskStore';
import { useTheme } from '../lib/theme/ThemeProvider';
import { lightTheme as defaultTheme } from '../lib/theme';
import { Text } from '@ui';

export default function SettingsScreen() {
  const { theme } = useTheme();
  const { user, signOut } = useAuthStore();
  const { tasks, clearCompletedTasks } = useTaskStore();
  const [language, setLanguage] = useState('zh-CN');
  const completedTasksCount = tasks.filter(t => t.status === 1).length;

  const handleLogout = async () => {
    Alert.alert(
      '确认退出',
      '确定要退出登录吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/auth');
          },
        },
      ]
    );
  };

  const handleClearCompletedTasks = () => {
    if (completedTasksCount === 0) {
      Alert.alert('提示', '没有已完成的任务需要清理');
      return;
    }

    Alert.alert(
      '清理已完成任务',
      `确定要清理 ${completedTasksCount} 个已完成的任务吗？此操作不可恢复。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          style: 'destructive',
          onPress: async () => {
            await clearCompletedTasks();
            Alert.alert('成功', '已清理所有已完成的任务');
          },
        },
      ]
    );
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    // TODO: Implement actual language change logic with i18n
    Alert.alert('提示', '语言切换功能即将推出');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.bg.subtle }]} edges={['top']}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.bg.surface, borderBottomColor: theme.colors.border.default, paddingHorizontal: theme.spacing.l, paddingVertical: theme.spacing.m }]}>
        <TouchableOpacity
          style={[styles.backButton, { padding: theme.spacing.s }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={{ fontSize: theme.fontSize.xl }}>←</Text>
        </TouchableOpacity>
        <Text variant="heading" style={styles.headerTitle}>设置</Text>
        <View style={{ width: theme.sizing.control.m }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info Section */}
        <View style={[styles.section, { marginTop: theme.spacing['2xl'], paddingHorizontal: theme.spacing.l }]}>
          <Text variant="caption" color="secondary" style={[styles.sectionTitle, { marginBottom: theme.spacing.s, marginLeft: theme.spacing.xs }]}>账户信息</Text>
          <View style={[styles.card, { backgroundColor: theme.colors.bg.surface, borderRadius: theme.radius.l }]}>
            <View style={[styles.userInfo, { padding: theme.spacing.l }]}>
              <View style={[styles.avatar, { backgroundColor: theme.colors.accent.primary, width: theme.sizing.avatar, height: theme.sizing.avatar, borderRadius: theme.sizing.avatar / 2 }]}>
                <Text variant="heading" color="inverse" style={styles.avatarText}>
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={[styles.userDetails, { marginLeft: theme.spacing.l }]}>
                <Text variant="body" style={[styles.userEmail, { marginBottom: theme.spacing.xs }]}>{user?.email || '未登录'}</Text>
                <Text variant="caption" color="muted" style={styles.userId}>ID: {user?.id?.slice(0, 8) || 'N/A'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Language Section */}
        <View style={[styles.section, { marginTop: theme.spacing['2xl'], paddingHorizontal: theme.spacing.l }]}>
          <Text variant="caption" color="secondary" style={[styles.sectionTitle, { marginBottom: theme.spacing.s, marginLeft: theme.spacing.xs }]}>语言设置</Text>
          <View style={[styles.card, { backgroundColor: theme.colors.bg.surface, borderRadius: theme.radius.l }]}>
            <TouchableOpacity
              style={[styles.languageOption, { padding: theme.spacing.l }]}
              onPress={() => handleLanguageChange('zh-CN')}
              activeOpacity={0.7}
            >
              <Text variant="body" style={styles.optionText}>简体中文</Text>
              {language === 'zh-CN' && <Text variant="body" color="link" style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: theme.colors.border.subtle, marginLeft: theme.spacing.l }]} />
            <TouchableOpacity
              style={[styles.languageOption, { padding: theme.spacing.l }]}
              onPress={() => handleLanguageChange('en-US')}
              activeOpacity={0.7}
            >
              <Text variant="body" style={styles.optionText}>English</Text>
              {language === 'en-US' && <Text variant="body" color="link" style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Data Management Section */}
        <View style={[styles.section, { marginTop: theme.spacing['2xl'], paddingHorizontal: theme.spacing.l }]}>
          <Text variant="caption" color="secondary" style={[styles.sectionTitle, { marginBottom: theme.spacing.s, marginLeft: theme.spacing.xs }]}>数据管理</Text>
          <View style={[styles.card, { backgroundColor: theme.colors.bg.surface, borderRadius: theme.radius.l }]}>
            <TouchableOpacity
              style={[styles.actionItem, { padding: theme.spacing.l }]}
              onPress={handleClearCompletedTasks}
              activeOpacity={0.7}
            >
              <View>
                <Text variant="body" style={[styles.actionText, { marginBottom: theme.spacing.xs }]}>清理已完成任务</Text>
                <Text variant="caption" color="muted" style={styles.actionDescription}>
                  清理所有已完成的任务 ({completedTasksCount} 个)
                </Text>
              </View>
              <Text variant="body" color="muted" style={[styles.chevron, { fontSize: theme.fontSize.xl }]}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* About Section */}
        <View style={[styles.section, { marginTop: theme.spacing['2xl'], paddingHorizontal: theme.spacing.l }]}>
          <Text variant="caption" color="secondary" style={[styles.sectionTitle, { marginBottom: theme.spacing.s, marginLeft: theme.spacing.xs }]}>关于</Text>
          <View style={[styles.card, { backgroundColor: theme.colors.bg.surface, borderRadius: theme.radius.l }]}>
            <View style={[styles.aboutItem, { padding: theme.spacing.l }]}>
              <Text variant="body" style={styles.aboutLabel}>版本</Text>
              <Text variant="caption" color="muted" style={styles.aboutValue}>1.0.0</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.colors.border.subtle, marginLeft: theme.spacing.l }]} />
            <View style={[styles.aboutItem, { padding: theme.spacing.l }]}>
              <Text variant="body" style={styles.aboutLabel}>构建</Text>
              <Text variant="caption" color="muted" style={styles.aboutValue}>MVP</Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: theme.colors.bg.surface, borderColor: theme.colors.feedback.danger, marginHorizontal: theme.spacing.l, marginTop: theme.spacing['3xl'], borderRadius: theme.radius.l, padding: theme.spacing.l }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text variant="body" color="danger" style={styles.logoutText}>退出登录</Text>
        </TouchableOpacity>

        <View style={[styles.bottomPadding, { height: theme.spacing['3xl'] }]} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: defaultTheme.spacing.l,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: defaultTheme.spacing.s,
  },
  headerTitle: {
    fontSize: defaultTheme.fontSize.l,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: defaultTheme.spacing.xl,
    paddingHorizontal: defaultTheme.spacing.l,
  },
  sectionTitle: {
    fontSize: defaultTheme.fontSize.s,
    fontWeight: '500',
    marginBottom: defaultTheme.spacing.s,
    marginLeft: defaultTheme.spacing.xs,
  },
  card: {
    borderRadius: defaultTheme.radius.m,
    overflow: 'hidden',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: defaultTheme.spacing.l,
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '600',
  },
  userDetails: {
    flex: 1,
  },
  userEmail: {
    fontWeight: '500',
  },
  userId: {
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionText: {
  },
  checkmark: {
    fontWeight: '600',
  },
  divider: {
    height: 1,
  },
  actionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionText: {
  },
  actionDescription: {
  },
  chevron: {
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aboutLabel: {
  },
  aboutValue: {
  },
  logoutButton: {
    alignItems: 'center',
    borderWidth: 1,
  },
  logoutText: {
    fontWeight: '500',
  },
  bottomPadding: {
  },
});