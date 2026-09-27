import type { CSSProperties } from "react";

import type { IconComponent } from "../types";

/**
 * Optical size scale. Using tokens instead of raw pixel numbers keeps every
 * glyph in the UI on the same rhythm — a 13px icon next to 12px text is the
 * single most common thing that makes an interface look accidental.
 */
export const ICON_SIZE = {
  xs: 11,
  sm: 12,
  md: 13,
  base: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
} as const;

export type IconSizeToken = keyof typeof ICON_SIZE;

/** Semantic colour slots, resolved in CSS so they stay themeable. */
export type IconTone =
  | "inherit"
  | "accent"
  | "accent-glow"
  | "muted"
  | "subtle"
  | "success"
  | "warning"
  | "error"
  | "cyan"
  | "inverse";

export interface IconProps {
  /** A component from the registry in `utils/icons.ts` — never a raw lucide import. */
  icon: IconComponent;
  size?: IconSizeToken;
  tone?: IconTone;
  /**
   * Only set this when the icon is the only carrier of the meaning. Decorative
   * icons are hidden from assistive tech by default, which is what you want for
   * the ~90% of icons that sit next to a text label.
   */
  label?: string;
  spin?: boolean;
  glow?: boolean;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
}

export function Icon({
  icon: Glyph,
  size = "base",
  tone = "inherit",
  label,
  spin = false,
  glow = false,
  strokeWidth,
  className,
  style,
}: IconProps) {
  const classes = [
    "icon",
    tone !== "inherit" ? `icon--${tone}` : null,
    spin ? "icon--spin" : null,
    glow ? "icon--glow" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Glyph
      size={ICON_SIZE[size]}
      strokeWidth={strokeWidth}
      className={classes}
      style={style}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    />
  );
}
