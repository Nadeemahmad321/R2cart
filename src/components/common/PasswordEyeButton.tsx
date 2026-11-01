import React from 'react';
import { TouchableOpacity, View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

interface PasswordEyeButtonProps {
  visible: boolean;
  onToggle: () => void;
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
}

export const PasswordEyeButton: React.FC<PasswordEyeButtonProps> = ({
  visible,
  onToggle,
  style,
  iconSize = 20,
}) => {
  return (
    <TouchableOpacity
      style={[styles.container, style]}
      onPress={onToggle}
      activeOpacity={0.7}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityLabel={visible ? 'Hide password' : 'Show password'}
      accessibilityRole="button"
    >
      {visible ? (
        // Eye Open State (Password Visible) - Clear Brand Green
        <Feather name="eye" size={iconSize} color="#059669" />
      ) : (
        // Eye Hidden State (Password Masked) - Eye with Clean Diagonal Slash Line
        <View style={[styles.iconWrapper, { width: iconSize + 4, height: iconSize + 4 }]}>
          <Feather name="eye" size={iconSize} color="#64748B" />
          <View style={styles.slashWrapper} pointerEvents="none">
            {/* White micro-cutout behind the line for a sharp separation */}
            <View style={styles.slashUnderline} />
            {/* Crisp prominent diagonal slash line */}
            <View style={styles.slashCore} />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  iconWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  slashWrapper: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: 24,
    height: 24,
    transform: [{ rotate: '-45deg' }],
  },
  slashUnderline: {
    position: 'absolute',
    width: 23,
    height: 3.2,
    backgroundColor: '#FFFFFF',
    borderRadius: 1.6,
  },
  slashCore: {
    position: 'absolute',
    width: 21,
    height: 1.8,
    backgroundColor: '#64748B',
    borderRadius: 1,
  },
});

export default PasswordEyeButton;
