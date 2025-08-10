import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Text, Button } from '@ui';
import { useThemeValues } from '@lib/theme/ThemeProvider';
import { lightTheme as defaultTheme } from '@lib/theme';

interface DateTimeButtonProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  mode?: 'date' | 'time' | 'datetime';
}

const DateTimeButton: React.FC<DateTimeButtonProps> = ({
  value,
  onChange,
  mode = 'datetime',
}) => {
  const theme = useThemeValues();
  const [showPicker, setShowPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false); // For Android two-step selection
  const [tempDate, setTempDate] = useState(value || new Date());

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      month: '2-digit',
      day: '2-digit',
    };
    
    if (mode === 'time' || mode === 'datetime') {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    
    return date.toLocaleString('zh-CN', options);
  };

  const handlePress = () => {
    setShowPicker(true);
  };

  const handleClear = () => {
    onChange(undefined);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      
      // For Android datetime mode, show time picker after date selection
      if (mode === 'datetime' && selectedDate) {
        setTempDate(selectedDate);
        setTimeout(() => setShowTimePicker(true), 100);
        return;
      }
    }
    
    if (selectedDate) {
      // If date mode OR datetime mode with default midnight time, set to 09:00
      if ((mode === 'date' || mode === 'datetime') && 
          selectedDate.getHours() === 0 && 
          selectedDate.getMinutes() === 0) {
        selectedDate.setHours(9, 0, 0, 0);
      }
      
      setTempDate(selectedDate);
      if (Platform.OS === 'android') {
        onChange(selectedDate);
      }
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    
    if (selectedTime) {
      const combinedDate = new Date(tempDate);
      combinedDate.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
      setTempDate(combinedDate);
      onChange(combinedDate);
    }
  };

  const handleDone = () => {
    // If date mode OR datetime mode with default midnight time, set to 09:00
    const finalDate = new Date(tempDate);
    if ((mode === 'date' || mode === 'datetime') && 
        finalDate.getHours() === 0 && 
        finalDate.getMinutes() === 0) {
      finalDate.setHours(9, 0, 0, 0);
    }
    
    onChange(finalDate);
    setShowPicker(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: theme.colors.bg.subtle,
            borderRadius: theme.radius.m,
            paddingHorizontal: theme.spacing.m,
            paddingVertical: theme.spacing.m,
          }
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Text style={styles.icon}>🕒</Text>
        <Text variant="body" color="primary">
          {value ? formatDate(value) : '添加日期'}
        </Text>
      </TouchableOpacity>
      
      {value && (
        <TouchableOpacity
          style={[
            styles.clearButton,
            {
              width: theme.spacing.xl,
              height: theme.spacing.xl,
              marginLeft: theme.spacing.s,
            }
          ]}
          onPress={handleClear}
          activeOpacity={0.7}
        >
          <Text variant="body" color="secondary" style={{ fontSize: theme.fontSize.l }}>
            ✕
          </Text>
        </TouchableOpacity>
      )}
      
      {showPicker && (
        <>
          {Platform.OS === 'ios' && (
            <View style={[
              styles.pickerContainer,
              {
                backgroundColor: theme.colors.bg.surface,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: theme.colors.border.default,
                marginTop: theme.spacing.m,
                marginHorizontal: -theme.spacingGroups.padding.sheet,
              }
            ]}>
              <View style={[
                styles.pickerHeader,
                {
                  paddingHorizontal: theme.spacing.l,
                  paddingVertical: theme.spacing.m,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.colors.border.subtle,
                }
              ]}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text variant="body" color="secondary">
                    取消
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDone}>
                  <Text 
                    variant="body" 
                    color="link"
                    style={{ fontWeight: theme.fontWeight.semibold }}
                  >
                    完成
                  </Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode={mode}
                display="spinner"
                onChange={handleDateChange}
                locale="zh-CN"
              />
            </View>
          )}
          
          {Platform.OS === 'android' && (
            <DateTimePicker
              value={tempDate}
              mode={mode === 'datetime' ? 'date' : mode}
              display="default"
              onChange={handleDateChange}
            />
          )}
          
          {Platform.OS === 'android' && showTimePicker && (
            <DateTimePicker
              value={tempDate}
              mode="time"
              display="default"
              onChange={handleTimeChange}
            />
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: defaultTheme.spacing.m,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    fontSize: defaultTheme.fontSize.m,
    marginRight: defaultTheme.spacing.s,
  },
  clearButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pickerContainer: {
    // Styles are applied inline
  },
});

export default DateTimeButton;