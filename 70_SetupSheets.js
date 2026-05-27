/**
 * 70_SetupSheets.gs
 * Inicialización y verificación técnica de estructura de hojas V1.
 * Sin lógica de negocio.
 */

/**
 * Crea hojas faltantes y garantiza cabeceras exactas en hojas vacías/sin cabecera.
 * No elimina datos existentes ni recrea hojas existentes.
 *
 * @returns {{
 *   ok: boolean,
 *   data?: {
 *     createdSheets: string[],
 *     initializedHeaders: string[],
 *     formattedSheets: string[]
 *   },
 *   error?: { code: string, message: string, details?: * }
 * }}
 */
function setupSheetsStructure() {
  try {
    var config = getProjectConfig();
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (!ss) {
      return _errorResult_('CONFIG_ERROR', 'Spreadsheet activo no disponible.');
    }

    var sheetKeys = Object.keys(config.SHEETS);
    var createdSheets = [];
    var initializedHeaders = [];
    var formattedSheets = [];

    sheetKeys.forEach(function(key) {
      var sheetName = config.SHEETS[key];
      var expectedHeaders = getColumnList(sheetName);
      var sheet = ss.getSheetByName(sheetName);

      if (!sheet) {
        sheet = ss.insertSheet(sheetName);
        createdSheets.push(sheetName);
      }

      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();

      // Solo inicializa cabecera si hoja está vacía o fila 1 sin contenido útil.
      if (lastRow === 0 || lastCol === 0 || _isHeaderRowEmpty_(sheet)) {
        _writeHeaders_(sheet, expectedHeaders);
        initializedHeaders.push(sheetName);
      }

      _applyBasicSheetFormat_(sheet);
      formattedSheets.push(sheetName);
    });

    return {
      ok: true,
      data: {
        createdSheets: createdSheets,
        initializedHeaders: initializedHeaders,
        formattedSheets: formattedSheets
      }
    };
  } catch (err) {
    return _errorResult_('SETUP_ERROR', 'Error al preparar estructura de hojas.', {
      message: err && err.message ? err.message : String(err)
    });
  }
}

/**
 * Verifica estructura técnica de hojas:
 * - existencia de hojas
 * - cabeceras exactas y en orden
 *
 * @returns {{
 *   ok: boolean,
 *   data?: {
 *     checkedAt: string,
 *     missingSheets: string[],
 *     sheetResults: Array<{
 *       sheet: string,
 *       ok: boolean,
 *       missingColumns: string[],
 *       extraColumns: string[],
 *       outOfOrderColumns: Array<{ expectedIndex: number, expected: string, actual: string }>
 *     }>
 *   },
 *   error?: { code: string, message: string, details?: * }
 * }}
 */
function verifySheetsStructure() {
  try {
    var config = getProjectConfig();
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (!ss) {
      return _errorResult_('CONFIG_ERROR', 'Spreadsheet activo no disponible.');
    }

    var sheetKeys = Object.keys(config.SHEETS);
    var missingSheets = [];
    var sheetResults = [];

    sheetKeys.forEach(function(key) {
      var sheetName = config.SHEETS[key];
      var expectedHeaders = getColumnList(sheetName);
      var expectedMap = getColumnMap(sheetName); // requerido por especificación
      void expectedMap; // uso explícito para cumplir contrato técnico de dependencia

      var sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        missingSheets.push(sheetName);
        sheetResults.push({
          sheet: sheetName,
          ok: false,
          missingColumns: expectedHeaders.slice(),
          extraColumns: [],
          outOfOrderColumns: []
        });
        return;
      }

      var actualHeaders = _readHeaders_(sheet);
      var diff = _diffHeaders_(expectedHeaders, actualHeaders);

      sheetResults.push({
        sheet: sheetName,
        ok: diff.ok,
        missingColumns: diff.missingColumns,
        extraColumns: diff.extraColumns,
        outOfOrderColumns: diff.outOfOrderColumns
      });
    });

    var hasHeaderIssues = sheetResults.some(function(r) { return !r.ok; });
    var ok = missingSheets.length === 0 && !hasHeaderIssues;

    return {
      ok: ok,
      data: {
        checkedAt: new Date().toISOString(),
        missingSheets: missingSheets,
        sheetResults: sheetResults
      }
    };
  } catch (err) {
    return _errorResult_('VERIFY_ERROR', 'Error al verificar estructura de hojas.', {
      message: err && err.message ? err.message : String(err)
    });
  }
}

/**
 * Inserta datos base mínimos en CONFIG_PERMISOS solo si no hay registros.
 * No duplica si ya existen filas de datos.
 *
 * @returns {{
 *   ok: boolean,
 *   data?: { inserted: number, skipped: boolean },
 *   error?: { code: string, message: string, details?: * }
 * }}
 */
function seedConfigPermisosBase() {
  try {
    var config = getProjectConfig();
    var sheetName = config.SHEETS.CONFIG_PERMISOS;
    var sheet = getSheetOrThrow(sheetName);
    var headers = getColumnList(sheetName);
    var now = new Date();

    // Si hay datos (fila 2 en adelante), no insertar.
    if (sheet.getLastRow() > 1) {
      return {
        ok: true,
        data: {
          inserted: 0,
          skipped: true
        }
      };
    }

    var tiposComputo = getTiposComputo();
    var unidadesControl = getUnidadesControl();
    var siNo = getValoresSiNo();
    var categorias = getCategoriasPermiso();

    var rowsData = [
      {
        categoria_permiso: categorias[1], // Otros permisos retribuidos
        permiso_key: 'bolsa_20_horas',
        tipo_permiso: 'Bolsa de 20 horas',
        articulo_referencia: 'Art. 41',
        unidad_control: _pickOrFallback_(unidadesControl, 'HORAS', 'HORAS'),
        maximo_por_curso: 20,
        requiere_acumulado: _pickOrFallback_(siNo, 'SI', 'SI'),
        requiere_justificante: _pickOrFallback_(siNo, 'NO', 'NO'),
        tipo_computo_default: _pickOrFallback_(tiposComputo, 'HORAS', 'HORAS'),
        activo: true,
        orden: 110,
        observaciones: 'Seed técnico V1.'
      },
      {
        categoria_permiso: categorias[1], // Otros permisos retribuidos
        permiso_key: 'horas_asistencia_medico',
        tipo_permiso: 'Horas asistencia médico',
        articulo_referencia: 'Art. 43',
        unidad_control: _pickOrFallback_(unidadesControl, 'HORAS', 'HORAS'),
        maximo_por_curso: '',
        requiere_acumulado: _pickOrFallback_(siNo, 'SI', 'SI'),
        requiere_justificante: _pickOrFallback_(siNo, 'SI', 'SI'),
        tipo_computo_default: _pickOrFallback_(tiposComputo, 'HORAS', 'HORAS'),
        activo: true,
        orden: 120,
        observaciones: 'Seed técnico V1.'
      },
      {
        categoria_permiso: categorias[1], // Otros permisos retribuidos
        permiso_key: 'horas_tutorias_max_10h',
        tipo_permiso: 'Horas tutorías, máximo 10 h',
        articulo_referencia: 'Art. 43',
        unidad_control: _pickOrFallback_(unidadesControl, 'HORAS', 'HORAS'),
        maximo_por_curso: 10,
        requiere_acumulado: _pickOrFallback_(siNo, 'SI', 'SI'),
        requiere_justificante: _pickOrFallback_(siNo, 'NO', 'NO'),
        tipo_computo_default: _pickOrFallback_(tiposComputo, 'HORAS', 'HORAS'),
        activo: true,
        orden: 130,
        observaciones: 'Seed técnico V1.'
      }
    ];

    var matrix = rowsData.map(function(item) {
      var rowObj = {};
      headers.forEach(function(col) { rowObj[col] = ''; });

      Object.keys(item).forEach(function(k) { rowObj[k] = item[k]; });
      if (_hasColumn_(headers, 'creado_el')) rowObj.creado_el = now;
      if (_hasColumn_(headers, 'actualizado_el')) rowObj.actualizado_el = now;

      return headers.map(function(col) { return rowObj[col]; });
    });

    if (matrix.length > 0) {
      sheet.getRange(2, 1, matrix.length, headers.length).setValues(matrix);
    }

    return {
      ok: true,
      data: {
        inserted: matrix.length,
        skipped: false
      }
    };
  } catch (err) {
    return _errorResult_('SEED_ERROR', 'Error al insertar seed en CONFIG_PERMISOS.', {
      message: err && err.message ? err.message : String(err)
    });
  }
}

/**
 * Escribe cabeceras exactas en fila 1 y limpia únicamente esa fila en el rango objetivo.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet Hoja destino.
 * @param {string[]} headers Cabeceras esperadas.
 * @private
 */
function _writeHeaders_(sheet, headers) {
  var width = Math.max(headers.length, sheet.getLastColumn(), 1);
  sheet.getRange(1, 1, 1, width).clearContent();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

/**
 * Aplica formato básico a la hoja.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet Hoja destino.
 * @private
 */
function _applyBasicSheetFormat_(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, lastCol).setFontWeight('bold');
  sheet.autoResizeColumns(1, lastCol);
}

/**
 * Indica si la fila de cabecera está vacía (sin contenido no blanco).
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet Hoja a evaluar.
 * @returns {boolean} true si está vacía.
 * @private
 */
function _isHeaderRowEmpty_(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return true;

  var values = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  return values.every(function(v) {
    return String(v === null || v === undefined ? '' : v).trim() === '';
  });
}

/**
 * Lee cabeceras actuales de una hoja.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet Hoja origen.
 * @returns {string[]} Cabeceras leídas en orden.
 * @private
 */
function _readHeaders_(sheet) {
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return [];
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(v) {
    return String(v === null || v === undefined ? '' : v).trim();
  });
}

/**
 * Compara cabeceras esperadas vs actuales, detectando:
 * - faltantes
 * - extra
 * - fuera de orden
 *
 * @param {string[]} expected Cabeceras esperadas.
 * @param {string[]} actual Cabeceras actuales.
 * @returns {{
 *   ok: boolean,
 *   missingColumns: string[],
 *   extraColumns: string[],
 *   outOfOrderColumns: Array<{ expectedIndex: number, expected: string, actual: string }>
 * }}
 * @private
 */
function _diffHeaders_(expected, actual) {
  var expectedSet = _arrayToSet_(expected);
  var actualSet = _arrayToSet_(actual);

  var missingColumns = expected.filter(function(col) { return !actualSet[col]; });
  var extraColumns = actual.filter(function(col) { return !expectedSet[col]; });

  var outOfOrderColumns = [];
  var minLen = Math.min(expected.length, actual.length);
  for (var i = 0; i < minLen; i++) {
    if (expected[i] !== actual[i]) {
      outOfOrderColumns.push({
        expectedIndex: i + 1,
        expected: expected[i] || '',
        actual: actual[i] || ''
      });
    }
  }

  return {
    ok: missingColumns.length === 0 && extraColumns.length === 0 && outOfOrderColumns.length === 0,
    missingColumns: missingColumns,
    extraColumns: extraColumns,
    outOfOrderColumns: outOfOrderColumns
  };
}

/**
 * Convierte un array en objeto-set.
 *
 * @param {string[]} arr Array de strings.
 * @returns {Object<string, boolean>} Set en objeto plano.
 * @private
 */
function _arrayToSet_(arr) {
  return (arr || []).reduce(function(acc, item) {
    acc[item] = true;
    return acc;
  }, {});
}

/**
 * Comprueba si un array de columnas contiene una columna concreta.
 *
 * @param {string[]} headers Lista de cabeceras.
 * @param {string} col Nombre de columna.
 * @returns {boolean} true si existe.
 * @private
 */
function _hasColumn_(headers, col) {
  return (headers || []).indexOf(col) >= 0;
}

/**
 * Devuelve valor deseado si existe en catálogo; si no, fallback.
 *
 * @param {string[]} options Catálogo de opciones válidas.
 * @param {string} desired Valor preferido.
 * @param {string} fallback Valor alternativo.
 * @returns {string} Valor seleccionado.
 * @private
 */
function _pickOrFallback_(options, desired, fallback) {
  return (options || []).indexOf(desired) >= 0 ? desired : fallback;
}

/**
 * Construye objeto estándar de error.
 *
 * @param {string} code Código de error.
 * @param {string} message Mensaje principal.
 * @param {*} details Detalle adicional.
 * @returns {{ok: boolean, error: {code: string, message: string, details?: *}}}
 * @private
 */
function _errorResult_(code, message, details) {
  var err = { code: code, message: message };
  if (details !== undefined) {
    err.details = details;
  }
  return { ok: false, error: err };
}