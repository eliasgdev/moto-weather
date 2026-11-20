// Guarda en el dispositivo los lugares recientes y el último pronóstico (para verlo sin conexión).
const CLAVE_RECIENTES = 'mw:recientes';
const CLAVE_ULTIMO = 'mw:ultimo';
const MAX_RECIENTES = 5;

function leer(clave, porDefecto) {
  try {
    const v = JSON.parse(localStorage.getItem(clave));
    return v ?? porDefecto;
  } catch {
    return porDefecto;
  }
}

function escribir(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin espacio o modo privado */ }
}

const valido = l => l && typeof l.nombre === 'string' && Number.isFinite(l.lat) && Number.isFinite(l.lon);

export function recientes() {
  return leer(CLAVE_RECIENTES, []).filter(valido).slice(0, MAX_RECIENTES);
}

export function agregarReciente(lugar) {
  const clave = l => `${l.lat.toFixed(2)},${l.lon.toFixed(2)}`;
  const lista = [lugar, ...recientes().filter(l => clave(l) !== clave(lugar))].slice(0, MAX_RECIENTES);
  escribir(CLAVE_RECIENTES, lista);
  return lista;
}

export function borrarRecientes() {
  escribir(CLAVE_RECIENTES, []);
  return [];
}

export function guardarUltimo(lugar, pronostico) {
  escribir(CLAVE_ULTIMO, { lugar, pronostico });
}

export function ultimo() {
  const u = leer(CLAVE_ULTIMO, null);
  return u && valido(u.lugar) && Array.isArray(u.pronostico?.horas) ? u : null;
}
