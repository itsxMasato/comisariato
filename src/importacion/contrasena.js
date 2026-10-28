// Contraseña aleatoria para las cuentas importadas. No se muestra ni se guarda:
// el usuario define la suya con el correo de "establecer contraseña".
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*?";

export const generarContrasena = (largo = 20) => {
  const bytes = crypto.getRandomValues(new Uint32Array(largo));
  return Array.from(bytes, (n) => ALFABETO[n % ALFABETO.length]).join("");
};
