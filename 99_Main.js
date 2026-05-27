/**
 * 99_Main.gs
 * Punto de entrada general del backend Apps Script.
 * Sin lógica de negocio directa.
 */

function doGet(e) {
  try {
    var action = '';
    if (e && e.parameter && e.parameter.action) {
      action = String(e.parameter.action).trim();
    }

    // Sin action => interfaz principal HTML
    if (!action) {
      return HtmlService
        .createTemplateFromFile('100_Index')
        .evaluate()
        .setTitle('Gestión de permisos')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    // Resolver directamente desde email
    if (action === 'resolver') {
      return routeResolverFromEmail_(e.parameter || {});
    }

    // Abrir panel admin desde email
    if (action === 'admin') {
      return routeAdminFromEmail_(e.parameter || {});
    }

    // Con action => comportamiento JSON actual
    var payload = {};
    var request = {
      action: action,
      payload: payload
    };

    var result = _main_dispatch_(request);
    return _main_jsonResponse_(result);

  } catch (err) {
    return _main_jsonResponse_(_main_handleError_(err));
  }
}

function doPost(e) {
  try {
    var body = _main_parsePostBody_(e);
    var action = body && body.action ? String(body.action).trim() : '';

    if (!action) {
      throw new Error('VALIDATION_ERROR: action es obligatorio.');
    }

    var result = _main_dispatch_(body);
    return _main_jsonResponse_(result);

  } catch (err) {
    return _main_jsonResponse_(_main_handleError_(err));
  }
}

function healthcheck() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tz = (ss && ss.getSpreadsheetTimeZone) ? ss.getSpreadsheetTimeZone() : Session.getScriptTimeZone();

  return {
    ok: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      timezone: tz || 'UTC'
    }
  };
}

function _main_dispatch_(req) {
  if (!req || typeof req !== 'object' || Array.isArray(req)) {
    throw new Error('VALIDATION_ERROR: request inválido.');
  }

  var action = String(req.action === null || req.action === undefined ? '' : req.action).trim();

  if (!action) {
    throw new Error('VALIDATION_ERROR: action es obligatorio.');
  }

  if (action === 'crearSolicitud') {
    return apiCrearSolicitud(req);
  }

  if (action === 'misSolicitudes') {
    return apiGetMisSolicitudes(req);
  }

  if (action === 'catalogoPermisos') {
    return apiGetCatalogoPermisos(req);
  }

  if (action === 'resolverSolicitud') {
    return apiResolverSolicitud(req);
  }

  if (action === 'solicitudesPendientes') {
    return apiGetSolicitudesPendientes(req);
  }

  if (action === 'detalleSolicitud') {
    return apiGetDetalleSolicitud(req);
  }

  if (action === 'healthcheck') {
    return healthcheck();
  }

  throw new Error('NOT_FOUND: action no permitida.');
}

function routeResolverFromEmail_(params) {
  var idSolicitud = String(params.id || '').trim();
  var decision = String(params.decision || '').trim().toUpperCase();
  var token = String(params.token || '').trim();

  if (!idSolicitud) {
    throw new Error('VALIDATION_ERROR: id obligatorio.');
  }

  if (!decision) {
    throw new Error('VALIDATION_ERROR: decision obligatoria.');
  }

  if (!token) {
    throw new Error('VALIDATION_ERROR: token obligatorio.');
  }

  return HtmlService
    .createHtmlOutput(
      '<h2>Resolución rápida</h2>' +
      '<p>Solicitud: ' + _main_escapeHtml_(idSolicitud) + '</p>' +
      '<p>Decisión: ' + _main_escapeHtml_(decision) + '</p>' +
      '<p>Próximamente se ejecutará la resolución automática.</p>'
    )
    .setTitle('Resolución rápida');
}

function routeAdminFromEmail_(params) {
  var idSolicitud = String(params.id || '').trim();

  return HtmlService
    .createTemplateFromFile('100_Index')
    .evaluate()
    .setTitle(idSolicitud ? 'Administración permisos - ' + idSolicitud : 'Administración permisos')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function _main_parsePostBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('VALIDATION_ERROR: body JSON requerido.');
  }

  var raw = String(e.postData.contents || '').trim();

  if (!raw) {
    throw new Error('VALIDATION_ERROR: body JSON vacío.');
  }

  try {
    var parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('VALIDATION_ERROR: body JSON inválido.');
    }

    return parsed;

  } catch (err) {
    if (String(err.message || '').indexOf('VALIDATION_ERROR:') === 0) {
      throw err;
    }

    throw new Error('VALIDATION_ERROR: body JSON inválido.');
  }
}

function _main_jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function _main_handleError_(err) {
  var allowedCodes = {
    AUTH_REQUIRED: true,
    FORBIDDEN: true,
    VALIDATION_ERROR: true,
    NOT_FOUND: true,
    CONFLICT: true,
    CONFIG_ERROR: true,
    INTEGRITY_ERROR: true,
    EXTERNAL_ERROR: true,
    UNKNOWN_ERROR: true
  };

  var rawMessage = '';

  if (typeof err === 'string') {
    rawMessage = err;
  } else if (err && err.message) {
    rawMessage = String(err.message);
  } else {
    rawMessage = 'UNKNOWN_ERROR: Error desconocido.';
  }

  var code = 'UNKNOWN_ERROR';
  var message = rawMessage;

  var m = rawMessage.match(/^([A-Z_]+)\s*:\s*(.*)$/);

  if (m) {
    var candidate = m[1];

    if (allowedCodes[candidate]) {
      code = candidate;
      message = m[2] || rawMessage;
    }
  }

  var errorObj = {
    code: code,
    message: message
  };

  try {
    var cfg = (typeof getProjectConfig === 'function') ? getProjectConfig() : {};
    var debugStack = !!(cfg && cfg.ENABLE_DEBUG_STACK === true);

    if (debugStack && err && err.stack) {
      errorObj.details = {
        stack: String(err.stack)
      };
    }
  } catch (ignoreCfg) {}

  return {
    ok: false,
    error: errorObj
  };
}

function _main_escapeHtml_(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}