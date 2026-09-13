import React, { useState, useMemo } from 'react';
import { Shield, CheckCircle, AlertTriangle, XCircle, Eye, EyeOff, Filter, Trash2, RefreshCw } from 'lucide-react';
import { filterAIOutput, getQualityColor, getQualityLabel, QualityCheckResult } from '../../utils/aiQualityFilter';

interface AIOutput {
  id: string;
  text: string;
  timestamp: number;
  source: string;
  quality?: { score: number; flags: string[]; passed: boolean; cleanedText: string };
}

interface AIQualityFilterViewProps {
  aiOutputs?: AIOutput[];
}

export const AIQualityFilterView: React.FC<AIQualityFilterViewProps> = ({ aiOutputs = [] }) => {
  const [testText, setTestText] = useState('');
  const [showCleaned, setShowCleaned] = useState(false);
  const [filterEnabled, setFilterEnabled] = useState(true);

  const testResult = useMemo(() => {
    if (!testText.trim()) return null;
    return filterAIOutput(testText);
  }, [testText]);

  const filteredOutputs = useMemo(() => {
    if (!filterEnabled) return aiOutputs as AIOutput[];
    return aiOutputs.map(output => ({
      ...output,
      quality: filterAIOutput(output.text),
    })) as AIOutput[];
  }, [aiOutputs, filterEnabled]);

  const stats = useMemo(() => {
    const total = filteredOutputs.length;
    const passed = filteredOutputs.filter(o => !o.quality || o.quality.passed).length;
    const failed = total - passed;
    const avgScore = total > 0 ? filteredOutputs.reduce((sum, o) => sum + (o.quality?.score || 100), 0) / total : 0;
    return { total, passed, failed, avgScore };
  }, [filteredOutputs]);

  return (
    <div className="min-h-screen bg-[#0A0E17] p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">AI-Qualitätsfilter</h1>
          <p className="text-[10px] text-[#94A3B8] mt-0.5">Prüft Analyse-Outputs vor der Anzeige</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterEnabled(!filterEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase transition-all ${
              filterEnabled ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30' : 'bg-[#6B7280]/20 text-[#6B7280] border border-[#6B7280]/30'
            }`}
          >
            {filterEnabled ? <Eye size={12} /> : <EyeOff size={12} />}
            {filterEnabled ? 'Aktiv' : 'Inaktiv'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Analysen', value: stats.total, icon: <Filter size={14} /> },
          { label: 'Bestanden', value: stats.passed, icon: <CheckCircle size={14} />, color: '#10B981' },
          { label: 'Abgelehnt', value: stats.failed, icon: <XCircle size={14} />, color: '#EF4444' },
          { label: 'Ø Score', value: `${Math.round(stats.avgScore)}%`, icon: <Shield size={14} /> },
        ].map((stat, i) => (
          <div key={i} className="bg-[#121824] border border-[#334155]/60 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1" style={{ color: stat.color || '#94A3B8' }}>
              {stat.icon}
              <span className="text-lg font-black text-white">{stat.value}</span>
            </div>
            <span className="text-[8px] text-[#64748B] uppercase font-bold">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Test Area */}
      <div className="bg-[#121824] border border-[#334155]/60 rounded-xl p-4 space-y-3">
        <h3 className="text-xs font-black text-white uppercase tracking-wider">Testbereich</h3>
        <textarea
          value={testText}
          onChange={e => setTestText(e.target.value)}
          placeholder="Analyse-Output hier einfügen zum Testen..."
          className="w-full h-32 bg-[#0F172A] border border-[#334155]/60 rounded-xl p-3 text-xs text-[#E2E8F0] placeholder-[#475569] resize-none focus:outline-none focus:border-[#F59E0B]/50"
        />
        {testResult && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getQualityColor(testResult.score) }}
                />
                <span className="text-xs font-bold text-white">
                  {getQualityLabel(testResult.score)} ({testResult.score}%)
                </span>
              </div>
              {testResult.flags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {testResult.flags.map((flag, i) => (
                    <span key={i} className="text-[8px] bg-[#F59E0B]/20 text-[#F59E0B] px-2 py-0.5 rounded-full border border-[#F59E0B]/30">
                      {flag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-[#0F172A] rounded-xl p-3 text-xs text-[#CBD5E1]">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setShowCleaned(!showCleaned)}
                  className="text-[9px] text-[#F59E0B] hover:text-[#FBBF24] transition-colors"
                >
                  {showCleaned ? 'Original' : 'Bereinigt'} anzeigen
                </button>
              </div>
              <p className="whitespace-pre-wrap">{showCleaned ? testResult.cleanedText : testText}</p>
            </div>
          </div>
        )}
      </div>

      {/* Filtered Outputs */}
      {filteredOutputs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-black text-white uppercase tracking-wider">Gefilterte Analyse-Ausgaben</h3>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {filteredOutputs.map(output => {
              const quality = output.quality || filterAIOutput(output.text);
              return (
                <div
                  key={output.id}
                  className="bg-[#121824] border rounded-xl p-3 text-xs"
                  style={{ borderColor: `${getQualityColor(quality.score)}33` }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getQualityColor(quality.score) }}
                      />
                      <span className="text-[9px] text-[#94A3B8]">{output.source}</span>
                      <span className="text-[9px] text-[#64748B]">
                        {new Date(output.timestamp).toLocaleString('de-DE')}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold" style={{ color: getQualityColor(quality.score) }}>
                      {quality.score}%
                    </span>
                  </div>
                  <p className="text-[#CBD5E1] line-clamp-2">{output.text.substring(0, 200)}...</p>
                  {quality.flags.length > 0 && (
                    <div className="flex gap-1 mt-1.5">
                      {quality.flags.map((flag, i) => (
                        <span key={i} className="text-[8px] bg-[#EF4444]/20 text-[#EF4444] px-1.5 py-0.5 rounded">
                          {flag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter Rules */}
      <div className="bg-[#121824] border border-[#334155]/60 rounded-xl p-4">
        <h3 className="text-xs font-black text-white uppercase tracking-wider mb-3">Filter-Regeln</h3>
        <div className="space-y-2">
          {[
            { name: 'Halluzinationen', desc: 'Erkennt fiktive Beobachtungen und erfundene Daten', status: 'active' },
            { name: 'Qualitätsprüfung', desc: 'Prüft Länge, Struktur und Lesbarkeit', status: 'active' },
            { name: 'Bias-Erkennung', desc: 'Findet verzerrte oder übergeneralisierte Aussagen', status: 'active' },
            { name: 'Inhaltsprüfung', desc: 'Filtert unangemessene Sprache', status: 'active' },
          ].map((rule, i) => (
            <div key={i} className="flex items-center justify-between bg-[#0F172A] rounded-lg p-2.5">
              <div>
                <p className="text-xs font-bold text-white">{rule.name}</p>
                <p className="text-[9px] text-[#64748B]">{rule.desc}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                <span className="text-[9px] text-[#10B981] font-bold">Aktiv</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
