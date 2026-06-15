import { Platform } from "react-native";

export const AppFont = {
  regular: Platform.select({
    web: "Calibri, Arial, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    default: "Calibri",
  }) as string,
};

export const Typography = {
  size: {
    caption: 11,
    meta: 12,
    small: 13,
    body: 15,
    bodyLarge: 16,
    subtitle: 18,
    title: 24,
    hero: 28,
  },
  lineHeight: {
    caption: 15,
    meta: 17,
    small: 19,
    body: 22,
    bodyLarge: 24,
    subtitle: 24,
    title: 30,
    hero: 34,
  },
};

export const defaultTextStyle = {
  fontFamily: AppFont.regular,
  fontSize: Typography.size.body,
  lineHeight: Typography.lineHeight.body,
  includeFontPadding: false,
};

export const globalFontStyle = {
  fontFamily: AppFont.regular,
  includeFontPadding: false,
};
