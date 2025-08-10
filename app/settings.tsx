import React, { useState } from 'react';
import {
  View,
  Text,
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
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.bg.surface, borderBottomColor: theme.colors.border.default, paddingHorizontal: theme.spacing.l, paddingVertical: theme.spacing.m }]}>
        <TouchableOpacity
          style={[styles.backButton, { padding: theme.spacing.s }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={[styles.backIcon, { color: theme.colors.text.primary, fontSize: theme.fontSize.xl }]}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary, fontSize: theme.fontSize.l }]}>设置</Text>
        <View style={[styles.placeholder, { width: 40 }]} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info Section */}
        <View style={[styles.section, { marginTop: theme.spacing['2xl'], paddingHorizontal: theme.spacing.l }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary, fontSize: theme.fontSize.s, marginBottom: theme.spacing.s, marginLeft: theme.spacing.xs }]}>账户信息</Text>
          <View style={[styles.card, { backgroundColor: theme.colors.bg.surface, borderRadius: theme.radius.l }]}>
            <View style={[styles.userInfo, { padding: theme.spacing.l }]}>
              <View style={[styles.avatar, { backgroundColor: theme.colors.accent.primary, width: theme.sizing.avatar, height: theme.sizing.avatar, borderRadius: theme.sizing.avatar / 2 }]}>
                <Text style={[styles.avatarText, { color: theme.colors.text.inverse, fontSize: theme.fontSize.xl }]}>
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={[styles.userDetails, { marginLeft: theme.spacing.l }]}>
                <Text style={[styles.userEmail, { color: theme.colors.text.primary, fontSize: theme.fontSize.m, marginBottom: theme.spacing.xs }]}>{user?.email || '未登录'}</Text>
                <Text style={[styles.userId, { color: theme.colors.text.muted, fontSize: theme.fontSize.xs }]}>ID: {user?.id?.slice(0, 8) || 'N/A'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Language Section */}
        <View style={[styles.section, { marginTop: theme.spacing['2xl'], paddingHorizontal: theme.spacing.l }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary, fontSize: theme.fontSize.s, marginBottom: theme.spacing.s, marginLeft: theme.spacing.xs }]}>语言设置</Text>
          <View style={[styles.card, { backgroundColor: theme.colors.bg.surface, borderRadius: theme.radius.l }]}>
            <TouchableOpacity
              style={[styles.languageOption, { padding: theme.spacing.l }]}
              onPress={() => handleLanguageChange('zh-CN')}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionText, { color: theme.colors.text.primary, fontSize: theme.fontSize.m }]}>简体中文</Text>
              {language === 'zh-CN' && <Text style={[styles.checkmark, { color: theme.colors.accent.primary, fontSize: theme.fontSize.l }]}>✓</Text>}
            </TouchableOpacity>
            <View style={[styles.divider, { backgroundColor: theme.colors.border.subtle, marginLeft: theme.spacing.l }]} />
            <TouchableOpacity
              style={[styles.languageOption, { padding: theme.spacing.l }]}
              onPress={() => handleLanguageChange('en-US')}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionText, { color: theme.colors.text.primary, fontSize: theme.fontSize.m }]}>English</Text>
              {language === 'en-US' && <Text style={[styles.checkmark, { color: theme.colors.accent.primary, fontSize: theme.fontSize.l }]}>✓</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Data Management Section */}
        <View style={[styles.section, { marginTop: theme.spacing['2xl'], paddingHorizontal: theme.spacing.l }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary, fontSize: theme.fontSize.s, marginBottom: theme.spacing.s, marginLeft: theme.spacing.xs }]}>数据管理</Text>
          <View style={[styles.card, { backgroundColor: theme.colors.bg.surface, borderRadius: theme.radius.l }]}>
            <TouchableOpacity
              style={[styles.actionItem, { padding: theme.spacing.l }]}
              onPress={handleClearCompletedTasks}
              activeOpacity={0.7}
            >
              <View>
                <Text style={[styles.actionText, { color: theme.colors.text.primary, fontSize: theme.fontSize.m, marginBottom: theme.spacing.xs }]}>清理已完成任务</Text>
                <Text style={[styles.actionDescription, { color: theme.colors.text.muted, fontSize: theme.fontSize.xs }]}>
                  清理所有已完成的任务 ({completedTasksCount} 个)
                </Text>
              </View>
              <Text style={[styles.chevron, { color: theme.colors.text.muted, fontSize: theme.fontSize.xl }]}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* About Section */}
        <View style={[styles.section, { marginTop: theme.spacing['2xl'], paddingHorizontal: theme.spacing.l }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary, fontSize: theme.fontSize.s, marginBottom: theme.spacing.s, marginLeft: theme.spacing.xs }]}>关于</Text>
          <View style={[styles.card, { backgroundColor: theme.colors.bg.surface, borderRadius: theme.radius.l }]}>
            <View style={[styles.aboutItem, { padding: theme.spacing.l }]}>
              <Text style={[styles.aboutLabel, { color: theme.colors.text.primary, fontSize: theme.fontSize.m }]}>版本</Text>
              <Text style={[styles.aboutValue, { color: theme.colors.text.muted, fontSize: theme.fontSize.s }]}>1.0.0</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.colors.border.subtle, marginLeft: theme.spacing.l }]} />
            <View style={[styles.aboutItem, { padding: theme.spacing.l }]}>
              <Text style={[styles.aboutLabel, { color: theme.colors.text.primary, fontSize: theme.fontSize.m }]}>构建</Text>
              <Text style={[styles.aboutValue, { color: theme.colors.text.muted, fontSize: theme.fontSize.s }]}>MVP</Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: theme.colors.bg.surface, borderColor: theme.colors.feedback.danger, marginHorizontal: theme.spacing.l, marginTop: theme.spacing['3xl'], borderRadius: theme.radius.l, padding: theme.spacing.l }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text style={[styles.logoutText, { color: theme.colors.feedback.danger, fontSize: theme.fontSize.m }]}>退出登录</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
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