// Helper functions for scheduling courses

// Define interfaces for the course and section structure
import { DenormalizedCourse, Section } from "../constants/commonTypes";

/**
 * Convert time from "HH:MM" format into minutes.
 * @param {string} time - Time in "HH:MM" format.
 * @returns {number} - Time in minutes.
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if a schedule is feasible (i.e., no time overlaps).
 * @param {Section[]} schedule - The sections in the schedule to check.
 * @returns {boolean} - True if feasible, false otherwise.
 */
function isFeasible(schedule: Section[], newSection: Section): boolean {
  for (const section of schedule) {
    for (const newTime of newSection.offering_set) {
      for (const existingTime of section.offering_set) {
        if (
          newTime.day === existingTime.day &&
          newTime.time_start < existingTime.time_end &&
          newTime.time_end > existingTime.time_start
        ) {
          return false; // Overlap detected
        }
      }
    }
  }
  return true; // No overlaps
}

/**
 * Calculate the total gaps between time slots in a schedule.
 * @param {Section[]} schedule - Array of selected sections for the schedule.
 * @returns {number} - Total gaps in minutes.
 */
export function calculateTotalGaps(schedule: Section[]): number {
  const daySlots: Record<string, { start: number; end: number }[]> = {};

  schedule.forEach((section) => {
    section.offering_set.forEach((time) => {
      const { day, time_start, time_end } = time;
      if (!daySlots[day]) daySlots[day] = [];
      daySlots[day].push({
        start: timeToMinutes(time_start),
        end: timeToMinutes(time_end),
      });
    });
  });

  let totalGaps = 0;

  Object.keys(daySlots).forEach((day) => {
    const slots = daySlots[day].sort((a, b) => a.start - b.start);
    for (let i = 1; i < slots.length; i++) {
      const gap = slots[i].start - slots[i - 1].end;
      if (gap > 0) totalGaps += gap;
    }
  });

  return totalGaps;
}

/**
 * Get all feasible schedules, ensuring locked sections are included.
 * @param {DenormalizedCourse[]} courses - Array of courses with sections.
 * @param {Section[]} lockedSections - Array of locked sections.
 * @returns {Section[][]} - Array of feasible schedules.
 */
export function getFeasibleSchedules(
  courses: DenormalizedCourse[],
  lockedSections: Section[]
): Section[][] {
  const schedules: Section[][] = [];
  // backtracking to not explore branches of tree that is alreadt infeasible
  function backtrack(currentSchedule: Section[], courseIndex: number) {
    if (courseIndex === courses.length) {
      schedules.push(currentSchedule);
      return;
    }
    const currentCourse = courses[courseIndex];
    for (const section of currentCourse.sections) {
      if (isFeasible([...currentSchedule, ...lockedSections], section))
        backtrack([...currentSchedule, section], courseIndex + 1);
    }
  }
  backtrack(lockedSections, 0);
  return schedules;
}

export function findTopSchedules(
  courses: DenormalizedCourse[],
  lockedSections: Section[],
  topN = 1 // number of schedules we want to return
): Array<{ schedule: Section[]; totalGaps: number }> {
  const combinations = getFeasibleSchedules(courses, lockedSections);
  if (combinations.length === 0 || topN < 1) return [];
  // Rank schedules by total gaps
  const rankedSchedules = combinations
    .map((schedule) => ({ schedule, totalGaps: calculateTotalGaps(schedule) }))
    .sort((a, b) => a.totalGaps - b.totalGaps);

  return rankedSchedules.slice(0, topN);
}
