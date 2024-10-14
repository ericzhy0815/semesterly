// Helper functions for scheduling courses

// Define interfaces for the course and section structure
import {
  Course,
  DenormalizedCourse,
  Offering,
  Section,
  Slot,
  Timetable,
} from "../constants/commonTypes";

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
 * Get all feasible schedules using a greedy approach.
 * @param {DenormalizedCourse[]} courses - Array of courses with sections.
 * @returns {Section[][]} - Array of feasible schedules.
 */
export function getFeasibleSchedules(courses: DenormalizedCourse[]): Section[][] {
  const schedules: Section[][] = []; // Array to hold all feasible schedules

  function backtrack(currentSchedule: Section[], courseIndex: number) {
    if (courseIndex === courses.length) {
      // If all courses have been processed, add the current schedule to schedules
      schedules.push(currentSchedule);
      return;
    }

    const currentCourse = courses[courseIndex];

    // Iterate over each section of the current course
    for (const section of currentCourse.sections) {
      // Check feasibility of adding the current section
      if (isFeasible(currentSchedule, section)) {
        // If feasible, add the section and move to the next course
        backtrack([...currentSchedule, section], courseIndex + 1);
      }
    }
  }

  // Start backtracking with an empty schedule and the first course
  backtrack([], 0);

  return schedules; // Return all feasible schedules
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
 * Find the top N schedules with the least gaps.
 * @param {Course[]} courses - Array of courses with sections.
 * @param {number} topN - Number of top schedules to return.
 * @returns {Array<{ schedule: Section[]; totalGaps: number }>} - Array of top N schedules sorted by gaps.
 */
export function findTopSchedules(
  courses: DenormalizedCourse[],
  topN = 1
): Array<{ schedule: Section[]; totalGaps: number }> {
  const combinations = getFeasibleSchedules(courses);
  if (combinations.length === 0) return []; // no feasible schedule
  const rankedSchedules = combinations
    .map((schedule) => ({ schedule, totalGaps: calculateTotalGaps(schedule) }))
    .sort((a, b) => a.totalGaps - b.totalGaps);

  return rankedSchedules.slice(0, topN);
}
