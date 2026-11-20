// Acceso a Open-Meteo (gratis, sin API key). https://open-meteo.com
// Todo lo que sale de aquí ya viene normalizado para evaluar.js.

const GEO = 'https://geocoding-api.open-meteo.com/v1/search';
const PRONOSTICO = 'https://api.open-meteo.com/v1/forecast';

const VARIABLES = [
  'temperature_2m', 'apparent_temperature', 'relative_humidity_2m',
  'precipitation_probability', 'precipitation', 'weather_code',
  'wind_speed_10m', 'wind_gusts_10m', 'visibility', 'uv_index', 'is_day',
].join(',');

export class ErrorClima extends Error {
  constructor(mensaje, { sinConexion = false } = {}) {
    super(mensaje);
    this.sinConexion = sinConexion;
  }
}

async function pedirJson(url, { signal, intentos = 2, espera = 800 } = {}) {
  let ultimo;
  for (let i = 0; i < intentos; i++) {
    try {
      const res = await fetch(url, { signal: combinarSenal(signal, 12000) });
      const json = await res.json().catch(() => null);
      if (res.ok && json && !json.error) return json;
      ultimo = new ErrorClima(json?.reason ? 'El servicio del clima está ocupado. Intenta de nuevo en un momento.' : 'No se pudo consultar el clima.');
      if (res.status < 500 && res.status !== 429) break;
    } catch (err) {
      if (signal?.aborted) throw err;
      ultimo = new ErrorClima('Sin conexión. Revisa tus datos o el wifi.', { sinConexion: true });
    }
    if (i < intentos - 1) await new Promise(r => setTimeout(r, espera * (i + 1)));
  }
  throw ultimo;
}

function combinarSenal(externa, ms) {
  const tiempo = AbortSignal.timeout(ms);
  if (!externa) return tiempo;
  return AbortSignal.any ? AbortSignal.any([externa, tiempo]) : externa;
}

// Devuelve hasta 6 lugares [{ id, nombre, region, pais, codigoPais, lat, lon }].
export async function buscarLugares(texto, { signal } = {}) {
  const q = texto.trim().slice(0, 80);
  if (q.length < 2) return [];
  const url = `${GEO}?name=${encodeURIComponent(q)}&count=6&language=es&format=json`;
  const json = await pedirJson(url, { signal, intentos: 1 });
  return (json.results ?? []).map(r => ({
    id: r.id,
    nombre: r.name,
    region: r.admin1 ?? '',
    pais: r.country ?? '',
    codigoPais: r.country_code ?? '',
    lat: r.latitude,
    lon: r.longitude,
  }));
}

// Pronóstico por hora desde la hora actual hasta ~48 h después.
// Devuelve { zona, actual, horas, actualizado } donde cada hora es
// { hora: 'YYYY-MM-DDTHH:00', temp, sensacion, humedad, probLluvia, lluvia, codigo, viento, rafagas, visibilidad, uv, esDia }.
export async function pedirPronostico(lat, lon, { signal } = {}) {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    hourly: VARIABLES,
    current: VARIABLES.replace('precipitation_probability,', '').replace(',uv_index', ''),
    timezone: 'auto',
    forecast_days: '3',
    wind_speed_unit: 'kmh',
  });
  const json = await pedirJson(`${PRONOSTICO}?${params}`, { signal });
  return normalizar(json);
}

export function normalizar(json) {
  const h = json.hourly;
  const todas = h.time.map((hora, i) => ({
    hora,
    temp: h.temperature_2m?.[i],
    sensacion: h.apparent_temperature?.[i],
    humedad: h.relative_humidity_2m?.[i],
    probLluvia: h.precipitation_probability?.[i],
    lluvia: h.precipitation?.[i],
    codigo: h.weather_code?.[i],
    viento: h.wind_speed_10m?.[i],
    rafagas: h.wind_gusts_10m?.[i],
    visibilidad: h.visibility?.[i],
    uv: h.uv_index?.[i],
    esDia: h.is_day?.[i] == null ? undefined : h.is_day[i] === 1,
  }));

  const horaActual = (json.current?.time ?? todas[0].hora).slice(0, 13) + ':00';
  let desde = todas.findIndex(x => x.hora === horaActual);
  if (desde < 0) desde = 0;
  const horas = todas.slice(desde, desde + 48);

  const c = json.current ?? {};
  const base = horas[0] ?? {};
  const actual = {
    ...base,
    hora: c.time ?? base.hora,
    temp: c.temperature_2m ?? base.temp,
    sensacion: c.apparent_temperature ?? base.sensacion,
    humedad: c.relative_humidity_2m ?? base.humedad,
    lluvia: c.precipitation ?? base.lluvia,
    codigo: c.weather_code ?? base.codigo,
    viento: c.wind_speed_10m ?? base.viento,
    rafagas: c.wind_gusts_10m ?? base.rafagas,
    visibilidad: c.visibility ?? base.visibilidad,
    esDia: c.is_day == null ? base.esDia : c.is_day === 1,
  };

  return { zona: json.timezone, actual, horas, actualizado: Date.now() };
}
