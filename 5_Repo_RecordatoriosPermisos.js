/**
 * 15_Repo_RecordatoriosPermisos.gs
 * Repositorio de RECORDATORIOS_PERMISOS.
 * Sin lógica de negocio.
 */

/**
 * Crea un recordatorio en la hoja RECORDATORIOS_PERMISOS.
 *
 * @param {Object} recordatorio Registro a insertar.
 * @returns {{ok:boolean,rowIndex:number,data:Object}} Resultado de inserción.
 * @throws {Error} VALIDATION_ERROR / CONFIG_ERROR / INTEGRITY_ERROR
 */
function createRecordatorio(recordatorio) {
  var input = recordatorio || {};

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('VALIDATION_ERROR: recordatorio inválido.');
  }

  _repoRecordatorios_assertRequiredFields_(input, [
    'recordatorio_id',
    'id_solicitud'
  ]);

  input.recordatorio_id = _repoRecordatorios_safeString_(input.recordatorio_id).toUpperCase();
  input.id_solicitud = _repoRecordatorios_safeString_(input.id_solicitud).toUpperCase();

  if (_repoRecordatorios_isEmpty_(input.enviado)) {
    input.enviado = 'NO';
  }

  if (_repoRecordatorios_isEmpty_(input.activo)) {
    input.activo = 'SI';
  }

  if (_repoRecordatorios_isEmpty_(input.intentos_envio)) {
    input.intentos_envio = 0;
  }

  if (_repoRecordatorios_isEmpty_(input.creado_el)) {
    input.creado_el = nowDate();
  }

  if (_repoRecordatorios_isEmpty_(input.actualizado_el)) {
    input.actualizado_el = nowDate();
  }

  var existing = findRecordatorioById(input.recordatorio_id);

  if (existing) {
    throw new Error('INTEGRITY_ERROR: recordatorio_id duplicado.');
  }

  var sheetName = APP_CONFIG.SHEETS.RECORDATORIOS_PERMISOS;
  var rowIndex = appendObject(sheetName, input);

  return {
    ok: true,
    rowIndex: rowIndex,
    data: findRecordatorioById(input.recordatorio_id)
  };
}

/**
 * Actualiza un recordatorio por su ID.
 *
 * @param {string} recordatorioId ID del recordatorio.
 * @param {Object} patch Campos a actualizar.
 * @returns {{ok:boolean,rowIndex:number,data:Object}} Resultado de actualización.
 * @throws {Error} VALIDATION_ERROR / NOT_FOUND / CONFIG_ERROR
 */
function updateRecordatorio(recordatorioId, patch) {
  var safeId = _repoRecordatorios_safeString_(recordatorioId).toUpperCase();

  if (!safeId) {
    throw new Error('VALIDATION_ERROR: recordatorioId es obligatorio.');
  }

  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new Error('VALIDATION_ERROR: patch inválido.');
  }

  patch.actualizado_el = nowDate();

  var match = _repoRecordatorios_findRowIndexById_(safeId);

  if (match < 0) {
    throw new Error('NOT_FOUND: recordatorio no encontrado.');
  }

  updateRowByIndex(APP_CONFIG.SHEETS.RECORDATORIOS_PERMISOS, match, patch);

  return {
    ok: true,
    rowIndex: match,
    data: findRecordatorioById(safeId)
  };
}

/**
 * Busca un recordatorio por ID.
 *
 * @param {string} recordatorioId ID del recordatorio.
 * @returns {Object|null} Recordatorio o null si no existe.
 * @throws {Error} VALIDATION_ERROR / CONFIG_ERROR / INTEGRITY_ERROR
 */
function findRecordatorioById(recordatorioId) {
  var safeId = _repoRecordatorios_safeString_(recordatorioId).toUpperCase();

  if (!safeId) {
    throw new Error('VALIDATION_ERROR: recordatorioId es obligatorio.');
  }

  var ctx = _repoRecordatorios_getSheetContext_();
  var sheet = ctx.sheet;
  var headerMap = ctx.headerMap;

  var lastRow = sheet.getLastRow();

  if (lastRow < 2) return null;

  var values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var matches = [];

  values.forEach(function(row, idx) {
    var obj = rowToObject(row, headerMap);
    var rowId = _repoRecordatorios_safeString_(obj.recordatorio_id).toUpperCase();

    if (rowId === safeId) {
      matches.push({
        rowIndex: idx + 2,
        data: obj
      });
    }
  });

  if (matches.length > 1) {
    throw new Error('INTEGRITY_ERROR: recordatorio_id duplicado en hoja.');
  }

  return matches.length === 1 ? matches[0].data : null;
}

/**
 * Lista recordatorios pendientes.
 *
 * Criterio:
 * - enviado != SI
 * - activo == SI
 *
 * @returns {Object[]} Lista de recordatorios pendientes.
 * @throws {Error} CONFIG_ERROR
 */
function listPendientes() {
  var all = _repoRecordatorios_listAll_();

  return all.filter(function(item) {
    var enviado = _repoRecordatorios_safeString_(item.enviado).toUpperCase();
    var activo = _repoRecordatorios_safeString_(item.activo).toUpperCase();

    return enviado !== 'SI' && activo === 'SI';
  });
}

/**
 * Lista recordatorios por ID de solicitud.
 *
 * @param {string} idSolicitud ID de solicitud.
 * @returns {Object[]} Lista asociada a la solicitud.
 * @throws {Error} VALIDATION_ERROR / CONFIG_ERROR
 */
function listBySolicitud(idSolicitud) {
  var safeIdSolicitud = _repoRecordatorios_safeString_(idSolicitud).toUpperCase();

  if (!safeIdSolicitud) {
    throw new Error('VALIDATION_ERROR: idSolicitud es obligatorio.');
  }

  var all = _repoRecordatorios_listAll_();

  return all.filter(function(item) {
    return _repoRecordatorios_safeString_(item.id_solicitud).toUpperCase() === safeIdSolicitud;
  });
}

/**
 * Obtiene contexto técnico de hoja y cabecera.
 *
 * @returns {{sheet:GoogleAppsScript.Spreadsheet.Sheet,headerMap:Object<string,number>}}
 * @throws {Error} CONFIG_ERROR
 * @private
 */
function _repoRecordatorios_getSheetContext_() {
  var sheetName = APP_CONFIG.SHEETS.RECORDATORIOS_PERMISOS;
  var sheet = getSheetOrThrow(sheetName);
  var headerMap = getHeaderMap(sheet);

  _repoRecordatorios_assertHeaders_(headerMap);

  return {
    sheet: sheet,
    headerMap: headerMap
  };
}

/**
 * Lista todos los registros de la hoja mapeados a objeto.
 *
 * @returns {Object[]} Registros.
 * @private
 */
function _repoRecordatorios_listAll_() {
  var ctx = _repoRecordatorios_getSheetContext_();
  var sheet = ctx.sheet;
  var headerMap = ctx.headerMap;

  var lastRow = sheet.getLastRow();

  if (lastRow < 2) return [];

  var values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

  return values
    .map(function(row) {
      return rowToObject(row, headerMap);
    })
    .filter(function(obj) {
      return !_repoRecordatorios_isEmpty_(obj.recordatorio_id);
    });
}

/**
 * Busca índice de fila por recordatorio_id.
 *
 * @param {string} recordatorioId ID a buscar.
 * @returns {number} Índice de fila (1-based) o -1.
 * @throws {Error} INTEGRITY_ERROR si hay duplicados.
 * @private
 */
function _repoRecordatorios_findRowIndexById_(recordatorioId) {
  var safeId = _repoRecordatorios_safeString_(recordatorioId).toUpperCase();
  var ctx = _repoRecordatorios_getSheetContext_();
  var sheet = ctx.sheet;
  var headerMap = ctx.headerMap;

  var lastRow = sheet.getLastRow();

  if (lastRow < 2) return -1;

  var col = headerMap.recordatorio_id;
  var values = sheet.getRange(2, col, lastRow - 1, 1).getValues();
  var matches = [];

  values.forEach(function(v, idx) {
    if (_repoRecordatorios_safeString_(v[0]).toUpperCase() === safeId) {
      matches.push(idx + 2);
    }
  });

  if (matches.length > 1) {
    throw new Error('INTEGRITY_ERROR: recordatorio_id duplicado en hoja.');
  }

  return matches.length === 1 ? matches[0] : -1;
}

/**
 * Verifica columnas mínimas requeridas.
 *
 * @param {Object<string,number>} headerMap Mapa de cabeceras.
 * @throws {Error} CONFIG_ERROR
 * @private
 */
function _repoRecordatorios_assertHeaders_(headerMap) {
  var required = [
    'recordatorio_id',
    'id_solicitud',
    'enviado',
    'activo'
  ];

  var missing = required.filter(function(col) {
    return !Object.prototype.hasOwnProperty.call(headerMap, col);
  });

  if (missing.length) {
    throw new Error(
      'CONFIG_ERROR: faltan columnas en RECORDATORIOS_PERMISOS -> ' + missing.join(', ')
    );
  }
}

/**
 * Valida campos obligatorios en objeto.
 *
 * @param {Object} obj Objeto a validar.
 * @param {string[]} fields Campos obligatorios.
 * @throws {Error} VALIDATION_ERROR
 * @private
 */
function _repoRecordatorios_assertRequiredFields_(obj, fields) {
  var missing = (fields || []).filter(function(f) {
    return _repoRecordatorios_isEmpty_(obj[f]);
  });

  if (missing.length) {
    throw new Error(
      'VALIDATION_ERROR: campos obligatorios faltantes -> ' + missing.join(', ')
    );
  }
}

/**
 * Convierte valor a string seguro con trim.
 *
 * @param {*} value Valor de entrada.
 * @returns {string} String normalizado.
 * @private
 */
function _repoRecordatorios_safeString_(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}

/**
 * Evalúa vacío técnico.
 *
 * @param {*} value Valor.
 * @returns {boolean} true si vacío.
 * @private
 */
function _repoRecordatorios_isEmpty_(value) {
  return _repoRecordatorios_safeString_(value) === '';
}
