import React, { useState } from 'react';
import { Key, Shield, Zap, Crown, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { LicenseTier, TIER_FEATURES, TIER_PRICES } from '../types';

interface LicenseModalProps {
  onValidate: (key: string) => Promise<boolean>;
  error: string | null;
  tier?: LicenseTier | null;
  daysRemaining?: number;
}

const TIER_CONFIG: Record<LicenseTier, { icon: React.ReactNode; color: string; name: string; desc: string }> = {
  basic: {
    icon: <Shield className="w-6 h-6" />,
    color: 'from-blue-500 to-blue-700',
    name: 'Basic',
    desc: 'Kader, Training & Spiele',
  },
  pro: {
    icon: <Zap className="w-6 h-6" />,
    color: 'from-emerald-500 to-emerald-700',
    name: 'Pro',
    desc: 'Alle Tabs inkl. Taktiktafel & Scouting',
  },
  enterprise: {
    icon: <Crown className="w-6 h-6" />,
    color: 'from-amber-500 to-amber-700',
    name: 'Enterprise',
    desc: 'Alles inkl. Video & Naomi Analyse-Agent',
  },
};

export const LicenseModal: React.FC<LicenseModalProps> = ({ onValidate, error, tier, daysRemaining }) => {
  const [key, setKey] = useState('');
  const [validating, setValidating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;
    setValidating(true);
    setLocalError(null);
    const success = await onValidate(key.trim());
    if (!success) {
      setValidating(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#0A0E17]/95 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-sm font-medium">
            <Key className="w-4 h-4" />
            CoCoach Lizenz
          </div>
          <h1 className="text-3xl font-bold text-white">Willkommen bei CoCoach</h1>
          <p className="text-gray-400">Gib deinen Lizenzschlüssel ein um fortzufahren</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {(Object.keys(TIER_CONFIG) as LicenseTier[]).map((t) => {
            const cfg = TIER_CONFIG[t];
            const isActive = tier === t;
            return (
              <div
                key={t}
                className={`relative p-4 rounded-xl border transition-all ${
                  isActive
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                {isActive && (
                  <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    AKTIV
                  </div>
                )}
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${cfg.color} flex items-center justify-center text-white mb-2`}>
                  {cfg.icon}
                </div>
                <h3 className="text-white font-semibold text-sm">{cfg.name}</h3>
                <p className="text-gray-400 text-xs mt-1">{cfg.desc}</p>
                <div className="mt-2 text-emerald-400 font-bold text-sm">
                  {TIER_PRICES[t].monthly}€ <span className="text-gray-500 text-xs font-normal">/Monat</span>
                </div>
                <div className="mt-1">
                  <button className="text-[10px] text-gray-400 underline hover:text-white" onClick={() => window.open('mailto:samerkhaleel720@gmail.com?subject=CoCoach ' + t.toUpperCase() + ' Lizenz bestellen')}>
                    Jetzt bestellen
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {tier && daysRemaining !== undefined && daysRemaining > 0 && (
          <div className="text-center text-sm text-gray-400">
            Deine <span className="text-white font-semibold">{tier.toUpperCase()}</span> Lizenz läuft in <span className={daysRemaining <= 7 ? 'text-amber-400 font-bold' : 'text-emerald-400'}>{daysRemaining} Tagen</span> ab.
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="CC-XXXX-XXXX-XXXX-XXXX"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono tracking-wider placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 text-center text-lg"
            autoFocus
          />
          <button
            type="submit"
            disabled={validating || !key.trim()}
            className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-semibold flex items-center gap-2 transition-all"
          >
            {validating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Key className="w-5 h-5" />}
            Aktivieren
          </button>
        </form>

        {displayError && (
          <div className="flex items-center gap-2 text-red-400 text-sm justify-center">
            <AlertTriangle className="w-4 h-4" />
            {displayError}
          </div>
        )}

        <div className="text-center">
          <p className="text-gray-500 text-xs">
            Keine Lizenz? <button className="text-emerald-400 hover:underline" onClick={() => window.open('mailto:samerkhaleel720@gmail.com?subject=CoCoach Demo anfordern')}>Demo anfordern</button>
          </p>
        </div>
      </div>
    </div>
  );
};
