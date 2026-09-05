import React from 'react';
import { Sun } from 'lucide-react';
import { SummerPrepUnit } from '../../types';
import { PreparationView } from './PreparationView';
import { TenDayPlanSection } from '../TenDayPlanSection';

interface SummerPreparationViewProps {
  data: SummerPrepUnit[];
  onAddOrUpdate: (item: SummerPrepUnit) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isEditing?: boolean;
  setToast?: (toast: { message: string; id: number }) => void;
  opponents?: { id: string, name: string }[];
}

export const SummerPreparationView: React.FC<SummerPreparationViewProps> = ({
  data,
  onAddOrUpdate,
  onDelete,
  isEditing = false,
  setToast,
  opponents = []
}) => {
  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto custom-scrollbar p-2">
      {/* 10-Tage-Aktiv Plan Module (17.06.26 - 03.07.26) */}
      <TenDayPlanSection isEditing={isEditing} />

      <div className="flex-1 min-h-[600px]">
        <PreparationView
          title="Sommer-Vorbereitung"
          subtitle="Vorbereitungsplan 06.07.2026 - 16.08.2026"
          icon={<Sun size={14} className="text-yellow-400" />}
          startDate="2026-07-06"
          endDate="2026-08-16"
          data={data}
          onAddOrUpdate={onAddOrUpdate}
          onDelete={onDelete}
          isEditing={isEditing}
          setToast={setToast}
          opponents={opponents}
          config={{
            showAthletik: false,
            showVormittag: false,
            showIndividual: false,
            showVideo: false,
            showTraining: false,
            showOpponent: true,
            showStartEnd: true
          }}
        />
      </div>
    </div>
  );
};
