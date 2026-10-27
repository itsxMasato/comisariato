// Helpers compartidos por los dashboards Gerencial y Técnico

export const toDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "object" && typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }
  // Formato local guardado como texto: "25/03/2026" (dd/mm/yyyy, hora opcional)
  const local = String(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ ,]+(\d{1,2}):(\d{2}))?/);
  if (local) {
    const [, dd, mm, yyyy, hh = 0, min = 0] = local;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min));
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const todayISO = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

// "2026-10-25" -> Date local (evita el desfase UTC de new Date("yyyy-mm-dd"))
export const parseISODate = (iso) => {
  const [y, m, d] = String(iso || todayISO()).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

export const monthRange = (iso) => {
  const d = parseISODate(iso);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
};

export const lastDaysRange = (iso, days) => {
  const d = parseISODate(iso);
  const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - (days - 1));
  return { start, end };
};

export const inRange = (date, { start, end }) =>
  !!date && date >= start && date <= end;

export const formatMonthLabel = (iso) => {
  const label = new Intl.DateTimeFormat("es-HN", { month: "long", year: "numeric" }).format(
    parseISODate(iso),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export const formatDate = (date) =>
  date
    ? date.toLocaleDateString("es-HN", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "—";

export const formatDateTime = (date) =>
  date
    ? date.toLocaleString("es-HN", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export const formatLempiras = (value, decimals = 2) =>
  `L. ${Number(value || 0).toLocaleString("es-HN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;

export const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export const isActivo = (estado) => ["activo", "active"].includes(normalizeText(estado));

export const fullName = (person) => {
  if (!person) return "";
  const completo = [person.nombres, person.apellidos].filter(Boolean).join(" ").trim();
  return completo || person.nombre || person.displayName || "";
};

// Busca un empleado o usuario por cualquiera de los ids que usa el sistema
export const buildPersonFinder = (empleados, usuarios) => {
  const index = new Map();
  const add = (person, isEmpleado) => {
    [person.id, person.uid, person.empleadoId, person.dni].forEach((key) => {
      if (!key) return;
      const k = String(key).trim();
      // Un empleado tiene prioridad sobre un usuario con el mismo id
      if (!index.has(k) || isEmpleado) index.set(k, person);
    });
  };
  usuarios.forEach((u) => add(u, false));
  empleados.forEach((e) => add(e, true));
  return (id) => (id ? index.get(String(id).trim()) || null : null);
};
