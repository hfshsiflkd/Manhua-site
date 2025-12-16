// Safe date formatter for audit logs
export function safeFormatDate(dateValue: string | Date | undefined | null): {
  relative: string;
  exact: string;
  isValid: boolean;
} {
  if (!dateValue) {
    return {
      relative: "-",
      exact: "-",
      isValid: false,
    };
  }

  let date: Date;
  if (dateValue instanceof Date) {
    date = dateValue;
  } else {
    date = new Date(dateValue);
  }

  if (isNaN(date.getTime())) {
    return {
      relative: "-",
      exact: "-",
      isValid: false,
    };
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  let relative: string;
  if (diffMins < 1) {
    relative = "Саяхан";
  } else if (diffMins < 60) {
    relative = `${diffMins} мин`;
  } else if (diffHours < 24) {
    relative = `${diffHours} цаг`;
  } else if (diffDays < 7) {
    relative = `${diffDays} өдөр`;
  } else {
    relative = date.toLocaleDateString("mn-MN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  const exact = date.toLocaleString("mn-MN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return {
    relative,
    exact,
    isValid: true,
  };
}

