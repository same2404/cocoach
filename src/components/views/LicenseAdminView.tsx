import React, { useState, useEffect } from 'react';
import { Key, Shield, Zap, Crown, Plus, Trash2, Clock, Users, RefreshCw, Loader2, CheckCircle, AlertTriangle, Copy, Eye, EyeOff } from 'lucide-react';
import { LicenseTier, TIER_FEATURES, TIER_PRICES } from '../../types';
import { apiFetch } from '../../lib/apiClient';

interface License {
  key: string;
  tier: LicenseTier;
  clubId: string;
  clubName: string;
  issuedAt: number;
  expiresAt: number;
  isActive: boolean;
  features: string[];
  maxUsers: number;
  maxClubs: number;
}

export const LicenseAdminView: React.FC = () => {
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [genClubName, setGenClubName] = useState('');
  const [genClubId, setGenClubId] = useState('');
  const [genTier, setGenTier] = useState<LicenseTier>('pro');
  const [genMaxUsers, setGenMaxUsers] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

  const fetchLicenses = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/license/list');
      const data = await res.json();
      setLicenses(data.licenses || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchLicenses(); }, []);

  const handleGenerate = async () => {
    if (!genClubName || !genClubId) return;
    setGenerating(true);
    try {
      const res = await apiFetch('/api/license/generate', {
        method: 'POST',
        body: JSON.stringify({ tier: genTier, clubId: genClubId, clubName: genClubName, maxUsers: genMaxUsers }),
      });
      const data = await res.json();
      if (data.success && data.license) {
        setGeneratedKey(data.license.key);
        fetchLicenses();
      }
    } catch { /* ignore */ }
    setGenerating(false);
  };

  const handleRevoke = async (key: string) => {
    if (!confirm('Lizenz wirklich widerrufen?')) return;
    await apiFetch('/api/license/revoke', {
      method: 'POST',
      body: JSON.stringify({ key }),
    });
    fetchLicenses();
  };

  const handleExtend = async (key: string) => {
    await apiFetch('/api/license/extend', {
      method: 'POST',
      body: JSON.stringify({ key, days: 365 }),
    });
    fetchLicenses();
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
  };

  const TIER_ICONS: Record<LicenseTier, React.ReactNode> = {
    basic: <Shield className="w-4 h-4" />,
    pro: <Zap className="w-4 h-4" />,
    enterprise: <Crown className="w-4 h-4" />,
  };

  const TIER_COLORS: Record<LicenseTier, string> = {
    basic: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    pro: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    enterprise: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Key className="w-6 h-6 text-emerald-400" />
            Lizenzverwaltung
          </h2>
          <p className="text-gray-400 text-sm mt-1">CoCoach Lizenzen verwalten und vergeben</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchLicenses} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 flex items-center gap-1 text-sm">
            <RefreshCw className="w-4 h-4" /> Aktualisieren
          </button>
          <button onClick={() => setShowGenerate(true)} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 rounded-lg text-white font-semibold flex items-center gap-1 text-sm">
            <Plus className="w-4 h-4" /> Neue Lizenz
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {(Object.keys(TIER_PRICES) as LicenseTier[]).map((t) => {
          const count = licenses.filter(l => l.tier === t && l.isActive).length;
          return (
            <div key={t} className={`p-4 rounded-xl border ${TIER_COLORS[t]}`}>
              <div className="flex items-center gap-2 mb-2">
                {TIER_ICONS[t]}
                <span className="font-semibold capitalize">{t}</span>
                <span className="ml-auto text-xs opacity-70">{TIER_PRICES[t].monthly}€/Mo</span>
              </div>
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-xs opacity-70">Aktive Lizenzen</div>
            </div>
          );
        })}
      </div>

      {showGenerate && (
        <div className="p-6 bg-white/5 border border-white/10 rounded-xl space-y-4">
          <h3 className="text-lg font-semibold text-white">Neue Lizenz generieren</h3>
          {generatedKey ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle className="w-5 h-5" />
                Lizenz erfolgreich generiert!
              </div>
              <div className="flex items-center gap-2 bg-white/5 p-3 rounded-lg border border-white/10">
                <code className="text-white font-mono text-lg flex-1">{generatedKey}</code>
                <button onClick={() => copyKey(generatedKey)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <button onClick={() => { setGeneratedKey(null); setShowGenerate(false); }} className="text-gray-400 hover:text-white text-sm">
                Schließen
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Club-Name</label>
                  <input value={genClubName} onChange={e => setGenClubName(e.target.value)} placeholder="SV Musterstadt" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500/50" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Club-ID</label>
                  <input value={genClubId} onChange={e => setGenClubId(e.target.value)} placeholder="sv-musterstadt" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500/50" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Tier</label>
                  <div className="flex gap-2">
                    {(Object.keys(TIER_PRICES) as LicenseTier[]).map(t => (
                      <button key={t} onClick={() => setGenTier(t)} className={`flex-1 px-3 py-2 rounded-lg border text-sm capitalize transition-all ${genTier === t ? TIER_COLORS[t] + ' border-current' : 'border-white/10 text-gray-400 hover:text-white'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Max. Nutzer</label>
                  <input type="number" value={genMaxUsers} onChange={e => setGenMaxUsers(parseInt(e.target.value) || 10)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500/50" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleGenerate} disabled={generating || !genClubName || !genClubId} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 rounded-lg text-white font-semibold flex items-center gap-1">
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                  Generieren
                </button>
                <button onClick={() => setShowGenerate(false)} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white">
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-8 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
        ) : licenses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Noch keine Lizenzen vorhanden</div>
        ) : (
          licenses.map((lic) => {
            const isExpired = lic.expiresAt <= Date.now();
            const daysLeft = Math.max(0, Math.ceil((lic.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)));
            const showKey = revealedKeys.has(lic.key);
            return (
              <div key={lic.key} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${lic.isActive && !isExpired ? 'border-white/10 bg-white/5' : 'border-red-500/20 bg-red-500/5 opacity-60'}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${TIER_COLORS[lic.tier]}`}>
                  {TIER_ICONS[lic.tier]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold">{lic.clubName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${TIER_COLORS[lic.tier]}`}>{lic.tier}</span>
                    {isExpired && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">Abgelaufen</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className="font-mono">
                      {showKey ? lic.key : '••••-••••-••••'}
                      <button onClick={() => setRevealedKeys(prev => { const s = new Set(prev); showKey ? s.delete(lic.key) : s.add(lic.key); return s; })} className="ml-1 text-gray-500 hover:text-white">
                        {showKey ? <EyeOff className="w-3 h-3 inline" /> : <Eye className="w-3 h-3 inline" />}
                      </button>
                    </span>
                    <span><Clock className="w-3 h-3 inline mr-1" />{daysLeft} Tage</span>
                    <span><Users className="w-3 h-3 inline mr-1" />Max {lic.maxUsers}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => copyKey(lic.key)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white" title="Kopieren">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleExtend(lic.key)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-emerald-400" title="+1 Jahr">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleRevoke(lic.key)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-red-400" title="Widerrufen">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
