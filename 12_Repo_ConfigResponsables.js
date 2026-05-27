/**
 * 12_Repo_ConfigResponsables.gs
 * Capa REPO para lectura de la hoja CONFIG_RESPONSABLES.
 * Sin lógica de negocio ni acciones externas.
 */

/**
 * Devuelve el primer resolutor activo según prioridad ascendente.
 *
 * @param {string} etapa Etapa objetivo.
 * @param {string} categoriaPermiso Categoría de permiso objetivo.
 * @returns {Object|null} Responsable resolutor o null.
 */
function findResolutor(etapa, categoriaPermiso) {
  var filtered = _cfgResp_filterByEtapaCategoria_(etapa, categoriaPermiso);

  var candidates = filtered.filter(function(item) {
    var role = _cfgResp_normalizeToken_(item.rol);

    return (
      _cfgResp_normalizeBoolean_(item.puede_resolver) === true &&
      _cfgResp_hasEmail_(item.email_responsable) &&
      (role === 'DIRECCION' || role === 'AUTORIZADO')
    );
  });

  var sorted = _cfgResp_sortByPrioridadAsc_(candidates);
  return sorted.length ? sorted[0] : null;
}

/**
 * Lista jefaturas activas por etapa/categoría.
 *
 * @param {string} etapa Etapa objetivo.
 * @param {string} categoriaPermiso Categoría objetivo.
 * @returns {Object[]} Lista de responsables con rol JEFATURA.
 */
function listJefaturas(etapa, categoriaPermiso) {
  var filtered = _cfgResp_filterByEtapaCategoria_(etapa, categoriaPermiso);

  var result = filtered.filter(function(item) {
    var role = _cfgResp_normalizeToken_(item.rol);

    return (
      role === 'JEFATURA' &&
      _cfgResp_hasEmail_(item.email_responsable)
    );
  });

  return _cfgResp_sortByPrioridadAsc_(result);
}

/**
 * Lista responsables activos notificables por etapa/categoría.
 *
 * @param {string} etapa Etapa objetivo.
 * @param {string} categoriaPermiso Categoría objetivo.
 * @returns {Object[]} Lista de responsables con recibe_notificaciones = SI/true.
 */
function listNotificables(etapa, categoriaPermiso) {
  var filtered = _cfgResp_filterByEtapaCategoria_(etapa, categoriaPermiso);

  var result = filtered.filter(function(item) {
    return (
      _cfgResp_normalizeBoolean_(item.recibe_notificaciones) === true &&
      _cfgResp_hasEmail_(item.email_responsable)
    );
  });

  return _cfgResp_sortByPrioridadAsc_(result);
}

/**
 * Carga y filtra responsables activos compatibles por etapa/categoría.
 *
 * @param {string} etapa Etapa solicitada.
 * @param {string} categoriaPermiso Categoría solicitada.
 * @returns {Object[]} Lista filtrada y activa.
 * @private
 */
function _cfgResp_filterByEtapaCategoria_(etapa, categoriaPermiso) {
  var safeEtapa = _cfgResp_normalizeToken_(etapa);
  var safeCategoria = _cfgResp_normalizeToken_(categoriaPermiso);

  _cfgResp_validateInputs_(safeEtapa, safeCategoria);

  var all = _cfgResp_listAllActivos_();

  return all.filter(function(item) {
    var rowEtapa = _cfgResp_normalizeToken_(item.etapa);
    var rowCategoria = _cfgResp_normalizeToken_(item.categoria_permiso);

    var etapaMatches = rowEtapa === safeEtapa || rowEtapa === 'TODAS';
    var categoriaMatches = rowCategoria === safeCategoria || rowCategoria === 'TODAS';

    return etapaMatches && categoriaMatches;
  });
}

/**
 * Devuelve todos los responsables activos de CONFIG_RESPONSABLES.
 *
 * @returns {Object[]} Responsables activos.
 * @private
 */
function _cfgResp_listAllActivos_() {
  var sheetName = getProjectConfig().SHEETS.CONFIG_RESPONSABLES;
  var sheet = getSheetOrThrow(sheetName);
  var headerMap = getHeaderMap(sheet);

  _cfgResp_assertRequiredColumns_(headerMap);

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var result = [];

  values.forEach(function(rowValues) {
    var row = _cfgResp_mapRow_(rowValues, headerMap);
    if (!row) return;

    if (_cfgResp_normalizeBoolean_(row.activo) === true) {
      result.push(row);
    }
  });

  return result;
}

/**
 * Mapea una fila de CONFIG_RESPONSABLES a objeto.
 *
 * @param {Array<*>} rowValues Valores de fila.
 * @param {Object<string, number>} headerMap Mapa de cabeceras.
 * @returns {Object|null} Fila mapeada o null si está vacía.
 * @private
 */
function _cfgResp_mapRow_(rowValues, headerMap) {
  if (!rowValues || !rowValues.length) return null;

  var isEmpty = rowValues.every(function(v) {
    return String(v === null || v === undefined ? '' : v).trim() === '';
  });

  if (isEmpty) return null;

  var obj = rowToObject(rowValues, headerMap);

  if (Object.prototype.hasOwnProperty.call(obj, 'etapa')) {
    obj.etapa = _cfgResp_normalizeToken_(obj.etapa);
  }

  if (Object.prototype.hasOwnProperty.call(obj, 'categoria_permiso')) {
    obj.categoria_permiso = _cfgResp_normalizeToken_(obj.categoria_permiso);
  }

  if (Object.prototype.hasOwnProperty.call(obj, 'rol')) {
    obj.rol = _cfgResp_normalizeToken_(obj.rol);
  }

  if (Object.prototype.hasOwnProperty.call(obj, 'activo')) {
    obj.activo = _cfgResp_normalizeBoolean_(obj.activo);
  }

  return obj;
}

/**
 * Normaliza un valor a boolean robusto.
 *
 * @param {*} value Valor de entrada.
 * @returns {boolean} Boolean normalizado.
 * @private
 */
function _cfgResp_normalizeBoolean_(value) {
  if (value === true) return true;

  var normalized = String(value === null || value === undefined ? '' : value)
    .trim()
    .toLowerCase();

  return (
    normalized === 'true' ||
    normalized === 'si' ||
    normalized === 'sí'
  );
}

/**
 * Normaliza token textual con trim y mayúsculas.
 *
 * @param {*} value Valor a normalizar.
 * @returns {string} Token normalizado.
 * @private
 */
function _cfgResp_normalizeToken_(value) {
  return String(value === null || value === undefined ? '' : value)
    .trim()
    .toUpperCase();
}

/**
 * Comprueba si un valor parece un email mínimamente válido.
 *
 * @param {*} value Valor email.
 * @returns {boolean} true si contiene @ y no está vacío.
 * @private
 */
function _cfgResp_hasEmail_(value) {
  return String(value === null || value === undefined ? '' : value)
    .trim()
    .includes('@');
}

/**
 * Ordena responsables por orden_prioridad ascendente sin mutar el array original.
 *
 * @param {Object[]} list Lista a ordenar.
 * @returns {Object[]} Nueva lista ordenada.
 * @private
 */
function _cfgResp_sortByPrioridadAsc_(list) {
  return (list || []).slice().sort(function(a, b) {
    var pa = _cfgResp_parsePriority_(a.orden_prioridad);
    var pb = _cfgResp_parsePriority_(b.orden_prioridad);
    return pa - pb;
  });
}

/**
 * Convierte orden_prioridad a número sortable.
 *
 * @param {*} value Valor prioridad.
 * @returns {number} Prioridad numérica o Number.MAX_SAFE_INTEGER si inválida.
 * @private
 */
function _cfgResp_parsePriority_(value) {
  var n = Number(value);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

/**
 * Valida inputs de etapa y categoría contra catálogos.
 *
 * @param {string} etapa Etapa normalizada.
 * @param {string} categoria Categoría normalizada.
 * @private
 */
function _cfgResp_validateInputs_(etapa, categoria) {
  if (!etapa) {
    throw new Error('VALIDATION_ERROR: etapa es obligatoria.');
  }

  if (!categoria) {
    throw new Error('VALIDATION_ERROR: categoriaPermiso es obligatoria.');
  }

  if (getEtapas().indexOf(etapa) < 0) {
    throw new Error('VALIDATION_ERROR: etapa inválida.');
  }

  var categoriasNormalizadas = getCategoriasPermiso().map(function(cat) {
    return _cfgResp_normalizeToken_(cat);
  });

  if (categoriasNormalizadas.indexOf(categoria) < 0) {
    throw new Error('VALIDATION_ERROR: categoriaPermiso inválida.');
  }

  var allowedRoles = getRolesResponsables();

  if (
    allowedRoles.indexOf('DIRECCION') < 0 ||
    allowedRoles.indexOf('AUTORIZADO') < 0 ||
    allowedRoles.indexOf('JEFATURA') < 0
  ) {
    throw new Error('CONFIG_ERROR: Catálogo de roles incompleto.');
  }
}

/**
 * Verifica columnas mínimas requeridas en CONFIG_RESPONSABLES.
 *
 * @param {Object<string, number>} headerMap Mapa de cabeceras.
 * @private
 */
function _cfgResp_assertRequiredColumns_(headerMap) {
  var required = [
    'responsable_id',
    'nombre_responsable',
    'email_responsable',
    'rol',
    'etapa',
    'categoria_permiso',
    'puede_resolver',
    'recibe_notificaciones',
    'recibe_recordatorios',
    'orden_prioridad',
    'activo',
    'creado_el',
    'actualizado_el'
  ];

  var missing = required.filter(function(col) {
    return !Object.prototype.hasOwnProperty.call(headerMap, col);
  });

  if (missing.length > 0) {
    throw new Error('CONFIG_ERROR: Faltan columnas en CONFIG_RESPONSABLES -> ' + missing.join(', '));
  }
}
