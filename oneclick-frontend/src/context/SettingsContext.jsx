import { createContext, useContext, useState, useEffect } from 'react';
import { getSettings } from '../api/settings';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({ company_name: 'Vantage' });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getSettings()
      .then((res) => setSettings((s) => ({ ...s, ...res.data })))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  function updateLocalSetting(key, value) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  return (
    <SettingsContext.Provider value={{ settings, loaded, updateLocalSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}