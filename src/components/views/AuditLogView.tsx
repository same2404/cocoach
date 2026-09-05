import React from 'react';
import { LogEntry } from '../../types';
import { Clock, Activity } from 'lucide-react';

interface AuditLogViewProps {
  logs: LogEntry[];
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ logs }) => {
  return (
    <div className="flex flex-col h-full bg-[#FFFFFF] border border-[#DADADA] rounded-xl shadow-xs overflow-hidden">
      <div className="p-3 border-b border-[#DADADA] bg-[#E8E8E8] flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#00C2FF] text-[#0A0A0A] flex items-center justify-center rounded-lg shadow-xs font-black">
            <Activity size={14} />
          </div>
          <div className="flex items-center gap-2">
            <h3 className="font-black uppercase text-xs tracking-widest text-[#F8FAFC]">Änderungsprotokoll</h3>
            <span className="text-[#DADADA] text-xs">|</span>
            <p className="text-[10px] font-bold uppercase text-[#4A4A4A] tracking-wider">Automatische Dokumentation aller Systemänderungen</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-[#4A4A4A]">
            <Clock className="mx-auto mb-3 opacity-50 text-[#4A4A4A]" size={32} />
            <p className="font-medium text-xs">Noch keine Änderungen protokolliert.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-[10px] font-bold text-[#F8FAFC]">
            <thead className="sticky top-0 bg-[#E8E8E8] text-[#F8FAFC] z-10 border-b border-[#DADADA]">
              <tr>
                <th className="p-2.5 border border-[#DADADA] text-left w-32 uppercase tracking-wider">Datum</th>
                <th className="p-2.5 border border-[#DADADA] text-left w-32 uppercase tracking-wider">Uhrzeit</th>
                <th className="p-2.5 border border-[#DADADA] text-left w-48 uppercase tracking-wider">Bereich</th>
                <th className="p-2.5 border border-[#DADADA] text-left uppercase tracking-wider">Aktion</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-[#121824] transition-colors border-b border-[#DADADA]">
                  <td className="p-2.5 border-r border-[#DADADA]">{log.dateStr}</td>
                  <td className="p-2.5 border-r border-[#DADADA]">{log.timeStr} Uhr</td>
                  <td className="p-2.5 border-r border-[#DADADA] uppercase text-[#00C2FF] font-black">{log.tabName}</td>
                  <td className="p-2.5">{log.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
