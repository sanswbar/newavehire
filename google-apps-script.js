// NEWAVE HIRE — Recepción de leads del formulario de la landing
//
// INSTRUCCIONES DE INSTALACIÓN:
// 1. Crea un Google Sheet nuevo (hoja en blanco) llamado "NEWAVE HIRE — Leads"
// 2. Ve a Extensiones > Apps Script
// 3. Borra el código que hay y pega TODO este código
// 4. Guarda (Cmd+S)
// 5. Click en "Implementar" > "Nueva implementación"
//    - Tipo: Aplicación web
//    - Ejecutar como: Yo (tu cuenta)
//    - Quién tiene acceso: Cualquier persona
// 6. Click "Implementar" y autoriza los permisos
// 7. Copia la URL que termina en /exec
// 8. Pégala en index.html e index-es.html donde dice PEGA_AQUI_TU_APPS_SCRIPT_URL
//
// Los leads caen en el Sheet. No se envía ningún correo automático.

// ID del Sheet donde caen los leads (funciona aunque el script no esté vinculado al Sheet)
var SHEET_ID = '1P2dlXY9NZfhlffl4quieK9W5nbEw1F7vt5OEaBCTpkY';

function getSheet_() {
  return SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
}

var HEADERS = [
  'Fecha',
  'Idioma',
  'Nombre',
  'Email de trabajo',
  'Empresa',
  'Rol que buscan',
  'Tamaño de equipo',
  'Cuándo necesitan cubrirlo',
  'Presupuesto mensual (USD)',
  'Herramientas del equipo',
  'Detalle del rol'
];

function doPost(e) {
  try {
    var sheet = getSheet_();

    // Agrega encabezados si la hoja está vacía
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }

    var p = e.parameter;

    sheet.appendRow([
      new Date(),
      p.idioma      || '',
      p.nombre      || '',
      p.email       || '',
      p.empresa     || '',
      p.rol         || '',
      p.equipo      || '',
      p.urgencia    || '',
      p.presupuesto || '',
      p.herramientas|| '',
      p.detalle     || ''
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Permite verificar el despliegue abriendo la URL /exec en el navegador
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ result: 'ok', mensaje: 'Endpoint activo' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Test: corre esta función manualmente para verificar que escribe en el Sheet
function testWrite() {
  var sheet = getSheet_();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  sheet.appendRow([
    new Date(), 'es', 'Test Lead', 'test@empresa.com', 'Empresa Test',
    'Asistente Ejecutivo', '11-50', '1-2-semanas', '1000-1500',
    'Notion, Slack, HubSpot', 'Necesitamos apoyo en agenda y reportes.'
  ]);
}
