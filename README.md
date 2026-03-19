# 🏍️ MotoWeather

App del clima enfocada en motociclistas. Ingresa tu ciudad y un semáforo te dice si es buen día para salir a rodar.

## ¿Qué hace?

- Consulta el clima en tiempo real vía OpenWeatherMap API
- Muestra temperatura, humedad, viento y lluvia
- Semáforo inteligente: 🟢 ideal / 🟡 con cuidado / 🔴 no salgas
- Consejos específicos según las condiciones

## Tecnologías

- HTML5
- CSS3 (variables, grid, animaciones)
- JavaScript vanilla (fetch API)
- OpenWeatherMap API

## Cómo correrlo

1. Clona el repo:
```bash
   git clone https://github.com/Eliasdev/moto-weather.git
```
2. Consigue una API key gratis en [openweathermap.org](https://openweathermap.org/api)
3. En `js/config.js`, reemplaza la key por la tuya
4. Abre `index.html` en tu navegador

## Lógica del semáforo

| Condición | Resultado |
|---|---|
| Lluvia > 5mm o viento > 60km/h | 🔴 No salgas |
| Lluvia leve o viento > 35km/h | 🟡 Con cuidado |
| Todo en rango normal | 🟢 ¡Listo pa' rodar! |

## Autor

Elias — [@Eliasdev](https://github.com/Eliasdev)