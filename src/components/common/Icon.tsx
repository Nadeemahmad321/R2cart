import React from 'react';
import Feather from 'react-native-vector-icons/Feather';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

export const FeatherIcon: React.FC<IconProps> = ({ name, size = 20, color = '#1C1C1E', style }) => {
  return <Feather name={name} size={size} color={color} style={style} />;
};

export default Feather;
