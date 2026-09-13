import { useCallback, useMemo, useState } from 'react';

export function useMonthYear(initialMonth?: number, initialYear?: number) {
  const now = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(initialMonth ?? now.getMonth() + 1);
  const [year, setYear] = useState(initialYear ?? now.getFullYear());

  const goToPreviousMonth = useCallback(() => {
    setMonth((prevMonth) => {
      if (prevMonth === 1) {
        setYear((prevYear) => prevYear - 1);
        return 12;
      }
      return prevMonth - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setMonth((prevMonth) => {
      if (prevMonth === 12) {
        setYear((prevYear) => prevYear + 1);
        return 1;
      }
      return prevMonth + 1;
    });
  }, []);

  return { month, year, setMonth, setYear, goToPreviousMonth, goToNextMonth };
}
