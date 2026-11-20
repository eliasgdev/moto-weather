import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluarHora, evaluarSalida, mejorVentana, describirCodigo, NIVEL } from '../js/evaluar.js';
import { normalizar } from '../js/api.js';

const ideal = (extra = {}) => ({
  hora: '2026-11-20T10:00', temp: 22, sensacion: 22, humedad: 60, probLluvia: 5, lluvia: 0,
  codigo: 1, viento: 10, rafagas: 18, visibilidad: 20000, uv: 4, esDia: true, ...extra,
});

const ids = r => r.motivos.map(m => m.id);

test('día despejado y templado es ideal', () => {
  const r = evaluarHora(ideal());
  assert.equal(r.nivel, NIVEL.IDEAL);
  assert.equal(r.etiqueta, 'Listo para rodar');
  assert.deepEqual(r.motivos, []);
});

test('tormenta eléctrica siempre es peligro, aunque no llueva', () => {
  for (const codigo of [95, 96, 99]) {
    const r = evaluarHora(ideal({ codigo, lluvia: 0 }));
    assert.equal(r.nivel, NIVEL.PELIGRO);
    assert.equal(r.motivos[0].id, 'tormenta');
  }
});

test('hielo o nieve es peligro', () => {
  assert.equal(evaluarHora(ideal({ codigo: 66 })).nivel, NIVEL.PELIGRO);
  assert.equal(evaluarHora(ideal({ codigo: 75 })).nivel, NIVEL.PELIGRO);
});

test('lluvia: llovizna es precaución y aguacero es peligro', () => {
  assert.equal(evaluarHora(ideal({ lluvia: 0.5, codigo: 61 })).nivel, NIVEL.CUIDADO);
  assert.equal(evaluarHora(ideal({ lluvia: 4, codigo: 65 })).nivel, NIVEL.PELIGRO);
});

test('la probabilidad de lluvia sola nunca pasa de precaución', () => {
  const r = evaluarHora(ideal({ probLluvia: 95, lluvia: 0 }));
  assert.equal(r.nivel, NIVEL.CUIDADO);
  assert.match(r.motivos[0].texto, /95 %/);
});

test('las ráfagas cuentan aunque el viento sostenido sea bajo', () => {
  assert.equal(evaluarHora(ideal({ viento: 12, rafagas: 42 })).nivel, NIVEL.CUIDADO);
  const r = evaluarHora(ideal({ viento: 20, rafagas: 65 }));
  assert.equal(r.nivel, NIVEL.PELIGRO);
  assert.match(r.motivos[0].texto, /65 km\/h/);
});

test('niebla o poca visibilidad', () => {
  assert.equal(evaluarHora(ideal({ codigo: 45, visibilidad: 3000 })).nivel, NIVEL.CUIDADO);
  assert.equal(evaluarHora(ideal({ visibilidad: 800 })).nivel, NIVEL.CUIDADO);
  assert.equal(evaluarHora(ideal({ visibilidad: 150 })).nivel, NIVEL.PELIGRO);
});

test('frío usa la sensación térmica; calor usa la temperatura', () => {
  assert.equal(evaluarHora(ideal({ temp: 12, sensacion: 9 })).nivel, NIVEL.CUIDADO);
  assert.equal(evaluarHora(ideal({ temp: 5, sensacion: 2 })).nivel, NIVEL.PELIGRO);
  assert.equal(evaluarHora(ideal({ temp: 35, sensacion: 37 })).nivel, NIVEL.CUIDADO);
  assert.equal(evaluarHora(ideal({ temp: 39, sensacion: 41 })).nivel, NIVEL.PELIGRO);
});

test('de noche es precaución y no cuenta el UV', () => {
  const r = evaluarHora(ideal({ esDia: false, uv: 0 }));
  assert.equal(r.nivel, NIVEL.CUIDADO);
  assert.deepEqual(ids(r), ['noche']);
});

test('UV muy alto de día es precaución', () => {
  assert.deepEqual(ids(evaluarHora(ideal({ uv: 9 }))), ['uv']);
});

test('los motivos quedan ordenados del más grave al más leve', () => {
  const r = evaluarHora(ideal({ esDia: false, rafagas: 70, lluvia: 1 }));
  assert.equal(r.nivel, NIVEL.PELIGRO);
  assert.equal(r.motivos[0].id, 'viento');
  for (let i = 1; i < r.motivos.length; i++) assert.ok(r.motivos[i - 1].nivel >= r.motivos[i].nivel);
});

test('valores faltantes no rompen la evaluación', () => {
  const r = evaluarHora({ hora: '2026-11-20T10:00', temp: 20, codigo: 2 });
  assert.equal(r.nivel, NIVEL.IDEAL);
});

const serie = niveles => niveles.map((n, i) => ideal({
  hora: `2026-11-20T${String(i).padStart(2, '0')}:00`,
  lluvia: n === 2 ? 6 : n === 1 ? 0.5 : 0,
}));

test('mejorVentana elige el tramo ideal más largo', () => {
  const horas = serie([2, 0, 0, 1, 0, 0, 0, 2]);
  assert.deepEqual(mejorVentana(horas), { inicio: 4, fin: 6, nivel: NIVEL.IDEAL, largo: 3 });
});

test('mejorVentana cae a precaución si no hay horas ideales', () => {
  const horas = serie([2, 1, 1, 2, 1, 2]);
  assert.deepEqual(mejorVentana(horas), { inicio: 1, fin: 2, nivel: NIVEL.CUIDADO, largo: 2 });
});

test('mejorVentana ignora la noche y devuelve null si todo es peligro', () => {
  const horas = serie([0, 0, 0]).map(h => ({ ...h, esDia: false }));
  assert.equal(mejorVentana(horas), null);
  assert.equal(mejorVentana(serie([2, 2, 2])), null);
});

test('mejorVentana respeta el alcance', () => {
  const horas = serie([2, 2, 0, 0, 0, 0]);
  assert.equal(mejorVentana(horas, { alcance: 2 }), null);
});

test('evaluarSalida toma la peor hora del tramo y dice cuándo', () => {
  const horas = serie([0, 0, 2, 0]);
  const r = evaluarSalida(horas, 0, 3);
  assert.equal(r.nivel, NIVEL.PELIGRO);
  assert.equal(r.horas, 3);
  assert.equal(r.motivos[0].hora, '2026-11-20T02:00');
  assert.equal(evaluarSalida(horas, 0, 2).nivel, NIVEL.IDEAL);
});

test('evaluarSalida no repite motivos y guarda el más grave', () => {
  const horas = serie([1, 2, 1]);
  const r = evaluarSalida(horas, 0, 3);
  assert.equal(r.motivos.filter(m => m.id === 'lluvia').length, 1);
  assert.equal(r.motivos[0].nivel, NIVEL.PELIGRO);
});

test('describirCodigo traduce códigos WMO', () => {
  assert.equal(describirCodigo(0), 'Despejado');
  assert.equal(describirCodigo(95), 'Tormenta eléctrica');
  assert.equal(describirCodigo(45), 'Niebla');
});

test('normalizar arranca en la hora actual', () => {
  const tiempos = ['2026-11-20T08:00', '2026-11-20T09:00', '2026-11-20T10:00'];
  const col = v => tiempos.map(() => v);
  const json = {
    timezone: 'America/Bogota',
    current: { time: '2026-11-20T09:45', temperature_2m: 19, is_day: 1, weather_code: 2, wind_speed_10m: 8 },
    hourly: {
      time: tiempos, temperature_2m: [15, 18, 21], apparent_temperature: col(18), relative_humidity_2m: col(70),
      precipitation_probability: [10, 20, 30], precipitation: col(0), weather_code: col(2),
      wind_speed_10m: col(9), wind_gusts_10m: col(20), visibility: col(10000), uv_index: col(3), is_day: col(1),
    },
  };
  const p = normalizar(json);
  assert.equal(p.horas.length, 2);
  assert.equal(p.horas[0].hora, '2026-11-20T09:00');
  assert.equal(p.actual.temp, 19);
  assert.equal(p.actual.probLluvia, 20);
  assert.equal(p.actual.esDia, true);
});
