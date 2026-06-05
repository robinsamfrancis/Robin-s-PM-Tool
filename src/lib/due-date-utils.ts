export function parseLocalDate(dateStr: string): Date {
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-based
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(dateStr); // fallback
}

export function getDaysDifference(
  targetDate: Date,
  baseDate: Date = new Date(),
): number {
  const target = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate(),
  );
  const base = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
  );
  const diffTime = target.getTime() - base.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export interface DueDateStatus {
  hasDueDate: boolean;
  labelText: string;
  longLabelText: string;
  formattedDate: string;
  isOverdue: boolean;
  isToday: boolean;
  isTomorrow: boolean;
  daysDiff: number;
}

export function getDueDateStatus(
  dueDateStr: string | undefined,
  isCompleted: boolean = false,
  baseDate: Date = new Date(),
): DueDateStatus {
  if (!dueDateStr) {
    return {
      hasDueDate: false,
      labelText: "No due date",
      longLabelText: "No due date",
      formattedDate: "",
      isOverdue: false,
      isToday: false,
      isTomorrow: false,
      daysDiff: 0,
    };
  }

  const dueDateObj = parseLocalDate(dueDateStr);
  const daysDiff = getDaysDifference(dueDateObj, baseDate);

  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const formattedDate = formatter.format(dueDateObj);

  let labelText = `Due: ${formattedDate}`;
  let longLabelText = `Due Date: ${formattedDate}`;
  let isOverdue = false;
  let isToday = false;
  let isTomorrow = false;

  if (daysDiff < 0) {
    if (!isCompleted) {
      isOverdue = true;
      const absDays = Math.abs(daysDiff);
      let overdueText = "";
      if (absDays === 1) {
        overdueText = "1 day";
      } else if (absDays % 7 === 0) {
        const weeks = absDays / 7;
        overdueText = `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
      } else {
        overdueText = `${absDays} days`;
      }
      labelText = `Overdue by ${overdueText}`;
      longLabelText = `Due Date: ${formattedDate}\nStatus: Overdue by ${overdueText}`;
    } else {
      labelText = `Completed (Due: ${formattedDate})`;
      longLabelText = `Due Date: ${formattedDate}\nStatus: Completed`;
    }
  } else if (daysDiff === 0) {
    isToday = true;
    labelText = "Due Today";
    longLabelText = `Due Date: ${formattedDate}\nStatus: Due Today`;
  } else if (daysDiff === 1) {
    isTomorrow = true;
    labelText = "Due Tomorrow";
    longLabelText = `Due Date: ${formattedDate}\nStatus: Due Tomorrow`;
  } else {
    if (daysDiff <= 7) {
      labelText = `Due in ${daysDiff} days`;
    } else {
      labelText = `Due: ${formattedDate}`;
    }
    longLabelText = `Due Date: ${formattedDate}\nRemaining: ${daysDiff} days`;
  }

  return {
    hasDueDate: true,
    labelText,
    longLabelText,
    formattedDate,
    isOverdue,
    isToday,
    isTomorrow,
    daysDiff,
  };
}
