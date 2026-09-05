import React from 'react';
import { CloudSnow } from 'lucide-react';
import { SummerPrepUnit } from '../../types';
import { PreparationView } from './PreparationView';

interface WinterPreparationViewProps {
  data: SummerPrepUnit[];
  onAddOrUpdate: (item: SummerPrepUnit) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isEditing?: boolean;
  setToast?: (toast: { message: string; id: number }) => void;
  opponents?: { id: string, name: string }[];
}

export const WinterPreparationView: React.FC<WinterPreparationViewProps> = ({
  data,
  onAddOrUpdate,
  onDelete,
  isEditing = false,
  setToast,
  opponents = []
}) => {
  const startDate = "2027-01-05";
  const endDate = "2027-03-16";

  return (
    <PreparationView
      title="Winter-Vorbereitung"
      subtitle={`Vorbereitungsplan 05.01.2027 - 16.03.2027`}
      icon={<CloudSnow size={14} className="text-blue-400" />}
      startDate={startDate}
      endDate={endDate}
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
  );
};
