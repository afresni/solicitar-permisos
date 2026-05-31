/**
 * 11_Repo_ConfigPermisos.gs
 * Repositorio de CONFIG_PERMISOS.
 * Sin lógica de negocio.
 */

/**
 * Lista permisos activos.
 *
 * @returns {Object[]} Lista de configuraciones activas.
 * @throws {Error} CONFIG_ERROR
 */
function listActivos() {
  return _listConfigPermisosRows_()
    .map(_mapPermisoConfigRow_)
    .filter(function(item) {
      return item.activo === true;
    });
}

/**
 * Busca configuración activa por permiso_key.
 *
 * @param {string} permisoKey Clave del permiso.
 * @returns {Object|null} Configuración activa o null.
 * @throws {Error} VALIDATION_ERROR / INTEGRITY_ERROR / CONFIG_ERROR
 */
function findByPermisoKey(permisoKey) {
  var safeKey = _safePermisoConfigString_(permisoKey).toLowerCase();

  if (!safeKey) {
    throw new Error('VALIDATION_ERROR: permisoKey es obligatorio.');
  }

  var found = _listConfigPermisosRows_()
    .map(_mapPermisoConfigRow_)
    .filter(function(item) {
      return item.activo === true &&
        _safePermisoConfigString_(item.permiso_key).toLowerCase() === safeKey;
    });

  if (found.length > 1) {
    throw new Error('INTEGRITY_ERROR: permiso_key activo duplicado en CONFIG_PERMISOS.');
  }

  return found.length === 1 ? found[0] : null;
}

/**
 * Lista configuraciones activas por categoría.
 *
 * @param {string} categoria Categoría de permiso.
 * @returns {Object[]} Lista filtrada.
 * @throws {Error} VALIDATION_ERROR / CONFIG_ERROR
 */
function listByCategoria(categoria) {
  var safeCategoria = _safePermisoConfigString_(categoria).toLowerCase();

  if (!safeCategoria) {
    throw new Error('VALIDATION_ERROR: categoria es obligatoria.');
  }

  return _listConfigPermisosRows_()
    .map(_mapPermisoConfigRow_)
    .filter(function(item) {
      return item.activo === true &&
        _safePermisoConfigString_(item.categoria_permiso).toLowerCase() === safeCategoria;
    });
}

/**
 * Lee filas de CONFIG_PERMISOS como objetos.
 *
 * @returns {Object[]} Filas mapeadas por cabecera.
 * @throws {Error} CONFIG_ERROR
 * @private
 */
function _listConfigPermisosRows_() {
  var sheetName = APP_CONFIG.SHEETS.CONFIG_PERMISOS;
  var sheet = getSheetOrThrow(sheetName);
  var headerMap = getHeaderMap(sheet);

  _assertRequiredColumnsConfigPermisos_(headerMap);

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  return sheet
    .getRange(2, 1, lastRow - 1, sheet.getLastColumn())
    .getValues()
    .map(function(row) {
      return rowToObject(row, headerMap);
    });
}

/**
 * Normaliza una fila de CONFIG_PERMISOS.
 *
 * @param {Object} obj Fila original.
 * @returns {Object} Fila sanitizada.
 * @private
 */
function _mapPermisoConfigRow_(obj) {
  obj = obj || {};
  obj.activo = _normalizeBooleanPermisos_(obj.activo);
  obj = _sanitizePermisoConfigRow_(obj);
  return obj;
}

/**
 * Normaliza booleanos de CONFIG_PERMISOS.
 *
 * @param {*} value Valor.
 * @returns {boolean} Boolean normalizado.
 * @private
 */
function _normalizeBooleanPermisos_(value) {
  if (value === true || value === false) return value;

  var text = _safePermisoConfigString_(value).toUpperCase();
  return text === 'SI' || text === 'SÍ' || text === 'TRUE' || text === '1';
}

/**
 * Convierte la fila en objeto plano serializable por HtmlService.
 *
 * @param {Object} obj Objeto original.
 * @returns {Object} Objeto plano.
 * @private
 */
function _sanitizePermisoConfigRow_(obj) {
  var out = {};
  var keys = Object.keys(obj || {});

  keys.forEach(function(key) {
    var value = obj[key];

    if (value === undefined || value === null) {
      out[key] = '';
      return;
    }

    if (Object.prototype.toString.call(value) === '[object Date]') {
      out[key] = isNaN(value.getTime()) ? '' : value.toISOString();
      return;
    }

    if (typeof value === 'boolean') {
      out[key] = value;
      return;
    }

    if (typeof value === 'number') {
      out[key] = Number(value);
      return;
    }

    out[key] = String(value);
  });

  return out;
}

/**
 * Verifica columnas mínimas requeridas.
 *
 * @param {Object<string, number>} headerMap Mapa de cabeceras.
 * @throws {Error} CONFIG_ERROR
 * @private
 */
function _assertRequiredColumnsConfigPermisos_(headerMap) {
  var requiredColumns = [
    'categoria_permiso',
    'permiso_key',
    'tipo_permiso',
    'articulo_referencia',
    'unidad_control',
    'maximo_por_curso',
    'requiere_acumulado',
    'requiere_justificante',
    'modalidad_solicitud',
    'tipo_computo_default',
    'activo',
    'orden',
    'observaciones',
    'creado_el',
    'actualizado_el'
  ];

  var missing = requiredColumns.filter(function(col) {
    return !Object.prototype.hasOwnProperty.call(headerMap, col);
  });

  if (missing.length > 0) {
    throw new Error(
      'CONFIG_ERROR: faltan columnas en CONFIG_PERMISOS -> ' + missing.join(', ')
    );
  }
}

/**
 * String seguro.
 *
 * @param {*} value Valor.
 * @returns {string} String trim.
 * @private
 */
function _safePermisoConfigString_(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}