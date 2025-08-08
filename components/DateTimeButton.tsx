import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

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
  const [showPicker, setShowPicker] = useState(false);
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
        style={styles.button}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Text style={styles.icon}>🕒</Text>
        <Text style={styles.label}>
          {value ? formatDate(value) : '添加日期'}
        </Text>
      </TouchableOpacity>
      
      {value && (
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClear}
          activeOpacity={0.7}
        >
          <Text style={styles.clearIcon}>✕</Text>
        </TouchableOpacity>
      )}
      
      {showPicker && (
        <>
          {Platform.OS === 'ios' && (
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.pickerButton}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDone}>
                  <Text style={[styles.pickerButton, styles.doneButton]}>
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
              mode={mode}
              display="default"
              onChange={handleDateChange}
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
    marginVertical: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flex: 1,
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  label: {
    fontSize: 16,
    color: '#000',
  },
  clearButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  clearIcon: {
    fontSize: 18,
    color: '#8E8E93',
  },
  pickerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  pickerButton: {
    fontSize: 16,
    color: '#8E8E93',
  },
  doneButton: {
    color: '#007AFF',
    fontWeight: '600',
  },
});

export default DateTimeButton;