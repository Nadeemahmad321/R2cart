import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import { Colors } from '../../theme/colors';

interface DatePickerModalProps {
  visible: boolean;
  selectedDate?: string; // YYYY-MM-DD
  minDate?: Date;
  maxDays?: number;
  onSelectDate: (dateString: string) => void;
  onClose: () => void;
  title?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const formatYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  selectedDate,
  minDate = new Date(),
  maxDays = 14,
  onSelectDate,
  onClose,
  title = 'Select Delivery Date',
}) => {
  const insets = useSafeAreaInsets();

  // Normalize minDate to midnight
  const normalizedMin = useMemo(() => {
    const d = new Date(minDate);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [minDate]);

  const maxDate = useMemo(() => {
    const d = new Date(normalizedMin);
    d.setDate(d.getDate() + maxDays);
    return d;
  }, [normalizedMin, maxDays]);

  // Current view month & year
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (selectedDate) {
      const parts = selectedDate.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0])) {
        return new Date(parts[0], parts[1] - 1, 1);
      }
    }
    return new Date(normalizedMin.getFullYear(), normalizedMin.getMonth(), 1);
  });

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  // Quick Preset Options (Today, Tomorrow, +2 Days, +3 Days)
  const quickPresets = useMemo(() => {
    const presets = [];
    for (let i = 0; i < Math.min(maxDays, 5); i++) {
      const d = new Date(normalizedMin);
      d.setDate(d.getDate() + i);
      const ymd = formatYMD(d);
      let label = `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)}`;
      let sub = d.toLocaleDateString('en-US', { weekday: 'short' });
      if (i === 0) sub = 'Today';
      else if (i === 1) sub = 'Tomorrow';

      presets.push({ id: ymd, label, sub, dateObj: d });
    }
    return presets;
  }, [normalizedMin, maxDays]);

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const days = [];
    // Empty slots before 1st of month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNumber: null, isSelectable: false, ymd: '' });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const curDate = new Date(viewYear, viewMonth, day);
      curDate.setHours(0, 0, 0, 0);
      const ymd = formatYMD(curDate);
      const isSelectable = curDate >= normalizedMin && curDate <= maxDate;
      const isToday = curDate.getTime() === normalizedMin.getTime();
      const isSelected = selectedDate === ymd;

      days.push({
        dayNumber: day,
        isSelectable,
        isToday,
        isSelected,
        ymd,
      });
    }

    return days;
  }, [viewYear, viewMonth, normalizedMin, maxDate, selectedDate]);

  if (!visible) return null;

  const handlePrevMonth = () => {
    const prev = new Date(viewYear, viewMonth - 1, 1);
    if (prev.getMonth() >= normalizedMin.getMonth() || prev.getFullYear() > normalizedMin.getFullYear()) {
      setViewDate(prev);
    }
  };

  const handleNextMonth = () => {
    const next = new Date(viewYear, viewMonth + 1, 1);
    if (next <= maxDate) {
      setViewDate(next);
    }
  };

  const canGoPrev = new Date(viewYear, viewMonth, 1) > new Date(normalizedMin.getFullYear(), normalizedMin.getMonth(), 1);
  const canGoNext = new Date(viewYear, viewMonth + 1, 1) <= maxDate;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.calendarIconBox}>
                <Feather name="calendar" size={17} color="#059669" />
              </View>
              <Text style={styles.titleText}>{title}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Quick Preset Chips */}
          <View style={styles.quickPresetSection}>
            <Text style={styles.sectionKicker}>QUICK CHOOSE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsRow}>
              {quickPresets.map(p => {
                const isSelected = selectedDate === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.presetChip, isSelected && styles.presetChipActive]}
                    onPress={() => {
                      onSelectDate(p.id);
                      onClose();
                    }}
                  >
                    <Text style={[styles.presetSub, isSelected && styles.presetSubActive]}>{p.sub}</Text>
                    <Text style={[styles.presetLabel, isSelected && styles.presetLabelActive]}>{p.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Month / Year Navigator */}
          <View style={styles.monthNavigator}>
            <TouchableOpacity
              onPress={handlePrevMonth}
              disabled={!canGoPrev}
              style={[styles.navBtn, !canGoPrev && styles.navBtnDisabled]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="chevron-left" size={18} color={canGoPrev ? '#0F172A' : '#CBD5E1'} />
            </TouchableOpacity>
            <Text style={styles.monthHeading}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity
              onPress={handleNextMonth}
              disabled={!canGoNext}
              style={[styles.navBtn, !canGoNext && styles.navBtnDisabled]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="chevron-right" size={18} color={canGoNext ? '#0F172A' : '#CBD5E1'} />
            </TouchableOpacity>
          </View>

          {/* Weekday Row */}
          <View style={styles.weekdayRow}>
            {WEEK_DAYS.map((wd, i) => (
              <Text key={i} style={[styles.weekdayText, (i === 0 || i === 6) && { color: '#94A3B8' }]}>
                {wd}
              </Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {calendarDays.map((cell, idx) => {
              if (cell.dayNumber === null) {
                return <View key={`empty-${idx}`} style={styles.dayCell} />;
              }

              return (
                <TouchableOpacity
                  key={`day-${cell.ymd}`}
                  style={[
                    styles.dayCell,
                    cell.isSelectable && styles.dayCellSelectable,
                    cell.isSelected && styles.dayCellSelected,
                    cell.isToday && !cell.isSelected && styles.dayCellToday,
                  ]}
                  disabled={!cell.isSelectable}
                  onPress={() => {
                    onSelectDate(cell.ymd);
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !cell.isSelectable && styles.dayTextDisabled,
                      cell.isToday && !cell.isSelected && styles.dayTextToday,
                      cell.isSelected && styles.dayTextSelected,
                    ]}
                  >
                    {cell.dayNumber}
                  </Text>
                  {cell.isSelected && (
                    <View style={styles.selectedDot} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 360,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 9,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  quickPresetSection: {
    marginTop: 12,
    marginBottom: 10,
  },
  sectionKicker: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  presetsRow: {
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    minWidth: 70,
  },
  presetChipActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  presetSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  presetSubActive: {
    color: '#059669',
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 1,
  },
  presetLabelActive: {
    color: '#047857',
  },
  monthNavigator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  navBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
  },
  navBtnDisabled: {
    opacity: 0.4,
  },
  monthHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  weekdayText: {
    width: '14.28%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  dayCell: {
    width: '14.28%',
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: 2,
    position: 'relative',
  },
  dayCellSelectable: {
    backgroundColor: '#FFFFFF',
  },
  dayCellSelected: {
    backgroundColor: '#059669',
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: '#059669',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  dayTextDisabled: {
    color: '#CBD5E1',
    fontWeight: '400',
  },
  dayTextToday: {
    color: '#059669',
    fontWeight: '800',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  selectedDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
});
