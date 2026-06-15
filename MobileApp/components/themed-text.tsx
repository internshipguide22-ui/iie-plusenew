import { StyleSheet, Text, type TextProps } from 'react-native';

import { useThemeColor } from '@/hooks/use-theme-color';
import { AppFont, Typography } from '@/constants/typography';

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return (
    <Text
      style={[
        { color },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontFamily: AppFont.regular,
    fontSize: Typography.size.body,
    lineHeight: Typography.lineHeight.body,
  },
  defaultSemiBold: {
    fontFamily: AppFont.regular,
    fontSize: Typography.size.body,
    lineHeight: Typography.lineHeight.body,
    fontWeight: '700',
  },
  title: {
    fontFamily: AppFont.regular,
    fontSize: Typography.size.hero,
    fontWeight: '800',
    lineHeight: Typography.lineHeight.hero,
  },
  subtitle: {
    fontFamily: AppFont.regular,
    fontSize: Typography.size.subtitle,
    lineHeight: Typography.lineHeight.subtitle,
    fontWeight: '800',
  },
  link: {
    fontFamily: AppFont.regular,
    lineHeight: Typography.lineHeight.body,
    fontSize: Typography.size.body,
    fontWeight: '700',
    color: '#0a7ea4',
  },
});
