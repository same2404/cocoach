// Copyright (c) 2026 FC Auggen Manager. All rights reserved. Copying or duplication is prohibited.


import { useState, useEffect, useCallback, useMemo } from 'react';
import { LicenseInfo, LicenseTier, LicenseFeature, TIER_FEATURES } from '../types';
import { apiFetch } from '../lib/apiClient';

const LICENSE_STORAGE_KEY = 'cocoach_license';
const LICENSE_CACHE_MS = 60 * 60 * 1000;

export function useLicense() {
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLicenseModal, setShowLicenseModal] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(LICENSE_STORAGE_KEY);
    if (stored) {
      try {
        const parsed: LicenseInfo = JSON.parse(stored);
        if (parsed.isActive && parsed.expiresAt > Date.now()) {
          setLicense(parsed);
          setLoading(false);
          return;
        }
      } catch { /* invalid */ }
    }
    setLoading(false);
    // License modal disabled for now — kept as developer feature for later
  }, []);

  const validateLicense = useCallback(async (key: string): Promise<boolean> => {
    try {
      const res = await apiFetch('/api/license/validate', {
        method: 'POST',
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      if (data.valid && data.license) {
        setLicense(data.license);
        localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(data.license));
        setShowLicenseModal(false);
        setError(null);
        return true;
      } else {
        setError(data.error || 'Ungültiger Lizenzschlüssel');
        return false;
      }
    } catch (err) {
      setError('Verbindung zum Lizenzserver fehlgeschlagen');
      return false;
    }
  }, []);

  const hasFeature = useCallback((feature: LicenseFeature): boolean => {
    if (!license || !license.isActive) return true;
    return license.features.includes(feature);
  }, [license]);

  const isExpired = useMemo(() => {
    if (!license) return true;
    return license.expiresAt <= Date.now();
  }, [license]);

  const daysRemaining = useMemo(() => {
    if (!license) return 0;
    const diff = license.expiresAt - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [license]);

  const logout = useCallback(() => {
    localStorage.removeItem(LICENSE_STORAGE_KEY);
    setLicense(null);
  }, []);

  return {
    license,
    loading,
    error,
    showLicenseModal,
    setShowLicenseModal,
    validateLicense,
    hasFeature,
    isExpired,
    daysRemaining,
    tier: license?.tier || null,
    logout,
  };
}
