/*
 * Copyright (c) Qualcomm Technologies, Inc. and/or its subsidiaries.
 * SPDX-License-Identifier: BSD-3-Clause
 */

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {Brand, Theme, type Appearance} from '~entities/appearance';
import {ConfigFileManager} from '~shared/config/config-manager';
import {showToast} from '~shared/controls/global-toaster';
import {logger} from '~shared/lib/logger';

interface ThemeContextType {
  appearance: Appearance;
  setAppearance: (appearance: Appearance) => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

const DEFAULT_APPEARANCE: Appearance = {
  brand: Brand.QUALCOMM,
  theme: Theme.LIGHT,
};

const applyAppearanceToDocument = ({brand, theme}: Appearance) => {
  const html = document.documentElement;
  html.setAttribute('data-brand', brand);
  html.setAttribute('data-theme', theme);
};

/**
 * Hook to access and modify the current appearance.
 * @returns The current appearance and an appearance setter.
 */
export function useAppearance(): [
  Appearance,
  (appearance: Appearance) => void,
] {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppearance must be used within ThemeProvider');
  }
  return [context.appearance, context.setAppearance];
}

/**
 * Hook to access and modify the current theme.
 * @returns [currentTheme, setTheme] tuple.
 */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return [context.appearance.theme, context.setTheme];
}

interface ThemeProviderProps {
  children: ReactNode;
}

/** Provides global, persisted brand and theme preferences. */
export function ThemeProvider({children}: ThemeProviderProps) {
  const [appearance, setAppearanceState] =
    useState<Appearance>(DEFAULT_APPEARANCE);
  const [configReady, setConfigReady] = useState(false);
  const appearanceRef = useRef(appearance);
  const saveRequestIdRef = useRef(0);

  useEffect(() => {
    const initConfig = async () => {
      try {
        await ConfigFileManager.instance.initializeConfig();
        const savedAppearance =
          ConfigFileManager.instance.getGlobalAppearance();
        const initialAppearance: Appearance = {
          brand: savedAppearance.brand,
          theme: savedAppearance.theme,
        };
        applyAppearanceToDocument(initialAppearance);
        setAppearanceState(initialAppearance);
      } catch (error) {
        logger.error('Failed to initialize config in ThemeProvider', {
          action: 'initialize_config',
          component: 'ThemeProvider',
          error: error instanceof Error ? error.message : String(error),
        });
        applyAppearanceToDocument(DEFAULT_APPEARANCE);
      } finally {
        setConfigReady(true);
      }
    };
    void initConfig();
  }, []);

  useEffect(() => {
    if (configReady) {
      applyAppearanceToDocument(appearance);
    }
  }, [appearance, configReady]);

  useEffect(() => {
    appearanceRef.current = appearance;
  }, [appearance]);

  const setAppearance = useCallback(async (nextAppearance: Appearance) => {
    const requestId = ++saveRequestIdRef.current;
    const previousAppearance = appearanceRef.current;
    appearanceRef.current = nextAppearance;
    setAppearanceState(nextAppearance);
    try {
      ConfigFileManager.instance.setGlobalAppearance(nextAppearance);
      const saved = await ConfigFileManager.instance.save();
      if (requestId !== saveRequestIdRef.current) {
        return;
      }
      if (!saved) {
        throw new Error('Configuration could not be saved');
      }
      showToast('Appearance saved', 'success');
    } catch (error) {
      if (requestId !== saveRequestIdRef.current) {
        return;
      }
      logger.error('Failed to save appearance', {
        action: 'save_appearance',
        component: 'ThemeProvider',
        error: error instanceof Error ? error.message : String(error),
      });
      ConfigFileManager.instance.setGlobalAppearance(previousAppearance);
      appearanceRef.current = previousAppearance;
      setAppearanceState(previousAppearance);
      showToast('Failed to save appearance', 'danger');
    }
  }, []);

  const setTheme = useCallback(
    (theme: Theme) => {
      void setAppearance({...appearance, theme});
    },
    [appearance, setAppearance],
  );

  const contextValue = useMemo(
    () => ({
      appearance,
      setAppearance: (nextAppearance: Appearance) => {
        void setAppearance(nextAppearance);
      },
      setTheme,
    }),
    [appearance, setAppearance, setTheme],
  );

  if (!configReady) {
    return (
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          height: '100vh',
          justifyContent: 'center',
        }}
      >
        <div style={{fontSize: '1.125rem'}}>Loading configuration...</div>
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}
