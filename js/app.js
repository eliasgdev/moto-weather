import { evaluarHora, evaluarSalida, mejorVentana, describirCodigo, formatearDistancia, NIVEL } from './evaluar.js';
import { buscarLugares, pedirPronostico } from './api.js';
import { icono, iconoClima, ICONO_MOTIVO } from './iconos.js';
import * as almacen from './almacen.js';

const $ = id => document.getElementById(id);
const el = (tag, clase, texto) => {
  const n = document.createElement(tag);
  if (clase) n.className = clase;
  if (texto != null) n.textContent = texto;
  return n;
};
const COLOR = { [NIVEL.IDEAL]: 'verde', [NIVEL.CUIDADO]: 'amarillo', [NIVEL.PELIGRO]: 'rojo' };

const estado = { lugar: null, pronostico: null, sugerencias: [], activa: -1, pedido: null };

// ---------- Íconos fijos ----------
$('iconoBuscar').append(icono('buscar', { tam: 18 }));
$('iconoUbicacion').append(icono('ubicacion', { tam: 18 }));
$('horasAtras').append(icono('atras', { tam: 16 }));
$('horasAdelante').append(icono('adelante', { tam: 16 }));

// ---------- Utilidades de formato ----------
const horaCorta = iso => {
  const h = Number(iso.slice(11, 13));
  const sufijo = h < 12 ? 'a. m.' : 'p. m.';
  return `${h % 12 === 0 ? 12 : h % 12} ${sufijo}`;
};
const diaDe = iso => iso.slice(0, 10);
const nombreDia = (iso, hoy) => {
  if (diaDe(iso) === hoy) return 'hoy';
  const f = new Date(`${diaDe(iso)}T12:00:00`);
  const manana = new Date(`${hoy}T12:00:00`);
  manana.setDate(manana.getDate() + 1);
  if (f.toDateString() === manana.toDateString()) return 'mañana';
  return f.toLocaleDateString('es', { weekday: 'long' });
};
const nombreLugar = l => [l.nombre, l.region && l.region !== l.nombre ? l.region : '', l.pais].filter(Boolean).join(', ');

function mostrarError(texto) { $('mensajeError').textContent = texto ?? ''; }

function cargando(si) {
  $('cargando').hidden = !si;
  $('botonBuscar').disabled = si;
  $('botonUbicacion').disabled = si;
}

// ---------- Búsqueda con sugerencias ----------
const entrada = $('entradaLugar');
const lista = $('listaLugares');
let temporizador;

entrada.addEventListener('input', () => {
  clearTimeout(temporizador);
  mostrarError('');
  const texto = entrada.value.trim();
  if (texto.length < 2) return cerrarSugerencias();
  temporizador = setTimeout(() => sugerir(texto), 250);
});

async function sugerir(texto) {
  estado.pedido?.abort();
  estado.pedido = new AbortController();
  try {
    estado.sugerencias = await buscarLugares(texto, { signal: estado.pedido.signal });
    pintarSugerencias();
  } catch (err) {
    if (err.name !== 'AbortError') cerrarSugerencias();
  }
}

function pintarSugerencias() {
  lista.replaceChildren();
  estado.activa = -1;
  if (!estado.sugerencias.length) return cerrarSugerencias();
  estado.sugerencias.forEach((l, i) => {
    const li = el('li', 'sugerencia');
    li.id = `sugerencia-${i}`;
    li.setAttribute('role', 'option');
    li.append(icono('pin', { tam: 16 }), el('span', 'sug-nombre', l.nombre),
      el('span', 'sug-region', [l.region, l.pais].filter(Boolean).join(', ')));
    li.addEventListener('mousedown', e => { e.preventDefault(); elegir(l); });
    lista.append(li);
  });
  lista.hidden = false;
  entrada.setAttribute('aria-expanded', 'true');
}

function cerrarSugerencias() {
  lista.hidden = true;
  lista.replaceChildren();
  entrada.setAttribute('aria-expanded', 'false');
  entrada.removeAttribute('aria-activedescendant');
  estado.activa = -1;
}

entrada.addEventListener('keydown', e => {
  if (lista.hidden) return;
  const n = estado.sugerencias.length;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    estado.activa = (estado.activa + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
    [...lista.children].forEach((li, i) => li.setAttribute('aria-selected', String(i === estado.activa)));
    entrada.setAttribute('aria-activedescendant', `sugerencia-${estado.activa}`);
  } else if (e.key === 'Enter' && estado.activa >= 0) {
    e.preventDefault();
    elegir(estado.sugerencias[estado.activa]);
  } else if (e.key === 'Escape') {
    cerrarSugerencias();
  }
});
entrada.addEventListener('blur', () => setTimeout(cerrarSugerencias, 100));

$('formBusqueda').addEventListener('submit', async e => {
  e.preventDefault();
  cancelarSugerencias();
  const texto = entrada.value.trim();
  if (!texto) return mostrarError('Escribe el nombre de una ciudad o municipio.');
  if (estado.sugerencias.length && estado.sugerencias[0].nombre.toLowerCase() === texto.toLowerCase()) {
    return elegir(estado.sugerencias[0]);
  }
  cargando(true);
  try {
    const encontrados = await buscarLugares(texto);
    if (!encontrados.length) {
      mostrarError(`No encontramos «${texto}». Revisa cómo se escribe o prueba con la ciudad más cercana.`);
      return;
    }
    await elegir(encontrados[0]);
  } catch (err) {
    mostrarError(err.message);
  } finally {
    cargando(false);
  }
});

$('botonUbicacion').addEventListener('click', () => {
  if (!('geolocation' in navigator)) return mostrarError('Tu navegador no permite compartir la ubicación.');
  mostrarError('');
  cargando(true);
  navigator.geolocation.getCurrentPosition(
    pos => elegir({ nombre: 'Tu ubicación', region: '', pais: '', lat: pos.coords.latitude, lon: pos.coords.longitude }),
    err => {
      cargando(false);
      mostrarError(err.code === err.PERMISSION_DENIED
        ? 'No diste permiso de ubicación. Puedes escribir tu ciudad.'
        : 'No pudimos obtener tu ubicación. Escribe tu ciudad.');
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 10 * 60 * 1000 },
  );
});

$('botonRecargar').addEventListener('click', () => estado.lugar && elegir(estado.lugar));

function cancelarSugerencias() {
  clearTimeout(temporizador);
  estado.pedido?.abort();
  cerrarSugerencias();
}

async function elegir(lugar) {
  cancelarSugerencias();
  entrada.value = lugar.nombre === 'Tu ubicación' ? '' : lugar.nombre;
  mostrarError('');
  cargando(true);
  try {
    const pronostico = await pedirPronostico(lugar.lat, lugar.lon);
    estado.lugar = lugar;
    estado.pronostico = pronostico;
    almacen.guardarUltimo(lugar, pronostico);
    if (lugar.nombre !== 'Tu ubicación') pintarRecientes(almacen.agregarReciente(lugar));
    avisoConexion(null);
    pintar();
  } catch (err) {
    const guardado = almacen.ultimo();
    if (err.sinConexion && guardado) {
      estado.lugar = guardado.lugar;
      estado.pronostico = guardado.pronostico;
      avisoConexion(guardado.pronostico.actualizado);
      pintar();
    } else {
      mostrarError(err.message);
    }
  } finally {
    cargando(false);
  }
}

function avisoConexion(desde) {
  const aviso = $('avisoConexion');
  if (!desde) { aviso.hidden = true; return; }
  const hora = new Date(desde).toLocaleString('es', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
  aviso.replaceChildren(icono('alerta', { tam: 16 }), el('span', null, `Sin conexión · datos de ${hora}`));
  aviso.hidden = false;
}

// ---------- Recientes ----------
function pintarRecientes(listaLugares = almacen.recientes()) {
  const cont = $('listaRecientes');
  cont.replaceChildren();
  $('recientes').hidden = !listaLugares.length;
  for (const l of listaLugares) {
    const ir = el('button', 'enlace', l.nombre);
    ir.type = 'button';
    ir.title = nombreLugar(l);
    ir.addEventListener('click', () => elegir(l));
    cont.append(ir);
  }
}
$('borrarRecientes').addEventListener('click', () => pintarRecientes(almacen.borrarRecientes()));

// ---------- Resultado ----------
function pintar() {
  const { lugar, pronostico } = estado;
  const { actual, horas } = pronostico;
  const hoy = diaDe(actual.hora);
  const ev = evaluarHora(actual);

  $('resultado').hidden = false;
  $('nombreLugar').textContent = nombreLugar(lugar);
  const actualizado = new Date(pronostico.actualizado).toLocaleTimeString('es', { hour: 'numeric', minute: '2-digit' });
  $('detalleAhora').textContent = `${describirCodigo(actual.codigo)} · ${actualizado}`;

  const semaforo = $('semaforo');
  semaforo.dataset.nivel = COLOR[ev.nivel];
  semaforo.setAttribute('aria-label', `Semáforo: ${ev.etiqueta}`);
  const veredicto = $('veredicto');
  veredicto.textContent = ev.etiqueta;
  veredicto.dataset.nivel = COLOR[ev.nivel];
  pintarMotivos($('motivosAhora'), ev.motivos, 'Cielo, viento y temperatura en buen rango. Disfruta la ruta.');

  const datos = $('datosAhora');
  datos.replaceChildren();
  const dato = (nombre, valor, unidad, clase = '') => {
    const d = el('div', `dato ${clase}`.trim());
    const dd = el('dd', null, valor);
    if (unidad) dd.append(el('small', null, unidad));
    d.append(el('dt', null, nombre), dd);
    datos.append(d);
  };
  dato(`Sensación ${Math.round(actual.sensacion ?? actual.temp)}°`, `${Math.round(actual.temp)}°`, '');
  dato(actual.lluvia > 0 ? 'Lluvia ahora' : 'Prob. de lluvia',
    actual.lluvia > 0 ? String(actual.lluvia).replace('.', ',') : String(Math.round(horas[0]?.probLluvia ?? 0)),
    actual.lluvia > 0 ? 'mm' : '%', 'lluvia');
  dato(`Ráfagas · viento ${Math.round(actual.viento)} km/h`, String(Math.round(actual.rafagas ?? actual.viento)), 'km/h');
  dato('Humedad', String(Math.round(actual.humedad)), '%');
  if (actual.visibilidad != null) {
    const [num, uni] = formatearDistancia(actual.visibilidad).split(' ');
    dato('Visibilidad', num.replace('.', ','), uni);
  }

  pintarVentana(horas, hoy);
  pintarHoras(horas, hoy);
  pintarPlanOpciones(horas, hoy);
  pintarPlan();
}

function pintarMotivos(ul, motivos, textoIdeal) {
  ul.replaceChildren();
  if (!motivos.length) {
    const li = el('li', 'motivo verde');
    li.append(icono('ok', { tam: 18 }), el('span', null, textoIdeal));
    ul.append(li);
    return;
  }
  for (const m of motivos) {
    const li = el('li', `motivo ${COLOR[m.nivel]}`);
    const texto = el('div');
    texto.append(el('strong', null, m.hora ? `${m.texto} · ${horaCorta(m.hora)}` : m.texto), el('span', null, m.consejo));
    li.append(icono(ICONO_MOTIVO[m.id] ?? 'alerta', { tam: 18 }), texto);
    ul.append(li);
  }
}

function pintarVentana(horas, hoy) {
  const p = $('ventana');
  p.replaceChildren();
  const v = mejorVentana(horas, { alcance: 24, soloDia: true });
  if (!v) {
    p.dataset.nivel = 'rojo';
    p.textContent = 'En las próximas 24 horas de luz no hay un buen momento. Si puedes, aplaza la salida.';
    return;
  }
  const ini = horas[v.inicio].hora;
  const finSiguiente = horas[v.fin + 1]?.hora ?? horas[v.fin].hora;
  p.dataset.nivel = COLOR[v.nivel];
  const cuando = nombreDia(ini, hoy);
  const rango = el('strong', null, `${cuando[0].toUpperCase()}${cuando.slice(1)}, de ${horaCorta(ini)} a ${horaCorta(finSiguiente)}`);
  const extra = v.nivel === NIVEL.IDEAL
    ? `${v.largo} ${v.largo === 1 ? 'hora' : 'horas'} seguidas con condiciones ideales y luz de día.`
    : 'No hay horas ideales; este es el tramo más tranquilo. Sal con precaución.';
  p.append(rango, el('span', null, extra));
}

function pintarHoras(horas, hoy) {
  const ol = $('horas');
  ol.replaceChildren();
  horas.slice(0, 24).forEach((h, i) => {
    const ev = evaluarHora(h);
    const li = el('li', `hora ${COLOR[ev.nivel]}`);
    const dia = nombreDia(h.hora, hoy);
    const etiqueta = i === 0 ? 'Ahora' : horaCorta(h.hora);
    li.setAttribute('aria-label',
      `${etiqueta} ${dia}: ${ev.etiqueta}. ${Math.round(h.temp)} grados, lluvia ${Math.round(h.probLluvia ?? 0)} por ciento, ráfagas ${Math.round(h.rafagas ?? 0)} kilómetros por hora.`);
    li.title = ev.motivos.map(m => m.texto).join(' · ') || 'Condiciones ideales';
    const cab = el('span', 'hora-cuando', etiqueta);
    if (i > 0 && h.hora.slice(11, 13) === '00') cab.append(el('small', null, dia));
    li.append(
      cab,
      icono(iconoClima(h.codigo, h.esDia), { tam: 24, clase: 'hora-icono' }),
      el('span', 'hora-temp', `${Math.round(h.temp)}°`),
      el('span', 'hora-lluvia', `${Math.round(h.probLluvia ?? 0)} %`),
      el('span', 'hora-viento', `${Math.round(h.rafagas ?? 0)} km/h`),
      el('span', 'hora-barra'),
    );
    ol.append(li);
  });
}

function pintarPlanOpciones(horas, hoy) {
  const sel = $('planSalida');
  const previo = sel.value;
  sel.replaceChildren();
  horas.slice(0, 24).forEach((h, i) => {
    const op = el('option', null, i === 0 ? 'ahora' : `${nombreDia(h.hora, hoy)} a las ${horaCorta(h.hora)}`);
    op.value = String(i);
    sel.append(op);
  });
  if (previo && Number(previo) < sel.options.length) sel.value = previo;
}

function pintarPlan() {
  const { horas } = estado.pronostico ?? {};
  if (!horas) return;
  const desde = Number($('planSalida').value || 0);
  const duracion = Number($('planDuracion').value || 2);
  const r = evaluarSalida(horas, desde, duracion);
  const cont = $('planResultado');
  cont.replaceChildren();
  if (!r) return;
  const titulo = el('p', 'plan-veredicto', r.etiqueta);
  titulo.dataset.nivel = COLOR[r.nivel];
  const ul = el('ul', 'motivos');
  pintarMotivos(ul, r.motivos, `Las ${r.horas} ${r.horas === 1 ? 'hora' : 'horas'} de la rodada se ven bien.`);
  cont.append(titulo, ul);
}

$('planSalida').addEventListener('change', pintarPlan);
const desplazar = dir => { const ol = $('horas'); ol.scrollBy({ left: dir * ol.clientWidth * 0.8 }); };
$('horasAtras').addEventListener('click', () => desplazar(-1));
$('horasAdelante').addEventListener('click', () => desplazar(1));
$('planDuracion').addEventListener('change', pintarPlan);
$('formPlan').addEventListener('submit', e => e.preventDefault());

// ---------- Inicio ----------
pintarRecientes();
const guardado = almacen.ultimo();
if (guardado) elegir(guardado.lugar);

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
