import { Plus, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import { DAY_NAMES, DISPLAY_ORDER } from '../../utils/hours';
import { cn } from '../../utils/cn';

const timeClass = (hasError) =>
  cn(
    'h-10 rounded-lg bg-white px-2 text-sm text-slate-900 outline-none ring-1 focus:ring-2',
    hasError ? 'ring-red-400 focus:ring-red-500' : 'ring-slate-300 focus:ring-brand-600'
  );

// value: 7 dinon ki list (day 0 se 6), onChange: nayi list
export default function OpeningHoursEditor({ value, onChange, errors = {} }) {
  const updateDay = (day, patch) =>
    onChange(value.map((d) => (d.day === day ? { ...d, ...patch } : d)));

  const updateBreak = (day, j, patch) => {
    const d = value.find((x) => x.day === day);
    updateDay(day, { breaks: d.breaks.map((b, i) => (i === j ? { ...b, ...patch } : b)) });
  };

  const addBreak = (day) => {
    const d = value.find((x) => x.day === day);
    if (d.breaks.length >= 3) return;
    updateDay(day, { breaks: [...d.breaks, { start: '13:00', end: '14:00' }] });
  };

  const removeBreak = (day, j) => {
    const d = value.find((x) => x.day === day);
    updateDay(day, { breaks: d.breaks.filter((_, i) => i !== j) });
  };

  return (
    <div className="divide-y divide-slate-100">
      {DISPLAY_ORDER.map((day) => {
        const d = value.find((x) => x.day === day);
        return (
          <div key={day} className="py-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex w-36 items-center gap-2 text-sm font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={d.isOpen}
                  onChange={(e) => updateDay(day, { isOpen: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 accent-brand-600"
                />
                {DAY_NAMES[day]}
              </label>

              {d.isOpen ? (
                <>
                  <input
                    type="time"
                    aria-label={`${DAY_NAMES[day]} opening time`}
                    value={d.open}
                    onChange={(e) => updateDay(day, { open: e.target.value })}
                    className={timeClass(errors[`${day}.open`])}
                  />
                  <span className="text-sm text-slate-400">to</span>
                  <input
                    type="time"
                    aria-label={`${DAY_NAMES[day]} closing time`}
                    value={d.close}
                    onChange={(e) => updateDay(day, { close: e.target.value })}
                    className={timeClass(errors[`${day}.close`])}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addBreak(day)}
                    disabled={d.breaks.length >= 3}
                  >
                    <Plus size={14} /> Break
                  </Button>
                </>
              ) : (
                <span className="text-sm text-slate-400">Closed</span>
              )}
            </div>

            {(errors[`${day}.open`] || errors[`${day}.close`]) && (
              <p className="mt-1 text-xs text-red-600 sm:pl-36">
                {errors[`${day}.open`] || errors[`${day}.close`]}
              </p>
            )}

            {d.isOpen &&
              d.breaks.map((b, j) => (
                <div key={j} className="mt-2 sm:pl-36">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="w-12 text-xs text-slate-500">Break</span>
                    <input
                      type="time"
                      aria-label={`${DAY_NAMES[day]} break ${j + 1} start`}
                      value={b.start}
                      onChange={(e) => updateBreak(day, j, { start: e.target.value })}
                      className={timeClass(errors[`${day}.breaks.${j}.end`])}
                    />
                    <span className="text-sm text-slate-400">to</span>
                    <input
                      type="time"
                      aria-label={`${DAY_NAMES[day]} break ${j + 1} end`}
                      value={b.end}
                      onChange={(e) => updateBreak(day, j, { end: e.target.value })}
                      className={timeClass(errors[`${day}.breaks.${j}.end`])}
                    />
                    <button
                      type="button"
                      onClick={() => removeBreak(day, j)}
                      aria-label="Remove break"
                      className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  {errors[`${day}.breaks.${j}.end`] && (
                    <p className="mt-1 text-xs text-red-600">{errors[`${day}.breaks.${j}.end`]}</p>
                  )}
                </div>
              ))}
          </div>
        );
      })}
    </div>
  );
}