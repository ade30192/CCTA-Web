# Web CCTA conectada a la API local (pruebas)

Esta carpeta contiene la página de la iglesia y un formulario de inscripción conectado al backend Java mediante `fetch()`.

## Requisitos locales
- MySQL Server en ejecución.
- API CCTA ejecutándose con `spring-boot:run` en `http://localhost:8080`.
- Servir esta carpeta por HTTP en el puerto 5500 (recomendado: VS Code + extensión Live Server).

No abras `inscripciones.html` con doble clic (`file://`), ya que el navegador puede bloquear las solicitudes por CORS.

## Cómo probar
1. En NetBeans deja el backend ejecutándose.
2. Abre la carpeta `web6` con Visual Studio Code.
3. Usa `Go Live` con Live Server y verifica que la URL sea `http://127.0.0.1:5500` o `http://localhost:5500`.
4. Navega a `inscripciones.html`.
5. Revisa que las actividades carguen desde MySQL.
6. Para la primera prueba usa solo datos ficticios y envía una sola solicitud.
7. En Workbench comprueba la nueva fila con `SELECT * FROM inscripciones;`.

La API local tiene CORS configurado para `localhost:5500`, `127.0.0.1:5500`, `localhost:5501`, `127.0.0.1:5501` y `localhost:63342`.

## Importante antes de publicar
- Esta versión es solo para pruebas locales; no recopiles datos reales de salud o de menores.
- Para Netlify, configura la URL HTTPS pública del backend mediante `window.CCTA_API_BASE_URL` antes de cargar `inscripciones.js`, o modifica la constante al desplegar.
- Despliega la API y la base de datos en una infraestructura segura; nunca publiques credenciales de MySQL en la web.
- Antes de producción se necesitan autenticación/roles del panel administrativo, límites de solicitudes, validaciones, política de privacidad definitiva, HTTPS y pruebas de seguridad.
