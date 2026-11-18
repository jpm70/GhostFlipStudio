import React from 'react';

/** Interruptor accesible reutilizado por los paneles de ajustes. */
export const renderToggle = (
  id: string,
  label: string,
  checked: boolean,
  onToggle: (next: boolean) => void,
  iconClass: string,
  description?: string,
) => (
  <div className="flex items-center justify-between gap-3 py-1.5">
    <label htmlFor={id} className="flex items-start gap-2.5 cursor-pointer select-none min-w-0">
      <i className={`${iconClass} text-cyan-400/90 mt-0.5 w-4 text-center text-xs shrink-0`} aria-hidden="true" />
      <div className="min-w-0">
        <span className="block text-sm font-medium text-slate-200 leading-tight">{label}</span>
        {description && (
          <span className="block text-xs text-slate-400 mt-0.5 leading-snug">{description}</span>
        )}
      </div>
    </label>
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onToggle(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 ${
        checked
          ? 'bg-emerald-500/90 border-emerald-400'
          : 'bg-slate-800 border-slate-700 hover:border-slate-600'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);
