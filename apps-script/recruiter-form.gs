// NEWAVE Hire: formulario de reclutadores por pasos (newavehire.com/start/ y /empezar/)
//
// El formulario manda dos veces con el mismo lead_id:
//   etapa=parcial  al pasar del paso 1 (nombre, email, LinkedIn). Crea la fila con Estado "Incompleto".
//   etapa=completo al enviar el último paso. Completa esa misma fila y pone Estado "Nuevo".
// Si el parcial no llegó, el completo crea la fila igual.
//
// Pegar en el proyecto de Apps Script que hoy responde en:
// https://script.google.com/macros/s/AKfycbzfKjnqztcnC8cF5WB5mo7rkATOneLJby7yx0Nb0IKsfnhcaGU8nz-ubUHK2Sg3hL8d6A/exec
// Ver apps-script/README.md para los pasos (Deploy > Manage deployments > Edit > New version).
//
// Responde siempre JSON: {ok:true} o {ok:false, error:'validation'|'server', fields:[...]}.
// La página solo muestra éxito si recibe ok:true.

var SHEET_ID = '1P2dlXY9NZfhlffl4quieK9W5nbEw1F7vt5OEaBCTpkY'; // "NW Hire Contact Form"
var TAB = 'Hoja 1';
var MAX_LEN = 2000;

// Encabezado de la hoja → nombre del campo del formulario.
// El orden solo importa cuando se crean los encabezados; al escribir se mapea por nombre.
var COLUMNS = [
  ['ID', 'lead_id'],
  ['Fecha', null],
  ['Idioma', 'idioma'],
  ['Nombre', 'nombre'],
  ['Email de trabajo', 'email'],
  ['Empresa', 'empresa'],
  ['Tipo de reclutador', 'tipo'],
  ['País', 'pais'],
  ['LinkedIn', 'linkedin'],
  ['Sitio web', 'sitio'],
  ['Rol principal', 'rol'],
  ['Otros roles', 'otros_roles'],
  ['Nivel de inglés requerido', 'ingles'],
  ['Zona horaria requerida', 'zona'],
  ['Qué tan pronto necesita contratar', 'urgencia'],
  ['Tamaño de equipo', 'equipo'],
  ['Herramientas del equipo', 'herramientas'],
  ['Detalle del rol', 'detalle'],
  ['Acepta términos y privacidad', 'acepta'],
  ['Versión de términos', 'version_terminos'],
  ['Estado', null]
];

var REQUIRED = ['nombre', 'email', 'empresa', 'tipo', 'pais', 'linkedin', 'rol', 'acepta'];
var REQUIRED_PARCIAL = ['nombre', 'email', 'linkedin'];
var LINKEDIN_RE = /^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\/[^\/\s?#]+\/?([?#].*)?$/i;

function doPost(e) {
  try {
    var p = (e && e.parameter) || {};

    // Honeypot: los bots llenan este campo. Respondemos ok sin escribir nada.
    if (clean_(p.website_hp)) return json_({ ok: true });

    var parcial = clean_(p.etapa) === 'parcial';
    var invalid = validate_(p, parcial ? REQUIRED_PARCIAL : REQUIRED);
    if (invalid.length) return json_({ ok: false, error: 'validation', fields: invalid });

    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      var sheet = getSheet_();
      var headers = ensureHeaders(sheet);
      var id = clean_(p.lead_id);
      var rowIndex = id ? findRowById_(sheet, headers, id) : -1;
      var existing = rowIndex > 0 ? sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0] : null;

      // Un parcial que llega tarde nunca pisa una solicitud ya completa
      if (parcial && existing && existing[headers.indexOf('Estado')] !== 'Incompleto') return json_({ ok: true });

      var row = headers.map(function (h, i) {
        if (h === 'Fecha') return existing ? existing[i] : new Date();
        if (h === 'Estado') return parcial ? 'Incompleto' : (existing && existing[i] && existing[i] !== 'Incompleto' ? existing[i] : 'Nuevo');
        var field = fieldFor_(h);
        if (!field) return existing ? existing[i] : ''; // columnas manuales (notas, etc.) se respetan
        var v = clean_(p[field]);
        return v || (existing ? existing[i] : '');
      });

      if (rowIndex > 0) sheet.getRange(rowIndex, 1, 1, headers.length).setValues([row]);
      else sheet.appendRow(row);
    } finally {
      lock.releaseLock();
    }

    if (!parcial) notify_(p);
    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'server' });
  }
}

// Permite verificar el despliegue abriendo la URL /exec en el navegador
function doGet() {
  return json_({ ok: true, status: 'Endpoint activo' });
}

function validate_(p, required) {
  var invalid = [];
  required.forEach(function (f) {
    if (!clean_(p[f])) invalid.push(f);
  });
  var email = clean_(p.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && invalid.indexOf('email') === -1) invalid.push('email');
  if (clean_(p.acepta) && clean_(p.acepta) !== 'yes' && invalid.indexOf('acepta') === -1) invalid.push('acepta');
  var li = clean_(p.linkedin);
  if (li && !LINKEDIN_RE.test(li) && invalid.indexOf('linkedin') === -1) invalid.push('linkedin');
  return invalid;
}

function findRowById_(sheet, headers, id) {
  var col = headers.indexOf('ID') + 1;
  var last = sheet.getLastRow();
  if (!col || last < 2) return -1;
  var ids = sheet.getRange(2, col, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === id) return i + 2;
  }
  return -1;
}

function getSheet_() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(TAB);
  if (!sheet) throw new Error('No existe la pestaña ' + TAB);
  return sheet;
}

// Escribe la fila de encabezados si la fila 1 está vacía, o agrega al final los que falten.
// No borra ni reordena columnas existentes (p. ej. "Presupuesto mensual (USD)" puede quedarse o borrarse a mano).
function ensureHeaders(sheet) {
  sheet = sheet || getSheet_();
  var wanted = COLUMNS.map(function (c) { return c[0]; });
  var lastCol = sheet.getLastColumn();
  var current = lastCol ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
  var hasAny = current.some(function (h) { return h.trim() !== ''; });

  if (!hasAny) {
    sheet.getRange(1, 1, 1, wanted.length).setValues([wanted]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    return wanted;
  }

  var missing = wanted.filter(function (h) { return current.indexOf(h) === -1; });
  if (missing.length) {
    sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
    current = current.concat(missing);
  }
  return current;
}

function fieldFor_(header) {
  for (var i = 0; i < COLUMNS.length; i++) {
    if (COLUMNS[i][0] === header) return COLUMNS[i][1];
  }
  return null;
}

function clean_(v) {
  if (v === undefined || v === null) return '';
  var s = String(v).trim();
  // Evita que el Sheet interprete el valor como fórmula
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s.slice(0, MAX_LEN);
}

function notify_(p) {
  try {
    var to = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL');
    if (!to) return;
    MailApp.sendEmail(to, 'NEWAVE Hire: nueva solicitud de ' + clean_(p.empresa),
      [
        'Nombre: ' + clean_(p.nombre),
        'Email: ' + clean_(p.email),
        'Empresa: ' + clean_(p.empresa),
        'Tipo: ' + clean_(p.tipo),
        'País: ' + clean_(p.pais),
        'LinkedIn: ' + clean_(p.linkedin),
        'Rol: ' + clean_(p.rol)
      ].join('\n'));
  } catch (err) {
    console.error('notify_', err); // El aviso nunca debe tumbar el registro
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Correr a mano desde el editor para probar que escribe en el Sheet.
function testWrite() {
  var res = doPost({ parameter: {
    idioma: 'es', nombre: 'Test Reclutador', email: 'test@empresa.com', empresa: 'Empresa Test',
    tipo: 'Agency recruiter', pais: 'United States', linkedin: 'https://linkedin.com/in/test',
    rol: 'Customer Success', acepta: 'yes', version_terminos: 'pilot-v0',
    lead_id: 'test-' + Date.now(), etapa: 'completo'
  }});
  console.log(res.getContent());
}
