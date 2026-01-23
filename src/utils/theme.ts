import { loadConfig, saveConfig } from '../apis';
import { showInfo } from './notifications';


export interface ThemeConfig {
  darkMode: boolean;
}

const loadThemeConfig = async (): Promise<ThemeConfig | null> => {
  return await loadConfig() as ThemeConfig | null;
};

const saveThemeConfig = async (config: ThemeConfig): Promise<void> => {
  loadConfig().then((existingConfig) => {
    saveConfig({ ...existingConfig, darkMode: config.darkMode })
  }).catch(() => {
    console.log("no config found");
    saveConfig(config)
  });
};

export const loadDarkMode = async (): Promise<boolean> => {
  const config = await loadThemeConfig();
  return config?.darkMode ?? false;
};

export const saveDarkMode = async (sign: boolean): Promise<void> => {
  await saveThemeConfig({ darkMode: sign });
};

export const applyTheme = (darkMode: boolean): void => {
  if (darkMode) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

export const toggleDarkMode = async (): Promise<boolean> => {
  const currentDarkMode = await loadDarkMode();
  const newDarkMode = !currentDarkMode;
  await saveDarkMode(newDarkMode);
  applyTheme(newDarkMode);
  return newDarkMode;
};

export const initializeTheme = async (): Promise<void> => {
  const darkMode = await loadDarkMode();
  applyTheme(darkMode);
};