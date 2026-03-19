
var BASE_URL = "https://api.openweathermap.org/data/2.5/weather";

var cityInput     = document.getElementById("cityInput");
var searchBtn     = document.getElementById("searchBtn");
var errorMsg      = document.getElementById("errorMsg");
var resultSection = document.getElementById("resultSection");

var cityName      = document.getElementById("cityName");
var dateTime      = document.getElementById("dateTime");
var temp          = document.getElementById("temp");
var humidity      = document.getElementById("humidity");
var wind          = document.getElementById("wind");
var rain          = document.getElementById("rain");
var semaforoLabel = document.getElementById("semaforoLabel");
var adviceText    = document.getElementById("adviceText");

var luzRojo       = document.getElementById("luzRojo");
var luzAmarillo   = document.getElementById("luzAmarillo");
var luzVerde      = document.getElementById("luzVerde");


searchBtn.addEventListener("click", function() {
  buscarClima();
});

cityInput.addEventListener("keydown", function(e) {
  if (e.key === "Enter") buscarClima();
});

// --- Función principal ---
function buscarClima() {
  var ciudad = cityInput.value.trim();

  if (!ciudad) {
    errorMsg.innerHTML = "Por favor ingresa una ciudad.";
    return;
  }

  errorMsg.innerHTML = "";
  searchBtn.innerHTML = "...";

  var url = BASE_URL + "?q=" + ciudad + "&appid=" + API_KEY + "&units=metric&lang=es";

  fetch(url)
    .then(function(res) {
      if (!res.ok) throw new Error("Ciudad no encontrada");
      return res.json();
    })
    .then(function(data) {
      mostrarResultado(data);
      searchBtn.innerHTML = "BUSCAR";
    })
    .catch(function(err) {
      errorMsg.innerHTML = "❌ Ciudad no encontrada. Verifica el nombre.";
      searchBtn.innerHTML = "BUSCAR";
      resultSection.classList.remove("visible");
    });
}

// --- Mostrar resultados ---
function mostrarResultado(data) {
  var tempVal  = Math.round(data.main.temp);
  var humVal   = data.main.humidity;
  var windVal  = Math.round(data.wind.speed * 3.6);
  var rainVal  = data.rain ? data.rain["1h"] || 0 : 0;
  var ciudad   = data.name + ", " + data.sys.country;
  var fecha    = new Date().toLocaleDateString("es-CO", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });

  cityName.innerHTML  = ciudad;
  dateTime.innerHTML  = fecha;
  temp.innerHTML      = tempVal + "°C";
  humidity.innerHTML  = humVal + "%";
  wind.innerHTML      = windVal + " km/h";
  rain.innerHTML      = rainVal > 0 ? rainVal + " mm" : "Sin lluvia";

  var resultado = evaluarCondiciones(tempVal, humVal, windVal, rainVal);
  actualizarSemaforo(resultado);

  resultSection.classList.add("visible");
}

// --- Lógica del semáforo ---
function evaluarCondiciones(t, h, w, r) {
  if (r > 5 || w > 60 || t < 5 || t > 40) {
    return {
      color: "rojo",
      label: " NO salgas",
      consejo: "Las condiciones son peligrosas para manejar. " +
        (r > 5 ? "Hay lluvia fuerte. " : "") +
        (w > 60 ? "Vientos muy fuertes. " : "") +
        (t < 5 ? "Hace demasiado frío. " : "") +
        (t > 40 ? "Calor extremo. " : "") +
        "Espera a que mejore el clima."
    };
  }

  if (r > 0 || w > 35 || h > 85 || t < 12) {
    return {
      color: "amarillo",
      label: " Con cuidado",
      consejo: "Puedes salir pero con precaución. " +
        (r > 0 ? "Hay algo de lluvia, lleva impermeable. " : "") +
        (w > 35 ? "Viento moderado, mantén buen agarre. " : "") +
        (h > 85 ? "Alta humedad, visibilidad puede reducirse. " : "") +
        (t < 12 ? "Temperatura baja, usa chaqueta. " : "")
    };
  }

  return {
    color: "verde",
    label: " ¡Listo pa' rodar!",
    consejo: "Condiciones perfectas para salir en moto. Cielo despejado, temperatura agradable y poco viento. ¡A disfrutar la ruta!"
  };
}

// --- Actualizar semáforo visual ---
function actualizarSemaforo(resultado) {
  luzRojo.classList.remove("activo");
  luzAmarillo.classList.remove("activo");
  luzVerde.classList.remove("activo");

  if (resultado.color === "rojo")     luzRojo.classList.add("activo");
  if (resultado.color === "amarillo") luzAmarillo.classList.add("activo");
  if (resultado.color === "verde")    luzVerde.classList.add("activo");

  semaforoLabel.innerHTML = resultado.label;
  adviceText.innerHTML    = resultado.consejo;
}