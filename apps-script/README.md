# Apps Script de NEWAVE Hire

Estos dos archivos NO se despliegan solos. Hay que pegarlos a mano en cada proyecto de Apps Script.

| Archivo | Formulario | URL /exec que ya usa la página |
|---|---|---|
| `recruiter-form.gs` | /start/ y /empezar/ (formulario por pasos de reclutadores) | `.../AKfycbzfKjnq.../exec` → Sheet "NW Hire Contact Form", pestaña Hoja 1 |
| `candidate-form.gs` | aiready/index.html (candidatos) | `.../AKfycbyCB2GQ.../exec` → Sheet de candidatos (TODO-CONFIRM-7) |

## Cómo guarda el formulario de reclutadores

El formulario tiene 6 pasos y manda dos veces con el mismo ID:

- Al pasar del paso 1 (nombre, email de trabajo, LinkedIn) crea la fila con Estado **Incompleto**. Así queda el LinkedIn aunque la persona abandone.
- Al enviar el paso 6 completa esa misma fila y pone Estado **Nuevo**.

La columna **ID** es la que une las dos partes. No la borres. El script la agrega solo si falta.

## Orden de publicación (importante)

Las páginas nuevas solo muestran éxito si el script responde `{"ok":true}`. Los scripts que están desplegados hoy responden `{"result":"success"}`.

1. Primero se actualizan los dos Apps Script (pasos de abajo).
2. Después se hace merge a main de la rama `poc-copy-structure`.

Si se publica el sitio antes que los scripts, la fila sí se guarda pero el usuario ve el mensaje de error.

## Pasos para cada script

1. Abre el proyecto de Apps Script que corresponde a la URL /exec de la tabla (desde el Sheet: Extensiones > Apps Script, o desde script.google.com).
2. Borra el código que hay y pega el contenido completo del archivo `.gs`. Guarda.
3. Configura las Script Properties en Configuración del proyecto (ícono de engrane) > Propiedades del script:
   - `recruiter-form.gs`: solo `NOTIFY_EMAIL` (opcional). Si se deja vacío, no manda correo.
   - `candidate-form.gs`: `SHEET_ID`, `TAB`, `CV_FOLDER_ID` (TODO-CONFIRM-7) y `NOTIFY_EMAIL` (opcional). La carpeta de CV debe ser privada; el script no cambia permisos.
4. Corre `testWrite` una vez desde el editor y autoriza los permisos nuevos (Drive para los CV, Mail si usas NOTIFY_EMAIL). Revisa que apareció la fila de prueba y bórrala.
5. Publica SIN cambiar la URL: Implementar > Administrar implementaciones > lápiz (Editar) > Versión: **Nueva versión** > Implementar.
   No uses "Nueva implementación": esa crea otra URL /exec y la página dejaría de enviar.

## Pruebas después de publicar

1. Abre la URL /exec en el navegador. Debe responder `{"ok":true,...}`.
2. Envía el formulario real en newavehire.com (EN y ES) y en /aiready/:
   - Debe aparecer la fila en el Sheet con Estado "Nuevo" (reclutadores) o "Pendiente de revisión" (candidatos).
   - En /aiready/, prueba con un PDF y revisa que quedó en la carpeta privada y que la columna "CV archivo" tiene el link.
   - Envía dos veces con el mismo email en /aiready/: debe actualizar la misma fila, no crear otra.
   - En /start/, llena el paso 1 y cierra la pestaña: debe quedar una fila "Incompleto" con el LinkedIn. En otra prueba termina los 6 pasos sin cerrar: la fila que se creó en el paso 1 debe pasar a "Nuevo" (no debe aparecer una segunda fila). Cada visita nueva es una solicitud nueva, así que una fila "Incompleto" de antes no se completa sola.
3. Prueba de error: en las herramientas de desarrollador del navegador, pon la red en "Offline" y envía. Debe salir el mensaje de error y el botón debe volver a activarse.
4. Las columnas se mapean por nombre del encabezado. Si falta alguno, el script lo agrega al final. La columna vieja "Presupuesto mensual (USD)" del Sheet de reclutadores ya no se usa y se puede borrar a mano.

## Respuestas viejas de AI Ready

Las 5 respuestas que ya existen en el Sheet de AI Ready se dieron SIN consentimiento para compartir el perfil con reclutadores. No se deben mostrar a reclutadores a menos que esas personas vuelvan a llenar el formulario nuevo y acepten las casillas de aviso y de compartir.
