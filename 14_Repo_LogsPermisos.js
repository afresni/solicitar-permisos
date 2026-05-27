/**
 * 14_Repo_LogsPermisos.gs
 * Capa REPO para escritura y consulta de LOGS_PERMISOS.
 * Sin lógica de negocio.
 */

/**
 * Inserta un registro de log en LOGS_PERMISOS.
 *
 * @param {Object} logRecord Registro de log a insertar.
 * @returns {{ok: boolean, rowIndex: number, data: Object}} Resultado de inserción.
 */
function appendLog(logRecord) {
  _logRepo_assertObject_(logRecord, 'logRecord');

  var sheetName = getProjectConfig().SHEETS.LOGS_PERMISOS;
  var sheet = getSheetOrThrow(sheetName);
  var headerMap = getHeaderMap(sheet);

  _logRepo_assertRequiredColumns_(headerMap);

  var prepared = _logRepo_prepareRecord_(logRecord);

  if (_logRepo_existsLogId_(prepared.log_id)) {
    throw new Error('INTEGRITY_ERROR: log_id duplicado -> ' + prepared.log_id);
  }

  var rowIndex = appendObject(sheetName, prepared);
  var insertedRow = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];
  var mapped = rowToObject(insertedRow, headerMap);

  return {
    ok: true,
    rowIndex: rowIndex,
    data: mapped
  };
}

/**
 * Lista logs por id_solicitud.
 *
 * @param {string} idSolicitud ID de solicitud.
 * @returns {Object[]} Lista de logs asociados.
 */
function listBySolicitud(idSolicitud) {
  var safeId = _logRepo_normalizeToken_(idSolicitud);

  if (!safeId) {
    throw new Error('VALIDATION_ERROR: idSolicitud es obligatorio.');
  }

  return _logRepo_listAll_()
    .filter(function(item) {
      return _logRepo_normalizeToken_(item.id_solicitud) === safeId;
    })
    .sort(_logRepo_sortByFechaEventoDesc_);
}

/**
 * Lista logs por actor_email.
 *
 * @param {string} email Email del actor.
 * @returns {Object[]} Lista de logs del actor.
 */
function listByActor(email) {
  var safeEmail = _logRepo_normalizeEmail_(email);

  if (!safeEmail) {
    throw new Error('VALIDATION_ERROR: email es obligatorio.');
  }

  return _logRepo_listAll_()
    .filter(function(item) {
      return _logRepo_normalizeEmail_(item.actor_email) === safeEmail;
    })
    .sort(_logRepo_sortByFechaEventoDesc_);
}

/**
 * Lista todas las filas no vacías de LOGS_PERMISOS.
 *
 * @returns {Object[]} Logs existentes.
 * @private
 */
function _logRepo_listAll_() {
  var ctx = _logRepo_getSheetAndHeader_();
  var sheet = ctx.sheet;
  var headerMap = ctx.headerMap;

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

  return values
    .map(function(rowValues) {
      return rowToObject(rowValues, headerMap);
    })
    .filter(function(row) {
      return _logRepo_normalizeToken_(row.log_id) !== '';
    });
}

/**
 * Obtiene hoja y cabeceras validadas de LOGS_PERMISOS.
 *
 * @returns {{sheet: GoogleAppsScript.Spreadsheet.Sheet, headerMap: Object<string, number>}}
 * @private
 */
function _logRepo_getSheetAndHeader_() {
  var sheetName = getProjectConfig().SHEETS.LOGS_PERMISOS;
  var sheet = getSheetOrThrow(sheetName);
  var headerMap = getHeaderMap(sheet);

  _logRepo_assertRequiredColumns_(headerMap);

  return {
    sheet: sheet,
    headerMap: headerMap
  };
}

/**
 * Prepara registro de log para inserción.
 *
 * @param {Object} source Registro origen.
 * @returns {Object} Registro preparado.
 * @private
 */
function _logRepo_prepareRecord_(source) {
  var record = {};

  Object.keys(source).forEach(function(k) {
    record[k] = source[k];
  });

  if (!_logRepo_normalizeToken_(record.tipo_evento)) {
    throw new Error('VALIDATION_ERROR: tipo_evento es obligatorio.');
  }

  record.tipo_evento = _logRepo_normalizeToken_(record.tipo_evento).toUpperCase();

  if (record.actor_rol) {
    record.actor_rol = _logRepo_normalizeToken_(record.actor_rol).toUpperCase();
  }

  if (!_logRepo_normalizeToken_(record.log_id)) {
    record.log_id = generateLogId();
  }

  if (!record.fecha_evento) {
    record.fecha_evento = new Date();
  }

  return record;
}

/**
 * Comprueba si ya existe un log_id.
 *
 * @param {string} logId ID de log.
 * @returns {boolean} true si existe.
 * @private
 */
function _logRepo_existsLogId_(logId) {
  var safeId = _logRepo_normalizeToken_(logId);
  if (!safeId) return false;

  return _logRepo_listAll_().some(function(item) {
    return _logRepo_normalizeToken_(item.log_id) === safeId;
  });
}

/**
 * Ordena por fecha_evento descendente.
 *
 * @param {Object} a Log A.
 * @param {Object} b Log B.
 * @returns {number} Orden descendente.
 * @private
 */
function _logRepo_sortByFechaEventoDesc_(a, b) {
  return new Date(b.fecha_evento).getTime() - new Date(a.fecha_evento).getTime();
}

/**
 * Valida columnas mínimas requeridas en LOGS_PERMISOS.
 *
 * @param {Object<string, number>} headerMap Mapa de cabeceras.
 * @private
 */
function _logRepo_assertRequiredColumns_(headerMap) {
  var required = [
    'log_id',
    'id_solicitud',
    'fecha_evento',
    'actor_email',
    'actor_rol',
    'tipo_evento'
  ];

  var missing = required.filter(function(col) {
    return !Object.prototype.hasOwnProperty.call(headerMap, col);
  });

  if (missing.length > 0) {
    throw new Error('CONFIG_ERROR: Faltan columnas en LOGS_PERMISOS -> ' + missing.join(', '));
  }
}

/**
 * Valida que un valor sea objeto plano utilizable.
 *
 * @param {*} value Valor a validar.
 * @param {string} name Nombre lógico del parámetro.
 * @private
 */
function _logRepo_assertObject_(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('VALIDATION_ERROR: ' + name + ' inválido.');
  }
}

/**
 * Normaliza token con trim.
 *
 * @param {*} value Valor de entrada.
 * @returns {string} Token normalizado.
 * @private
 */
function _logRepo_normalizeToken_(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}

/**
 * Normaliza email para comparación case-insensitive.
 *
 * @param {*} value Valor de email.
 * @returns {string} Email normalizado.
 * @private
 */
function _logRepo_normalizeEmail_(value) {
  return _logRepo_normalizeToken_(value).toLowerCase();
}