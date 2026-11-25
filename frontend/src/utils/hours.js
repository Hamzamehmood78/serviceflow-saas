export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Dikhane ki tarteeb: Monday se Sunday
export const DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const toMinutes = (t) => {
  if (!t) return 0;
  return Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
};

// Server ke jaisi checks: keys jaise "1.close" ya "1.breaks.0.end"
export const validateHours = (hours) => {
  const errors = {};

  for (const d of hours) {
    if (!d.isOpen) continue;

    if (!d.open) errors[`${d.day}.open`] = 'Choose opening time';
    if (!d.close) errors[`${d.day}.close`] = 'Choose closing time';
    if (!d.open || !d.close) continue;

    const open = toMinutes(d.open);
    const close = toMinutes(d.close);
    if (close <= open) {
      errors[`${d.day}.close`] = 'Closing time must be after opening time';
      continue;
    }

    let prevEnd = open;
    const sorted = d.breaks
      .map((b, j) => ({ ...b, j }))
      .sort((a, b) => toMinutes(a.start) - toMinutes(b.start));

    for (const b of sorted) {
      const key = `${d.day}.breaks.${b.j}.end`;
      if (!b.start || !b.end) {
        errors[key] = 'Choose break start and end';
        continue;
      }
      const s = toMinutes(b.start);
      const e = toMinutes(b.end);
      if (e <= s) errors[key] = 'Break must end after it starts';
      else if (s < prevEnd) errors[key] = 'Break overlaps another break or starts before opening';
      else if (e > close) errors[key] = 'Break must end before closing time';
      else prevEnd = e;
    }
  }

  return errors;
};

// Server ke "openingHours.1.close" ko "1.close" banata hai
export const mapHourErrors = (fieldErrors) =>
  Object.fromEntries(
    Object.entries(fieldErrors).map(([k, v]) => [k.replace(/^openingHours\./, ''), v])
  );

export const todayIn = (timeZone) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());