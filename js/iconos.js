// Íconos de trazo (estilo Lucide, licencia ISC). Contenido fijo: nunca se mezcla con datos externos.
const TRAZOS = {
  moto: '<circle cx="5" cy="16.5" r="3.5"/><circle cx="19" cy="16.5" r="3.5"/><path d="M5 16.5 9.5 11H15l4 5.5"/><path d="M8.5 16.5h5.5l1.5-3"/><path d="M7.5 11 9 8.5h4.5L15 11"/><path d="m16 13-2-6h3"/>',
  buscar: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  ubicacion: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  temp: '<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/>',
  gota: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  viento: '<path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/><path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>',
  lluvia: '<path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/><path d="M16 14v6M8 14v6M12 16v6"/>',
  tormenta: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  hielo: '<path d="M2 12h20M12 2v20M4.9 4.9l14.2 14.2M19.1 4.9 4.9 19.1"/>',
  visibilidad: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
  luna: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  nube: '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9Z"/>',
  reloj: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  ruta: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
  alerta: '<path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3"/><path d="M12 9v4M12 17h.01"/>',
  ok: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  cerrar: '<path d="M18 6 6 18M6 6l12 12"/>',
  atras: '<path d="m15 18-6-6 6-6"/>',
  adelante: '<path d="m9 18 6-6-6-6"/>',
  recargar: '<path d="M21 12a9 9 0 1 1-2.6-6.4L21 8"/><path d="M21 3v5h-5"/>',
};

export const ICONO_MOTIVO = {
  tormenta: 'tormenta', hielo: 'hielo', lluvia: 'lluvia', viento: 'viento',
  visibilidad: 'visibilidad', frio: 'temp', calor: 'temp', noche: 'luna', uv: 'sol', visor: 'gota',
};

export function icono(nombre, { tam = 20, clase = '' } = {}) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', tam);
  svg.setAttribute('height', tam);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  if (clase) svg.setAttribute('class', clase);
  svg.innerHTML = TRAZOS[nombre] ?? TRAZOS.nube;
  return svg;
}

export function iconoClima(codigo, esDia) {
  if ([95, 96, 99].includes(codigo)) return 'tormenta';
  if ([56, 57, 66, 67, 71, 73, 75, 77, 85, 86].includes(codigo)) return 'hielo';
  if (codigo >= 51 && codigo <= 82) return 'lluvia';
  if (codigo === 45 || codigo === 48) return 'visibilidad';
  if (codigo <= 1) return esDia === false ? 'luna' : 'sol';
  return 'nube';
}
