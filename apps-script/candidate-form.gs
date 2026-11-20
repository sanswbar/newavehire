// NEWAVE Hire: formulario de candidatos (newavehire.com/aiready/)
//
// NO desplegar sin revisión. Instrucciones en apps-script/README.md.
//
// Configuración en Script Properties (Configuración del proyecto > Propiedades del script):
//   SHEET_ID      ID del Google Sheet de candidatos.            TODO-CONFIRM-7
//                 El script actual de aiready escribe con getActiveSpreadsheet(), probablemente en
//                 el sheet "Registros AI Ready" (173d0x2dHQzyfE-9c0nNL2AryjIZ6O8MtQUysVISKw4I).
//   TAB           Nombre de la pestaña. Si se deja vacío, usa la primera.  TODO-CONFIRM-7
//                 (mantener "Registros AI Ready" o crear una pestaña nueva)
//   CV_FOLDER_ID  ID de la carpeta PRIVADA de Drive para los CV.           TODO-CONFIRM-7
//   NOTIFY_EMAIL  Opcional. Si tiene valor, manda un aviso por correo a cada registro.

var MAX_LEN = 2000;
var MAX_CV_BYTES = 5 * 1024 * 1024;
var ESTADO_INICIAL = 'Pendiente de revisión';

var HEADERS = [
  'Fecha',
  'Nombre',
  'Email',
  'WhatsApp',
  'País',
  'LinkedIn',
  'Rol que busca',
  'Años de experiencia',
  'Nivel de inglés',
  'Qué construye con IA',
  'Link demo',
  'Experiencia en tech',
  'CV archivo',
  'CV link',
  'Acepta aviso',
  'Acepta compartir con reclutadores',
  'Acepta WhatsApp',
  'Versión del aviso',
  'Estado'
];

// Encabezado del Sheet -> nombre del parámetro del formulario
var FIELD_BY_HEADER = {
  'Nombre': 'nombre',
  'Email': 'email',
  'WhatsApp': 'whatsapp',
  'País': 'pais',
  'LinkedIn': 'linkedin',
  'Rol que busca': 'area',
  'Años de experiencia': 'anios',
  'Nivel de inglés': 'ingles',
  'Qué construye con IA': 'building',
  'Link demo': 'demo',
  'Experiencia en tech': 'experiencia',
  'CV link': 'cv_link',
  'Acepta aviso': 'acepta_aviso',
  'Acepta compartir con reclutadores': 'acepta_compartir',
  'Acepta WhatsApp': 'acepta_whatsapp',
  'Versión del aviso': 'version_aviso'
};

function config_() {
  var props = PropertiesService.getScriptProperties();
  return {
    sheetId: props.getProperty('SHEET_ID') || '',
    tab: props.getProperty('TAB') || '',
    cvFolderId: props.getProperty('CV_FOLDER_ID') || '',
    notifyEmail: props.getProperty('NOTIFY_EMAIL') || ''
  };
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function clean_(value) {
  return String(value == null ? '' : value).trim().slice(0, MAX_LEN);
}

function getSheet_(cfg) {
  if (!cfg.sheetId) throw new Error('Falta la propiedad SHEET_ID');
  var ss = SpreadsheetApp.openById(cfg.sheetId);
  var sheet = cfg.tab ? ss.getSheetByName(cfg.tab) : ss.getSheets()[0];
  if (!sheet) throw new Error('No existe la pestaña ' + cfg.tab);
  return sheet;
}

// Escribe los encabezados si la fila 1 está vacía, o agrega al final los que falten.
// Devuelve la fila de encabezados actual.
function ensureHeaders(sheet) {
  var lastCol = sheet.getLastColumn();
  var current = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(String) : [];
  var isEmpty = current.every(function (h) { return h.trim() === ''; });

  if (isEmpty) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    return HEADERS.slice();
  }

  var missing = HEADERS.filter(function (h) { return current.indexOf(h) === -1; });
  if (missing.length) {
    sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
    current = current.concat(missing);
  }
  return current;
}

function validate_(p) {
  var fields = [];
  ['nombre', 'whatsapp', 'linkedin', 'pais', 'area', 'anios', 'ingles'].forEach(function (k) {
    if (!p[k]) fields.push(k);
  });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) fields.push('email');
  if (p.anios && !/^\d{1,2}$/.test(p.anios)) fields.push('anios');
  if (!p.cv_base64 && !p.cv_link) fields.push('cv');
  if (p.acepta_aviso !== 'yes') fields.push('acepta_aviso');
  if (p.acepta_compartir !== 'yes') fields.push('acepta_compartir');
  return fields;
}

// Guarda el PDF en la carpeta privada. No cambia permisos de compartir.
function saveCv_(cfg, base64, nombre) {
  if (!cfg.cvFolderId) throw new Error('Falta la propiedad CV_FOLDER_ID');
  var bytes = Utilities.base64Decode(base64);
  if (bytes.length > MAX_CV_BYTES) return { error: 'cv' };
  var fecha = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  var safeName = nombre.replace(/[^\wÀ-ÿ ]+/g, '').trim().replace(/\s+/g, '_') || 'candidato';
  var blob = Utilities.newBlob(bytes, 'application/pdf', fecha + '_' + safeName + '_CV.pdf');
  var file = DriveApp.getFolderById(cfg.cvFolderId).createFile(blob);
  return { url: file.getUrl() };
}

function findRowByEmail_(sheet, headers, email) {
  var col = headers.indexOf('Email');
  var lastRow = sheet.getLastRow();
  if (col === -1 || lastRow < 2) return -1;
  var values = sheet.getRange(2, col + 1, lastRow - 1, 1).getValues();
  var target = email.toLowerCase();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim().toLowerCase() === target) return i + 2;
  }
  return -1;
}

function doPost(e) {
  try {
    var raw = (e && e.parameter) || {};

    // Honeypot: un bot llenó el campo oculto. Responder ok sin escribir nada.
    if (raw.website_hp && String(raw.website_hp).trim() !== '') return json_({ ok: true });

    var p = {};
    Object.keys(raw).forEach(function (k) {
      p[k] = k === 'cv_base64' ? String(raw[k] || '') : clean_(raw[k]);
    });
    p.email = (p.email || '').toLowerCase();

    var invalid = validate_(p);
    if (p.cv_base64 && p.cv_tipo !== 'application/pdf') invalid.push('cv');
    if (invalid.length) return json_({ ok: false, error: 'validation', fields: invalid });

    var cfg = config_();

    var cvUrl = '';
    if (p.cv_base64) {
      var saved = saveCv_(cfg, p.cv_base64, p.nombre);
      if (saved.error) return json_({ ok: false, error: 'validation', fields: ['cv'] });
      cvUrl = saved.url;
    }

    var lock = LockService.getScriptLock();
    lock.waitLock(20000);
    var updated = false;
    try {
      var sheet = getSheet_(cfg);
      var headers = ensureHeaders(sheet);
      var rowIndex = findRowByEmail_(sheet, headers, p.email);
      var existing = rowIndex > 0 ? sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0] : null;

      var row = headers.map(function (h, i) {
        if (h === 'Fecha') return new Date();
        if (h === 'CV archivo') return cvUrl || (existing ? existing[i] : '');
        if (h === 'Estado') return existing && existing[i] ? existing[i] : ESTADO_INICIAL;
        var key = FIELD_BY_HEADER[h];
        if (key) return p[key] || '';
        return existing ? existing[i] : ''; // columnas ajenas al formulario: se respetan
      });

      if (rowIndex > 0) {
        sheet.getRange(rowIndex, 1, 1, headers.length).setValues([row]);
        updated = true;
      } else {
        sheet.appendRow(row);
      }
    } finally {
      lock.releaseLock();
    }

    if (cfg.notifyEmail) {
      try {
        MailApp.sendEmail(cfg.notifyEmail,
          'NEWAVE Hire: ' + (updated ? 'perfil actualizado' : 'nuevo perfil') + ' de ' + p.nombre,
          p.nombre + ' (' + p.email + ')\nRol: ' + p.area + '\nInglés: ' + p.ingles + '\nPaís: ' + p.pais);
      } catch (mailErr) {
        console.error(mailErr);
      }
    }

    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'server' });
  }
}

// Verificación del despliegue: abrir la URL /exec en el navegador.
function doGet() {
  return json_({ ok: true, mensaje: 'Endpoint activo' });
}

// Prueba manual desde el editor: escribe (o actualiza) una fila de prueba sin CV.
function testWrite() {
  var res = doPost({
    parameter: {
      nombre: 'Test Candidato',
      email: 'test.candidato@example.com',
      whatsapp: '+525512345678',
      pais: 'México',
      linkedin: 'https://linkedin.com/in/test',
      area: 'Customer Success',
      anios: '3',
      ingles: 'B2+',
      building: 'Automatizaciones con n8n y Claude',
      demo: '',
      experiencia: 'transitioning',
      cv_link: 'https://drive.google.com/test',
      acepta_aviso: 'yes',
      acepta_compartir: 'yes',
      acepta_whatsapp: '',
      version_aviso: 'privacy-v0-draft',
      website_hp: ''
    }
  });
  console.log(res.getContent());
}
