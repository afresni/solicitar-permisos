/**
 * 13_Repo_SolicitudesPermisos.gs
 * Capa REPO para persistencia y consulta de SOLICITUDES_PERMISOS.
 * Sin lógica de negocio.
 */

function createSolicitud(record) {
  var input = record || {};
  _solRepo_assertRecordObject_(input);
  _solRepo_assertRequiredColumnsReady_();

  var idSolicitud = _solRepo_normalizeToken_(input.id_solicitud);
  if (!idSolicitud) {
    throw new Error('VALIDATION_ERROR: id_solicitud es obligatorio.');
  }

  var existing = _solRepo_findMatchById_(idSolicitud);
  if (existing.matches.length > 0) {
    throw new Error('INTEGRITY_ERROR: id_solicitud ya existe -> ' + idSolicitud);
  }

  var sheetName = getProjectConfig().SHEETS.SOLICITUDES_PERMISOS;
  var rowIndex = appendObject(sheetName, input);
  var inserted = _solRepo_getRowObjectByIndex_(rowIndex);

  return {
    ok: true,
    rowIndex: rowIndex,
    data: inserted
  };
}

function findById(idSolicitud) {
  _solRepo_assertRequiredColumnsReady_();

  var safeId = _solRepo_normalizeToken_(idSolicitud);
  if (!safeId) {
    throw new Error('VALIDATION_ERROR: idSolicitud es obligatorio.');
  }

  var result = _solRepo_findMatchById_(safeId);

  if (result.matches.length > 1) {
    throw new Error('INTEGRITY_ERROR: id_solicitud duplicado -> ' + safeId);
  }

  return result.matches.length === 1 ? result.matches[0].data : null;
}

function updateSolicitud(idSolicitud, patch) {
  _solRepo_assertRequiredColumnsReady_();

  var safeId = _solRepo_normalizeToken_(idSolicitud);
  if (!safeId) {
    throw new Error('VALIDATION_ERROR: idSolicitud es obligatorio.');
  }

  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new Error('VALIDATION_ERROR: patch inválido.');
  }

  if (Object.keys(patch).length === 0) {
    throw new Error('VALIDATION_ERROR: patch vacío.');
  }

  var result = _solRepo_findMatchById_(safeId);

  if (result.matches.length > 1) {
    throw new Error('INTEGRITY_ERROR: id_solicitud duplicado -> ' + safeId);
  }

  if (result.matches.length === 0) {
    throw new Error('NOT_FOUND: solicitud no encontrada -> ' + safeId);
  }

  if (Object.prototype.hasOwnProperty.call(patch, 'estado')) {
    var estadoValidation = validateEstadoV1(_solRepo_normalizeToken_(patch.estado));
    if (!estadoValidation.ok) {
      throw new Error('VALIDATION_ERROR: ' + estadoValidation.error);
    }
    patch.estado = _solRepo_normalizeToken_(patch.estado);
  }

  var sheetName = getProjectConfig().SHEETS.SOLICITUDES_PERMISOS;
  var rowIndex = result.matches[0].rowIndex;

  updateRowByIndex(sheetName, rowIndex, patch);

  return {
    ok: true,
    rowIndex: rowIndex,
    data: _solRepo_getRowObjectByIndex_(rowIndex)
  };
}

function listByProfesor(email) {
  _solRepo_assertRequiredColumnsReady_();

  var safeEmail = _solRepo_normalizeEmail_(email);
  if (!safeEmail) {
    throw new Error('VALIDATION_ERROR: email es obligatorio.');
  }

  return _solRepo_listAllRows_().filter(function(item) {
    return _solRepo_normalizeEmail_(item.email_institucional_profesor) === safeEmail;
  });
}

function listByEstado(estado) {
  _solRepo_assertRequiredColumnsReady_();

  var safeEstado = _solRepo_normalizeToken_(estado);
  var estadoValidation = validateEstadoV1(safeEstado);

  if (!estadoValidation.ok) {
    throw new Error('VALIDATION_ERROR: ' + estadoValidation.error);
  }

  return _solRepo_listAllRows_().filter(function(item) {
    return _solRepo_normalizeToken_(item.estado) === safeEstado;
  });
}

function listAceptadasByProfesorPermisoCurso(email, permisoKey, cursoEscolar) {
  _solRepo_assertRequiredColumnsReady_();

  var safeEmail = _solRepo_normalizeEmail_(email);
  var safePermisoKey = _solRepo_normalizeToken_(permisoKey);
  var safeCursoEscolar = _solRepo_normalizeToken_(cursoEscolar);

  if (!safeEmail) {
    throw new Error('VALIDATION_ERROR: email es obligatorio.');
  }

  if (!safePermisoKey) {
    throw new Error('VALIDATION_ERROR: permisoKey es obligatorio.');
  }

  if (!safeCursoEscolar) {
    throw new Error('VALIDATION_ERROR: cursoEscolar es obligatorio.');
  }

  return _solRepo_listAllRows_().filter(function(item) {
    return (
      _solRepo_normalizeEmail_(item.email_institucional_profesor) === safeEmail &&
      _solRepo_normalizeToken_(item.permiso_key) === safePermisoKey &&
      _solRepo_normalizeToken_(item.curso_escolar) === safeCursoEscolar &&
      _solRepo_normalizeToken_(item.estado) === 'ACEPTADA'
    );
  });
}

function _solRepo_getSheetAndHeader_() {
  var sheetName = getProjectConfig().SHEETS.SOLICITUDES_PERMISOS;
  var sheet = getSheetOrThrow(sheetName);
  var headerMap = getHeaderMap(sheet);

  _solRepo_assertRequiredColumns_(headerMap);

  return {
    sheet: sheet,
    headerMap: headerMap
  };
}

function _solRepo_assertRequiredColumnsReady_() {
  _solRepo_getSheetAndHeader_();
}

function _solRepo_assertRequiredColumns_(headerMap) {
  var requiredColumns = [
    'id_solicitud',
    'estado',
    'curso_escolar',
    'email_institucional_profesor',
    'permiso_key'
  ];

  var missing = requiredColumns.filter(function(col) {
    return !Object.prototype.hasOwnProperty.call(headerMap, col);
  });

  if (missing.length > 0) {
    throw new Error('CONFIG_ERROR: Faltan columnas en SOLICITUDES_PERMISOS -> ' + missing.join(', '));
  }
}

function _solRepo_findMatchById_(idSolicitud) {
  var ctx = _solRepo_getSheetAndHeader_();
  var sheet = ctx.sheet;
  var headerMap = ctx.headerMap;

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { matches: [] };
  }

  var values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var matches = [];

  values.forEach(function(rowValues, idx) {
    var rowObj = _solRepo_sanitizeRow_(
      rowToObject(rowValues, headerMap)
    );

    var rowId = _solRepo_normalizeToken_(rowObj.id_solicitud);

    if (rowId === idSolicitud) {
      matches.push({
        rowIndex: idx + 2,
        data: rowObj
      });
    }
  });

  return { matches: matches };
}

function _solRepo_listAllRows_() {
  var ctx = _solRepo_getSheetAndHeader_();
  var sheet = ctx.sheet;
  var headerMap = ctx.headerMap;

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

  return values
    .map(function(rowValues) {
      return _solRepo_sanitizeRow_(
        rowToObject(rowValues, headerMap)
      );
    })
    .filter(function(row) {
      return _solRepo_normalizeToken_(row.id_solicitud) !== '';
    });
}

function _solRepo_getRowObjectByIndex_(rowIndex) {
  var ctx = _solRepo_getSheetAndHeader_();
  var sheet = ctx.sheet;
  var headerMap = ctx.headerMap;

  if (rowIndex < 2 || rowIndex > sheet.getLastRow()) {
    throw new Error('NOT_FOUND: rowIndex fuera de rango -> ' + rowIndex);
  }

  var rowValues = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn()).getValues()[0];

  return _solRepo_sanitizeRow_(
    rowToObject(rowValues, headerMap)
  );
}

function _solRepo_sanitizeRow_(obj) {
  var out = {};

  Object.keys(obj || {}).forEach(function(key) {
    var value = obj[key];

    if (value === undefined || value === null) {
      out[key] = '';
      return;
    }

    if (Object.prototype.toString.call(value) === '[object Date]') {
      if (isNaN(value.getTime())) {
        out[key] = '';
      } else {
        out[key] = Utilities.formatDate(
          value,
          Session.getScriptTimeZone(),
          'yyyy-MM-dd'
        );
      }
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

function _solRepo_normalizeToken_(value) {
  return String(value === null || value === undefined ? '' : value)
    .trim()
    .toUpperCase();
}

function _solRepo_normalizeEmail_(value) {
  return String(value === null || value === undefined ? '' : value)
    .trim()
    .toLowerCase();
}

function _solRepo_assertRecordObject_(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw new Error('VALIDATION_ERROR: record inválido.');
  }
}