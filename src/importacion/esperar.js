// Espera usada entre reintentos (se reemplaza en las pruebas)
export const esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms));
