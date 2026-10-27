// Componentes de gráficas livianos (HTML + Tailwind) para los dashboards.
// Specs: marcas finas, extremo de dato redondeado 4px, 2px de separación entre
// segmentos, tooltip por marca (hover y foco) y texto siempre en tonos de texto.
// Nota: tailwind.config redefine rounded-full, por eso se usan radios explícitos.

import { CHART_COLORS, STATUS_TONES } from "./chartColors";

export const Tooltip = ({ children, align = "center" }) => (
  <span
    role="tooltip"
    className={`pointer-events-none absolute bottom-full z-30 mb-1.5 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/mark:opacity-100 group-focus-visible/mark:opacity-100 ${
      align === "start" ? "left-0" : align === "end" ? "right-0" : "left-1/2 -translate-x-1/2"
    }`}
  >
    {children}
  </span>
);

// Valor fuerte primero, etiqueta después (jerarquía de tooltip)
export const TipContent = ({ value, label }) => (
  <>
    <strong className="font-bold">{value}</strong>
    <span className="text-slate-300"> · {label}</span>
  </>
);

export const Legend = ({ items, className = "" }) => (
  <div className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-slate-500 ${className}`}>
    {items.map((item) => (
      <span key={item.label} className="inline-flex items-center gap-1 whitespace-nowrap">
        <span className="h-2 w-2 shrink-0 rounded-[2px]" style={{ backgroundColor: item.color }} />
        {item.value !== undefined && <strong className="font-bold text-slate-700">{item.value}</strong>}
        {item.label}
      </span>
    ))}
  </div>
);

// Barra apilada horizontal (parte de un todo). segments: [{ label, value, color, tip }]
export const StackedBar = ({ segments, height = 8, total, emptyLabel = "Sin datos" }) => {
  const visibles = segments.filter((s) => s.value > 0);
  const suma = total ?? visibles.reduce((s, x) => s + x.value, 0);
  if (suma <= 0 || visibles.length === 0) {
    return (
      <div
        className="w-full rounded-[4px]"
        style={{ height, backgroundColor: CHART_COLORS.track }}
        aria-label={emptyLabel}
        title={emptyLabel}
      />
    );
  }
  return (
    <div className="flex w-full gap-[2px]" style={{ height }}>
      {visibles.map((s, i) => (
        <span
          key={s.label}
          tabIndex={0}
          aria-label={`${s.label}: ${s.value}`}
          className="group/mark relative block h-full outline-none transition-opacity hover:opacity-80 focus-visible:opacity-80"
          style={{
            width: `${(s.value / suma) * 100}%`,
            minWidth: 3,
            backgroundColor: s.color,
            borderTopLeftRadius: i === 0 ? 4 : 0,
            borderBottomLeftRadius: i === 0 ? 4 : 0,
            borderTopRightRadius: i === visibles.length - 1 ? 4 : 0,
            borderBottomRightRadius: i === visibles.length - 1 ? 4 : 0,
          }}
        >
          <Tooltip align={i === 0 ? "start" : i === visibles.length - 1 ? "end" : "center"}>
            {s.tip || <TipContent value={s.value} label={s.label} />}
          </Tooltip>
        </span>
      ))}
    </div>
  );
};

// Columnas compactas (tendencia). data: [{ key, value, tip }]; highlightKey => énfasis
export const MiniColumns = ({ data, height = 40, color = CHART_COLORS.primary, highlightKey, gap = 2 }) => {
  const max = Math.max(...data.map((d) => d.value), 0);
  return (
    <div className="flex w-full items-end" style={{ height, gap }}>
      {data.map((d, i) => {
        const pct = max > 0 ? (d.value / max) * 100 : 0;
        const enfasis = highlightKey === undefined || d.key === highlightKey;
        return (
          <span
            key={d.key}
            tabIndex={0}
            aria-label={typeof d.tip === "string" ? d.tip : String(d.value)}
            className="group/mark relative flex h-full flex-1 items-end justify-center outline-none"
          >
            <span
              className="block w-full max-w-[24px] transition-opacity group-hover/mark:opacity-75 group-focus-visible/mark:opacity-75"
              style={{
                height: d.value > 0 ? `max(${pct}%, 3px)` : 2,
                backgroundColor: d.value > 0 ? (enfasis ? color : CHART_COLORS.muted) : CHART_COLORS.track,
                borderTopLeftRadius: d.value > 0 ? 4 : 1,
                borderTopRightRadius: d.value > 0 ? 4 : 1,
              }}
            />
            <Tooltip align={i < 2 ? "start" : i > data.length - 3 ? "end" : "center"}>{d.tip}</Tooltip>
          </span>
        );
      })}
    </div>
  );
};

// Medidor: relleno de severidad sobre una pista del mismo tono
export const Meter = ({ value, max, tone = STATUS_TONES.good, height = 6, label }) => {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div
      className="w-full overflow-hidden rounded-[4px]"
      style={{ height, backgroundColor: tone.track }}
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      title={label}
    >
      <div className="h-full rounded-[4px] transition-[width] duration-500" style={{ width: `${pct}%`, backgroundColor: tone.fill }} />
    </div>
  );
};

// Lista de barras horizontales (una serie, un color), ordenada por valor.
// items: [{ key, label, value, valueLabel, secondary, tip }]
export const BarList = ({ items, color = CHART_COLORS.primary, emptyLabel = "Sin datos" }) => {
  const max = Math.max(...items.map((i) => i.value), 0);
  if (items.length === 0) {
    return <p className="py-6 text-center text-[11px] font-medium text-slate-400">{emptyLabel}</p>;
  }
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li
          key={item.key}
          tabIndex={0}
          aria-label={`${item.label}: ${item.valueLabel ?? item.value}`}
          className="group/mark relative grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_auto] items-center gap-3 outline-none"
        >
          <span className="truncate text-[11px] font-semibold text-slate-700" title={item.label}>
            {item.label}
          </span>
          <span className="block h-2.5 w-full">
            <span
              className="block h-full transition-opacity group-hover/mark:opacity-75 group-focus-visible/mark:opacity-75"
              style={{
                width: max > 0 ? `max(${(item.value / max) * 100}%, 3px)` : 0,
                backgroundColor: color,
                borderTopRightRadius: 4,
                borderBottomRightRadius: 4,
              }}
            />
          </span>
          <span className="whitespace-nowrap text-right text-[11px] tabular-nums">
            <strong className="font-black text-slate-900">{item.valueLabel ?? item.value}</strong>
            {item.secondary && <span className="ml-1 font-medium text-slate-400">{item.secondary}</span>}
          </span>
          {item.tip && <Tooltip>{item.tip}</Tooltip>}
        </li>
      ))}
    </ul>
  );
};
