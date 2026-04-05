import { useEffect, useMemo, useState } from 'react';

type StudyTrack = 'ปวช.' | 'ปวส.';

export function useStudyTrackYear() {
  const [studyTrack, setStudyTrack] = useState<StudyTrack>('ปวช.');
  const [year, setYear] = useState('1');

  const yearOptions = useMemo(() => (studyTrack === 'ปวช.' ? ['1', '2', '3'] : ['1', '2']), [studyTrack]);

  useEffect(() => {
    if (!yearOptions.includes(year)) {
      setYear('1');
    }
  }, [yearOptions, year]);

  const normalizeStudentYear = (value: string) => {
    const normalized = value.replace(/\s+/g, '').toLowerCase();
    const yearMatch = normalized.match(/([1-4])/);
    const parsedYear = yearMatch?.[1];

    if (!parsedYear) return value;
    if (normalized.includes('ปวช')) return `ปวช.${parsedYear}`;
    if (normalized.includes('ปวส')) return `ปวส.${parsedYear}`;
    return parsedYear;
  };

  const formatYearLabel = (value: string) => {
    const normalized = normalizeStudentYear(value);
    if (normalized.startsWith('ปวช.') || normalized.startsWith('ปวส.')) {
      return normalized;
    }
    return `ปี ${normalized}`;
  };

  const normalizeImportedYear = (row: Record<string, unknown>) => {
    const rawLevel = String(
      row['Track'] ||
      row['Program'] ||
      row['ระดับ'] ||
      row['ประเภท'] ||
      row['หลักสูตร'] ||
      ''
    ).trim();
    const rawYear = String(
      row['Grade Level'] ||
      row['Grade'] ||
      row['Year'] ||
      row['ชั้น'] ||
      row['ปี'] ||
      row['ระดับชั้น'] ||
      ''
    ).trim();

    const combined = `${rawLevel} ${rawYear}`.toLowerCase();
    let track: StudyTrack = studyTrack;
    if (combined.includes('ปวส')) {
      track = 'ปวส.';
    } else if (combined.includes('ปวช')) {
      track = 'ปวช.';
    }

    const yearMatch = combined.match(/([1-4])/);
    const parsedYear = yearMatch?.[1] || year;
    const allowedYears = track === 'ปวช.' ? ['1', '2', '3'] : ['1', '2'];
    const normalizedYear = allowedYears.includes(parsedYear) ? parsedYear : allowedYears[0];

    return `${track}${normalizedYear}`;
  };

  return {
    studyTrack,
    setStudyTrack,
    year,
    setYear,
    yearOptions,
    normalizeStudentYear,
    formatYearLabel,
    normalizeImportedYear,
  };
}
