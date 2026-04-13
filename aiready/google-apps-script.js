// INSTRUCCIONES:
// 1. Abre tu Google Sheet: https://docs.google.com/spreadsheets/d/173d0x2dHQzyfE-9c0nNL2AryjIZ6O8MtQUysVISKw4I
// 2. Ve a Extensiones > Apps Script
// 3. Borra el código que hay y pega TODO este código
// 4. Guarda (Ctrl+S)
// 5. Click en "Implementar" > "Nueva implementación"
// 6. Tipo: Aplicación web
//    - Ejecutar como: Yo (tu cuenta)
//    - Quién tiene acceso: Cualquier persona
// 7. Click "Implementar" y autoriza
// 8. Copia la URL que aparece y pégala en index.html donde dice PEGA_AQUI_TU_APPS_SCRIPT_URL

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    // Agrega encabezados si la hoja está vacía
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'Fecha',
        'Nombre completo',
        'WhatsApp',
        '¿Qué estás construyendo?',
        'Demo / Link',
        'Área',
        'Experiencia en tech'
      ]);
    }

    const p = e.parameter;

    sheet.appendRow([
      new Date(),
      p.nombre     || '',
      p.whatsapp   || '',
      p.building   || '',
      p.demo       || '',
      p.area       || '',
      p.experiencia || ''
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

// Test: puedes correr esta función manualmente para verificar que escribe en el Sheet
function testWrite() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.appendRow([new Date(), 'Test', '+521234567890', 'SaaS con Claude', 'loom.com/test', 'engineering', 'senior']);
}
