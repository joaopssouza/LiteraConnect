import { useState, useEffect } from 'react';

const PREFS_KEY = 'litera_preferences';

export interface UserPreferences {
  soundsEnabled: boolean;
  fontSize: number; // 12 to 24
}

const defaultPreferences: UserPreferences = {
  soundsEnabled: true,
  fontSize: 16,
};

export function usePreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setMounted(true);
      const stored = localStorage.getItem(PREFS_KEY);
      if (stored) {
        try {
          setPreferences({ ...defaultPreferences, ...JSON.parse(stored) });
        } catch (e) {
          console.error('Failed to parse preferences');
        }
      }
    }, 0);

    // Listen for cross-tab or cross-component changes
    const handleStorage = (e: StorageEvent) => {
      if (e.key === PREFS_KEY && e.newValue) {
        setPreferences({ ...defaultPreferences, ...JSON.parse(e.newValue) });
      }
    };

    // Custom event for same-window updates
    const handleCustom = (e: CustomEvent) => {
      setPreferences(e.detail);
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('litera_prefs_changed', handleCustom as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('litera_prefs_changed', handleCustom as EventListener);
    };
  }, []);

  const updatePreferences = (newPrefs: Partial<UserPreferences>) => {
    const updated = { ...preferences, ...newPrefs };
    setPreferences(updated);
    localStorage.setItem(PREFS_KEY, JSON.stringify(updated));

    // Custom event to sync across components in the same window
    window.dispatchEvent(new CustomEvent('litera_prefs_changed', { detail: updated }));
  };

  return { preferences, updatePreferences, mounted };
}
