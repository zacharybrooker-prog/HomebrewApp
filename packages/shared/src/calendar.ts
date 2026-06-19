import type { CalendarConfig, MoonConfig } from './schema';

export const STANDARD_MOON_PHASES = [
  'New Moon',
  'Waxing Crescent',
  'First Quarter',
  'Waxing Gibbous',
  'Full Moon',
  'Waning Gibbous',
  'Last Quarter',
  'Waning Crescent'
] as const;

export interface CalculatedMoon {
  config: MoonConfig;
  phaseIndex: number;
  phaseName: string;
  progressPercent: number;
}

export interface CalculatedDate {
  year: number;
  monthIndex: number;
  dayOfMonth: number; // 1-indexed
  dayOfWeekIndex: number;
  totalDaysPassed: number;
}

export function calculateDate(blocks: number, config: CalendarConfig): CalculatedDate {
  const totalDaysPassed = Math.floor(blocks / 4);
  const daysInYear = config.months.reduce((sum, m) => sum + m.days, 0);
  
  const yearOffset = Math.floor(totalDaysPassed / daysInYear);
  const year = config.startYear + yearOffset;
  
  let daysRemaining = totalDaysPassed % daysInYear;
  let monthIndex = 0;
  
  for (let i = 0; i < config.months.length; i++) {
    if (daysRemaining < config.months[i].days) {
      monthIndex = i;
      break;
    }
    daysRemaining -= config.months[i].days;
  }
  
  const dayOfMonth = daysRemaining + 1;
  const dayOfWeekIndex = totalDaysPassed % config.weekdays.length;
  
  return { year, monthIndex, dayOfMonth, dayOfWeekIndex, totalDaysPassed };
}

export function formatCalendarDate(blocks: number, config?: CalendarConfig): string {
  if (!config) {
    const defaultWeekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const totalDaysPassed = Math.floor(blocks / 4);
    const dayOfWeekIndex = totalDaysPassed % 7;
    return `${defaultWeekdays[dayOfWeekIndex]}, Day ${totalDaysPassed + 1}`;
  }

  const date = calculateDate(blocks, config);
  const monthName = config.months[date.monthIndex]?.name || 'Unknown';
  const weekdayName = config.weekdays[date.dayOfWeekIndex] || 'Unknown';
  
  const d = date.dayOfMonth;
  let suffix = 'th';
  if (d % 10 === 1 && d !== 11) suffix = 'st';
  else if (d % 10 === 2 && d !== 12) suffix = 'nd';
  else if (d % 10 === 3 && d !== 13) suffix = 'rd';
  
  return `${weekdayName}, ${d}${suffix} of ${monthName}, Year ${date.year}`;
}

export function calculateMoonPhases(totalDaysPassed: number, moons?: MoonConfig[]): CalculatedMoon[] {
  if (!moons) return [];
  
  return moons.map(moon => {
    const cycleLength = Math.max(1, moon.cycleLengthDays);
    const effectiveDay = (totalDaysPassed + moon.phaseOffsetDays) % cycleLength;
    const normalizedDay = effectiveDay < 0 ? effectiveDay + cycleLength : effectiveDay;
    const progressPercent = normalizedDay / cycleLength;
    
    let phaseIndex = Math.floor(progressPercent * 8);
    if (phaseIndex >= 8) phaseIndex = 7;
    if (phaseIndex < 0) phaseIndex = 0;
    
    const phaseName = moon.customPhases?.[phaseIndex] || STANDARD_MOON_PHASES[phaseIndex];
    
    return {
      config: moon,
      phaseIndex,
      phaseName,
      progressPercent
    };
  });
}
