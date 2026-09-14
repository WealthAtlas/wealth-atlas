import { UIUtils } from '@/app/utils/UIUtils';
import {
  computeScheduleEndDate,
  countScheduleOccurrences,
} from '@/domain/entities/shared/AbstractSchedule';
import { Frequency } from '@/domain/entities/shared/Frequency';
import { parseUtcDay } from '@/domain/utils/DateUtils';
import { ToggleButton, ToggleButtonGroup, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';

export interface ScheduleDurationFieldsProps {
  startDate: Date;
  endDate: Date | undefined;
  frequency: Frequency;
  /** Plural noun describing one occurrence, e.g. "EMI payments" or "investments". */
  occurrenceNoun: string;
  onEndDateChange: (endDate: Date | undefined) => void;
}

type DurationMode = 'endDate' | 'occurrenceCount';

/**
 * Lets a schedule's end be specified either as an end date (with the
 * occurrence count it implies shown alongside) or as a number of occurrences
 * (with the end date it implies computed and set). Both modes only ever
 * produce an `endDate` -- EMI and SIP have no occurrence-count field of their
 * own, so nothing here is persisted beyond the date the entity already has.
 */
export function ScheduleDurationFields({
  startDate,
  endDate,
  frequency,
  occurrenceNoun,
  onEndDateChange,
}: ScheduleDurationFieldsProps) {
  const isValidFrequency = (Object.values(Frequency) as string[]).includes(frequency);
  const [mode, setMode] = useState<DurationMode>('endDate');
  const [occurrenceCount, setOccurrenceCount] = useState<string>(() =>
    endDate && isValidFrequency
      ? String(countScheduleOccurrences(startDate, endDate, frequency))
      : '1'
  );

  const handleModeChange = (_: unknown, newMode: DurationMode | null) => {
    if (!newMode || newMode === mode) return;
    if (newMode === 'occurrenceCount' && isValidFrequency) {
      const seeded = endDate ? countScheduleOccurrences(startDate, endDate, frequency) : 1;
      setOccurrenceCount(String(Math.max(seeded, 1)));
      onEndDateChange(computeScheduleEndDate(startDate, frequency, Math.max(seeded, 1)));
    }
    setMode(newMode);
  };

  const handleOccurrenceCountChange = (value: string) => {
    setOccurrenceCount(value);
    if (!isValidFrequency) return;
    const parsed = parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed >= 1) {
      onEndDateChange(computeScheduleEndDate(startDate, frequency, parsed));
    }
  };

  const impliedOccurrences =
    isValidFrequency && endDate && endDate >= startDate
      ? countScheduleOccurrences(startDate, endDate, frequency)
      : undefined;

  return (
    <Stack spacing={1}>
      <ToggleButtonGroup value={mode} exclusive onChange={handleModeChange} size="small" fullWidth>
        <ToggleButton value="endDate">End Date</ToggleButton>
        <ToggleButton value="occurrenceCount">Number of Occurrences</ToggleButton>
      </ToggleButtonGroup>

      {mode === 'endDate' ? (
        <>
          <TextField
            label="End Date"
            value={UIUtils.formatDateForInput(endDate)}
            onChange={e =>
              onEndDateChange(e.target.value ? parseUtcDay(e.target.value) : undefined)
            }
            type="date"
            InputLabelProps={{ shrink: true }}
            fullWidth
            helperText={`Optional: when ${occurrenceNoun} end`}
          />
          <Typography variant="caption" color="text.secondary">
            {!isValidFrequency
              ? 'Select a frequency to see how many this schedule includes'
              : impliedOccurrences !== undefined
                ? `≈ ${impliedOccurrences} ${occurrenceNoun}`
                : `Ongoing — no end date`}
          </Typography>
        </>
      ) : (
        <>
          <TextField
            label="Number of Occurrences"
            value={occurrenceCount}
            onChange={e => handleOccurrenceCountChange(e.target.value.replace(/[^\d]/g, ''))}
            type="number"
            inputProps={{ min: 1, step: 1 }}
            fullWidth
            helperText={`How many ${occurrenceNoun} this schedule includes`}
          />
          {endDate && (
            <Typography variant="caption" color="text.secondary">
              Ends on {UIUtils.formatDateShort(endDate)}
            </Typography>
          )}
        </>
      )}
    </Stack>
  );
}
