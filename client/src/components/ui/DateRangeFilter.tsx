import { useState } from 'react';
import { DatePeriod } from '../../types';
import { Calendar } from 'lucide-react';

export interface DateRangeValue {
  period: DatePeriod;
  startDate?: string;
  endDate?: string;
}

export interface DateRangeFilterProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  className?: string;
}

const periods: { value: DatePeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'custom', label: 'Custom' },
];

export default function DateRangeFilter({ value, onChange, className = '' }: DateRangeFilterProps) {
  const [showCustomPicker, setShowCustomPicker] = useState(value.period === 'custom');

  const handlePeriodClick = (period: DatePeriod) => {
    if (period === 'custom') {
      setShowCustomPicker(true);
      onChange({ ...value, period });
    } else {
      setShowCustomPicker(false);
      onChange({ period }); // clear custom dates when picking a preset
    }
  };

  const handleDateChange = (field: 'startDate' | 'endDate', dateValue: string) => {
    onChange({
      ...value,
      period: 'custom',
      [field]: dateValue,
    });
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        {periods.map((p) => (
          <button
            key={p.value}
            onClick={() => handlePeriodClick(p.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${
              value.period === p.value
                ? 'bg-accent-primary text-white shadow-md shadow-accent-primary/20'
                : 'bg-surface-secondary text-text-secondary hover:bg-surface-card hover:text-text-primary border border-border-primary'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {showCustomPicker && (
        <div className="flex items-center gap-2 mt-1 p-3 bg-surface-secondary border border-border-primary rounded-lg animate-fade-in">
          <Calendar className="w-4 h-4 text-text-muted shrink-0" />
          <input
            type="date"
            value={value.startDate || ''}
            onChange={(e) => handleDateChange('startDate', e.target.value)}
            className="bg-surface-input border border-border-primary text-text-primary text-sm rounded-md px-2 py-1 focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary"
            aria-label="Start Date"
          />
          <span className="text-text-muted text-sm px-1">to</span>
          <input
            type="date"
            value={value.endDate || ''}
            onChange={(e) => handleDateChange('endDate', e.target.value)}
            className="bg-surface-input border border-border-primary text-text-primary text-sm rounded-md px-2 py-1 focus:outline-none focus:border-accent-primary focus:ring-1 focus:ring-accent-primary"
            aria-label="End Date"
            min={value.startDate}
          />
        </div>
      )}
    </div>
  );
}
