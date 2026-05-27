/**
 * 10_Repo_Professorat.gs
 * Repositorio de lectura para PROFESSORAT desde fuente externa.
 * Fuente principal: Spreadsheet externo configurado en APP_CONFIG.EXTERNAL_SOURCES.
 */

/**
 * Busca un profesor por email institucional.
 *
 * @param {string} email Email institucional.
 * @returns {Object|null} Profesor mapeado o null.
 * @throws {Error} VALIDATION_ERROR / CONFIG_ERROR / EXTERNAL_ERROR
 */
function findByEmail(email) {
  var safeEmail = _profRepo_normalizeEmail_(email);

  if (!safeEmail) {
    throw new Error('VALIDATION_ERROR: email es obligatorio.');
  }

  var all = _profRepo_listAllFromExternal_();

  for (var i = 0; i < all.length; i++) {
    if (_profRepo_normalizeEmail_(all[i].email_institucional) === safeEmail) {
      return all[i];
    }
  }

  return null;
}

/**
 * Comprueba si un profesor existe y está activo.
 *
 * @param {string} email Email institucional.
 * @returns {boolean} true si existe y está activo.
 */
function isActiveByEmail(email) {
  var profesor = findByEmail(email);
  return !!(profesor && profesor.activo === true);
}

/**
 * Lista profesores activos por etapa.
 * Soporta etapas múltiples separadas por "/".
 *
 * @param {string} etapa Etapa.
 * @returns {Object[]} Profesores activos de la etapa.
 * @throws {Error} VALIDATION_ERROR / CONFIG_ERROR / EXTERNAL_ERROR
 */
function listByEtapa(etapa) {
  var safeEtapa = _profRepo_safeString_(etapa).toUpperCase();

  if (!safeEtapa) {
    throw new Error('VALIDATION_ERROR: etapa es obligatoria.');
  }

  var all = _profRepo_listAllFromExternal_();

  return all.filter(function(p) {
    var etapas = _profRepo_safeString_(p.etapa)
      .toUpperCase()
      .split('/')
      .map(function(x) {
        return x.trim();
      })
      .filter(function(x) {
        return x !== '';
      });

    return p.activo === true && etapas.indexOf(safeEtapa) !== -1;
  });
}

/**
 * Devuelve todos los profesores mapeados desde la fuente externa.
 *
 * @returns {Object[]} Todos los profesores.
 * @throws {Error} CONFIG_ERROR / EXTERNAL_ERROR
 */
function listAll() {
  return _profRepo_listAllFromExternal_();
}

/**
 * Devuelve todos los profesores activos.
 *
 * @returns {Object[]} Profesores activos.
 * @throws {Error} CONFIG_ERROR / EXTERNAL_ERROR
 */
function listProfessoratActivos() {
  return listAll().filter(function(p) {
    return p.activo === true;
  });
}

/**
 * Mantiene contrato existente de upsert.
 * En modo fuente externa, no se escribe sobre origen remoto.
 *
 * @param {Object} record Registro de profesor.
 * @throws {Error} CONFIG_ERROR siempre en esta implementación.
 */
function upsertProfesor(record) {
  void record;
  throw new Error('CONFIG_ERROR: upsertProfesor no disponible con fuente externa en solo lectura.');
}

/**
 * Carga y mapea todos los registros del spreadsheet externo.
 * Usa caché durante 5 minutos para evitar lecturas repetidas.
 *
 * @returns {Object[]} Registros mapeados.
 * @throws {Error} CONFIG_ERROR / EXTERNAL_ERROR
 * @private
 */
function _profRepo_listAllFromExternal_() {
  var cacheKey = 'PROFESSORAT_EXTERNAL_V1';
  var cache = CacheService.getScriptCache();

  try {
    var cached = cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (eCacheRead) {}

  var ctx = _profRepo_getExternalSheet_();
  var sheet = ctx.sheet;
  var headerMap = ctx.headerMap;

  var lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  var values = sheet
    .getRange(2, 1, lastRow - 1, sheet.getLastColumn())
    .getValues();

  var out = [];

  for (var i = 0; i < values.length; i++) {
    var rowObj = rowToObject(values[i], headerMap);
    var mapped = _profRepo_mapExternalRow_(rowObj);

    if (mapped) {
      out.push(mapped);
    }
  }

  try {
    cache.put(cacheKey, JSON.stringify(out), 300);
  } catch (eCacheWrite) {}

  return out;
}

/**
 * Abre hoja externa configurada en APP_CONFIG.EXTERNAL_SOURCES.
 *
 * @returns {{sheet: GoogleAppsScript.Spreadsheet.Sheet, headerMap: Object<string, number>}}
 * @throws {Error} CONFIG_ERROR / EXTERNAL_ERROR / NOT_FOUND
 * @private
 */
function _profRepo_getExternalSheet_() {
  var cfg = getProjectConfig();
  var src = cfg && cfg.EXTERNAL_SOURCES ? cfg.EXTERNAL_SOURCES : null;

  if (!src || !src.PROFESSORAT_SPREADSHEET_ID) {
    throw new Error('CONFIG_ERROR: EXTERNAL_SOURCES.PROFESSORAT_SPREADSHEET_ID no configurado.');
  }

  if (!src.PROFESSORAT_SHEET_NAME) {
    throw new Error('CONFIG_ERROR: EXTERNAL_SOURCES.PROFESSORAT_SHEET_NAME no configurado.');
  }

  var spreadsheetId = _profRepo_safeString_(src.PROFESSORAT_SPREADSHEET_ID);
  var sheetName = _profRepo_safeString_(src.PROFESSORAT_SHEET_NAME);

  var ss;

  try {
    ss = SpreadsheetApp.openById(spreadsheetId);
  } catch (eOpen) {
    throw new Error(
      'EXTERNAL_ERROR: no se pudo abrir spreadsheet externo PROFESSORAT. ' +
      (eOpen && eOpen.message ? eOpen.message : String(eOpen))
    );
  }

  var sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error('NOT_FOUND: hoja externa de PROFESSORAT no encontrada.');
  }

  var headerMap = getHeaderMap(sheet);
  _profRepo_assertExternalHeaders_(headerMap);

  return {
    sheet: sheet,
    headerMap: headerMap
  };
}

/**
 * Mapea fila externa a contrato interno.
 *
 * @param {Object} row Fila externa.
 * @returns {Object|null} Registro interno o null.
 * @private
 */
function _profRepo_mapExternalRow_(row) {
  if (!row || typeof row !== 'object') {
    return null;
  }

  var email = _profRepo_normalizeEmail_(row.Email);

  if (!email) {
    return null;
  }

  return {
    profesor_id: _profRepo_safeString_(row.ID_PROF),
    email_institucional: email,
    nombre: _profRepo_safeString_(row.Nom),
    apellidos: _profRepo_safeString_(row.Llinatges),
    dni: '',
    etapa: _profRepo_safeString_(row.Etapa),
    puesto_trabajo: _profRepo_safeString_(row.Rol),
    departamento_o_unidad: _profRepo_safeString_(row.Departament),
    activo: _profRepo_normalizeActivo_(row.Actiu),
    fecha_alta: '',
    fecha_baja: '',
    creado_el: '',
    actualizado_el: ''
  };
}

/**
 * Valida cabeceras mínimas externas.
 *
 * @param {Object<string, number>} headerMap Cabeceras.
 * @throws {Error} CONFIG_ERROR
 * @private
 */
function _profRepo_assertExternalHeaders_(headerMap) {
  var required = [
    'ID_PROF',
    'Nom',
    'Llinatges',
    'Email',
    'Etapa',
    'Departament',
    'Rol',
    'Actiu'
  ];

  var missing = required.filter(function(c) {
    return !Object.prototype.hasOwnProperty.call(headerMap, c);
  });

  if (missing.length) {
    throw new Error(
      'CONFIG_ERROR: faltan columnas en fuente externa PROFESSORAT -> ' +
      missing.join(', ')
    );
  }
}

/**
 * Normaliza email.
 *
 * @param {*} value Valor de email.
 * @returns {string} Email normalizado.
 * @private
 */
function _profRepo_normalizeEmail_(value) {
  return _profRepo_safeString_(value).toLowerCase();
}

/**
 * Normaliza campo Actiu externo.
 * "Sí" / "Si" / "SI" => true.
 *
 * @param {*} value Valor externo.
 * @returns {boolean} Activo boolean.
 * @private
 */
function _profRepo_normalizeActivo_(value) {
  var v = _profRepo_safeString_(value).toLowerCase();

  return v === 'sí' ||
    v === 'si' ||
    v === 'true' ||
    v === '1';
}

/**
 * Convierte a string seguro.
 *
 * @param {*} value Valor.
 * @returns {string} String trim.
 * @private
 */
function _profRepo_safeString_(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}