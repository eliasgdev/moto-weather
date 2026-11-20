// Reglas para decidir si es buen momento para salir en moto.
// Funciones puras: no tocan el DOM ni la red, así se pueden probar con node --test.

export const NIVEL = Object.freeze({ IDEAL: 0, CUIDADO: 1, PELIGRO: 2 });

export const ETIQUETA = Object.freeze({
  0: 'Listo para rodar',
  1: 'Sal con precaución',
  2: 'Mejor no salgas',
});

// Umbrales en un solo lugar. Viento y ráfagas en km/h, lluvia en mm/h,
// visibilidad en metros, temperatura en °C.
export const UMBRALES = Object.freeze({
  lluvia: { cuidado: 0.3, peligro: 4 },
  probLluvia: { cuidado: 50, peligro: 85 },
  viento: { cuidado: 30, peligro: 45 },
  rafagas: { cuidado: 40, peligro: 60 },
  visibilidad: { cuidado: 1000, peligro: 200 },
  frio: { cuidado: 10, peligro: 3 },
  calor: { cuidado: 33, peligro: 38 },
  uv: { cuidado: 8 },
});

// Códigos WMO que usa Open-Meteo.
const TORMENTA = [95, 96, 99];
const HIELO = [56, 57, 66, 67, 71, 73, 75, 77, 85, 86];
const NIEBLA = [45, 48];

export function describirCodigo(codigo) {
  if (codigo === 0) return 'Despejado';
  if (codigo === 1) return 'Mayormente despejado';
  if (codigo === 2) return 'Parcialmente nublado';
  if (codigo === 3) return 'Nublado';
  if (NIEBLA.includes(codigo)) return 'Niebla';
  if ([51, 53, 55].includes(codigo)) return 'Llovizna';
  if ([61, 63].includes(codigo)) return 'Lluvia';
  if (codigo === 65) return 'Lluvia fuerte';
  if ([80, 81].includes(codigo)) return 'Chubascos';
  if (codigo === 82) return 'Chubascos fuertes';
  if (TORMENTA.includes(codigo)) return 'Tormenta eléctrica';
  if (HIELO.includes(codigo)) return 'Hielo o nieve';
  return 'Condición variable';
}

const nivelPor = (valor, { cuidado, peligro }, mayorEsPeor = true) => {
  if (valor == null || Number.isNaN(valor)) return NIVEL.IDEAL;
  if (mayorEsPeor) {
    if (peligro != null && valor >= peligro) return NIVEL.PELIGRO;
    if (cuidado != null && valor >= cuidado) return NIVEL.CUIDADO;
  } else {
    if (peligro != null && valor <= peligro) return NIVEL.PELIGRO;
    if (cuidado != null && valor <= cuidado) return NIVEL.CUIDADO;
  }
  return NIVEL.IDEAL;
};

// Evalúa una hora. `h` tiene la forma que produce api.js:
// { temp, sensacion, humedad, probLluvia, lluvia, codigo, viento, rafagas, visibilidad, uv, esDia }
// Devuelve { nivel, etiqueta, motivos: [{ id, nivel, texto, consejo }] } con los motivos
// ordenados del más grave al más leve.
export function evaluarHora(h) {
  const motivos = [];
  const agregar = (id, nivel, texto, consejo) => {
    if (nivel > NIVEL.IDEAL) motivos.push({ id, nivel, texto, consejo });
  };
  const u = UMBRALES;

  if (TORMENTA.includes(h.codigo)) {
    agregar('tormenta', NIVEL.PELIGRO, 'Tormenta eléctrica',
      'Rayos, aguaceros y ráfagas repentinas. Espera bajo techo a que pase.');
  }
  if (HIELO.includes(h.codigo)) {
    agregar('hielo', NIVEL.PELIGRO, 'Riesgo de hielo o nieve',
      'El agarre de las llantas cae casi a cero. No es día para rodar.');
  }

  const nLluvia = nivelPor(h.lluvia, u.lluvia);
  const nProb = nivelPor(h.probLluvia, u.probLluvia);
  // La probabilidad sola nunca llega a "peligro": sin milímetros puede ser solo nubosidad.
  const nivelLluvia = Math.max(nLluvia, Math.min(nProb, NIVEL.CUIDADO));
  if (nivelLluvia === NIVEL.PELIGRO) {
    agregar('lluvia', nivelLluvia, `Lluvia fuerte (${redondear(h.lluvia, 1)} mm/h)`,
      'Charcos profundos y poca visibilidad. Si tienes que salir, baja la velocidad a la mitad.');
  } else if (nivelLluvia === NIVEL.CUIDADO) {
    const texto = h.lluvia >= u.lluvia.cuidado
      ? `Lluvia ligera (${redondear(h.lluvia, 1)} mm/h)`
      : `Posible lluvia (${Math.round(h.probLluvia)} % de probabilidad)`;
    agregar('lluvia', nivelLluvia, texto,
      'Lleva impermeable y evita las líneas pintadas y las tapas de alcantarilla, resbalan.');
  }

  const nRafagas = nivelPor(h.rafagas, u.rafagas);
  const nViento = nivelPor(h.viento, u.viento);
  const nivelViento = Math.max(nRafagas, nViento);
  if (nivelViento > NIVEL.IDEAL) {
    const fuerte = nivelViento === NIVEL.PELIGRO;
    agregar('viento', nivelViento,
      `${fuerte ? 'Viento muy fuerte' : 'Viento moderado'} (ráfagas de ${Math.round(h.rafagas ?? h.viento)} km/h)`,
      fuerte
        ? 'Una ráfaga lateral puede sacarte del carril, sobre todo en puentes y vías abiertas.'
        : 'Agarra firme el manubrio y deja más espacio a los lados en puentes y al pasar camiones.');
  }

  const esNiebla = NIEBLA.includes(h.codigo);
  const nVis = Math.max(nivelPor(h.visibilidad, u.visibilidad, false), esNiebla ? NIVEL.CUIDADO : NIVEL.IDEAL);
  if (nVis > NIVEL.IDEAL) {
    const metros = h.visibilidad != null ? ` (${formatearDistancia(h.visibilidad)})` : '';
    agregar('visibilidad', nVis, `Poca visibilidad${metros}`,
      'Enciende las luces, usa ropa reflectiva y aumenta la distancia con el vehículo de adelante.');
  }

  const temp = h.sensacion ?? h.temp;
  const nFrio = nivelPor(temp, u.frio, false);
  const nCalor = nivelPor(h.temp, u.calor);
  if (nFrio > NIVEL.IDEAL) {
    agregar('frio', nFrio, `Frío (sensación de ${Math.round(temp)} °C)`,
      'Con el viento de la marcha se siente más frío. Usa guantes y una capa térmica.');
  } else if (nCalor > NIVEL.IDEAL) {
    agregar('calor', nCalor, `Calor (${Math.round(h.temp)} °C)`,
      'Hidrátate antes de salir y usa chaqueta ventilada, no te la quites.');
  }

  if (h.esDia === false) {
    agregar('noche', NIVEL.CUIDADO, 'De noche',
      'Te ven menos. Luces encendidas, chaleco reflectivo y velocidad moderada.');
  }

  if (h.esDia !== false && h.uv != null && h.uv >= u.uv.cuidado) {
    agregar('uv', NIVEL.CUIDADO, `Radiación UV muy alta (${Math.round(h.uv)})`,
      'Protector solar en cuello y cara, y visor con filtro UV.');
  }

  if (h.humedad != null && h.humedad >= 90 && temp != null && temp < 15 && !motivos.length) {
    agregar('visor', NIVEL.CUIDADO, 'Humedad alta y frío',
      'El visor se puede empañar. Usa antiempañante o deja una rendija abierta.');
  }

  motivos.sort((a, b) => b.nivel - a.nivel);
  const nivel = motivos.length ? motivos[0].nivel : NIVEL.IDEAL;
  return { nivel, etiqueta: ETIQUETA[nivel], motivos };
}

// Peor condición de un tramo de horas (para planear una salida).
// `horas` es la lista completa; `desde` el índice de la hora de salida; `duracion` en horas.
export function evaluarSalida(horas, desde, duracion) {
  const tramo = horas.slice(desde, desde + Math.max(1, duracion));
  if (!tramo.length) return null;
  const evaluadas = tramo.map(evaluarHora);
  const nivel = Math.max(...evaluadas.map(e => e.nivel));
  const vistos = new Map();
  evaluadas.forEach((e, i) => {
    for (const m of e.motivos) {
      const previo = vistos.get(m.id);
      if (!previo || m.nivel > previo.nivel) vistos.set(m.id, { ...m, hora: tramo[i].hora });
    }
  });
  const motivos = [...vistos.values()].sort((a, b) => b.nivel - a.nivel);
  return { nivel, etiqueta: ETIQUETA[nivel], motivos, horas: tramo.length };
}

// Busca el tramo más largo de horas ideales (o, si no hay, de precaución)
// entre `desde` y `desde + alcance`. Por defecto solo cuenta horas de día.
// Devuelve { inicio, fin, nivel, largo } con índices sobre `horas`, o null.
export function mejorVentana(horas, { desde = 0, alcance = 24, soloDia = true, minimo = 1 } = {}) {
  const limite = Math.min(horas.length, desde + alcance);
  for (const objetivo of [NIVEL.IDEAL, NIVEL.CUIDADO]) {
    let mejor = null;
    let inicio = null;
    for (let i = desde; i <= limite; i++) {
      const h = horas[i];
      const sirve = i < limite && (!soloDia || h.esDia !== false) && evaluarHora(h).nivel <= objetivo;
      if (sirve && inicio === null) inicio = i;
      if (!sirve && inicio !== null) {
        const largo = i - inicio;
        if (largo >= minimo && (!mejor || largo > mejor.largo)) {
          mejor = { inicio, fin: i - 1, nivel: objetivo, largo };
        }
        inicio = null;
      }
    }
    if (mejor) return mejor;
  }
  return null;
}

function redondear(n, dec = 0) {
  const f = 10 ** dec;
  return Math.round((n ?? 0) * f) / f;
}

export function formatearDistancia(metros) {
  if (metros >= 1000) return `${redondear(metros / 1000, 1)} km`;
  return `${Math.round(metros)} m`;
}
