import React from "react";

/**
 * Dynamically resolves and imports a theme component from `@/Themes/<theme_name>/<file_path>`.
 * Returns null if the path is invalid or the component fails to load.
 */
export async function loadThemeComponent<T = React.ComponentType<any>>(
  themeName: string | null | undefined,
  filePath: string | null | undefined,
): Promise<T | null> {
  if (!themeName || !filePath) return null;

  // Clean relative path (strip leading slashes and .tsx/.ts extension if present)
  const cleanPath = filePath.replace(/^\/+/, "").replace(/\.(tsx|ts|jsx|js)$/, "");
  const cleanTheme = themeName.replace(/^\/+|\/+$/g, "");

  if (!cleanTheme || !cleanPath) return null;

  try {
    const mod = await import(`@/Themes/${cleanTheme}/${cleanPath}`);
    return (mod.default || mod) as T;
  } catch (err) {
    console.error(
      `[ThemeLoader] Failed to dynamically load component @/Themes/${cleanTheme}/${cleanPath}:`,
      err,
    );
    return null;
  }
}
