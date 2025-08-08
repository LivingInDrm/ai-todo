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

export default function SettingsScreen() {
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>设置</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>账户信息</Text>
          <View style={styles.card}>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.email?.[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userEmail}>{user?.email || '未登录'}</Text>
                <Text style={styles.userId}>ID: {user?.id?.slice(0, 8) || 'N/A'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Language Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>语言设置</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.languageOption}
              onPress={() => handleLanguageChange('zh-CN')}
              activeOpacity={0.7}
            >
              <Text style={styles.optionText}>简体中文</Text>
              {language === 'zh-CN' && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.languageOption}
              onPress={() => handleLanguageChange('en-US')}
              activeOpacity={0.7}
            >
              <Text style={styles.optionText}>English</Text>
              {language === 'en-US' && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Data Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>数据管理</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleClearCompletedTasks}
              activeOpacity={0.7}
            >
              <View>
                <Text style={styles.actionText}>清理已完成任务</Text>
                <Text style={styles.actionDescription}>
                  清理所有已完成的任务 ({completedTasksCount} 个)
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>关于</Text>
          <View style={styles.card}>
            <View style={styles.aboutItem}>
              <Text style={styles.aboutLabel}>版本</Text>
              <Text style={styles.aboutValue}>1.0.0</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.aboutItem}>
              <Text style={styles.aboutLabel}>构建</Text>
              <Text style={styles.aboutValue}>MVP</Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutText}>退出登录</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  placeholder: {
    width: 40,
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
    color: '#666',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  userDetails: {
    marginLeft: 16,
    flex: 1,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  userId: {
    fontSize: 12,
    color: '#999',
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  checkmark: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 16,
  },
  actionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  actionText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 12,
    color: '#999',
  },
  chevron: {
    fontSize: 20,
    color: '#999',
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  aboutLabel: {
    fontSize: 16,
    color: '#333',
  },
  aboutValue: {
    fontSize: 14,
    color: '#999',
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FF3B30',
  },
  bottomPadding: {
    height: 32,
  },
});