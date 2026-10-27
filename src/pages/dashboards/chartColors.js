// Colores de las gráficas de los dashboards

// Paleta validada (scripts/validate_palette.js, light, all-pairs: PASS).
// El ámbar queda < 3:1 sobre blanco: siempre se acompaña de etiqueta visible.
export const CHART_COLORS = {
  primary: "#15803d", // serie única / creación
  blue: "#2a78d6", // modificación
  amber: "#eda100", // acceso / pendiente
  muted: "#e2e8f0", // contexto (énfasis: lo demás en gris)
  neutral: "#94a3b8", // rechazadas / deshabilitadas
  track: "#f1f5f9",
};

// Estados (good / warning / critical): relleno + pista del mismo tono
export const STATUS_TONES = {
  good: { fill: "#15803d", track: "#dcfce7", text: "text-green-800", icon: "check_circle" },
  warning: { fill: "#d97706", track: "#fef3c7", text: "text-amber-700", icon: "warning" },
  critical: { fill: "#dc2626", track: "#fee2e2", text: "text-red-700", icon: "error" },
};
