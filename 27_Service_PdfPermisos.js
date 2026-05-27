/**
 * 27_Service_PdfPermisos.gs
 * Servicio para generar documento final y PDF desde plantilla TPL_SOLICITUD_PERMISOS.
 */

const PDF_PERMISOS_LOGO_FILE_ID = '1x0SmyokoniDyOPUuXC88RCReuh4GirK_';

function assertGenerable(solicitud) {
  var s = solicitud || {};
  var estadoResolucion = _pdfPermisos_safeString_(s.estado_resolucion).toUpperCase();

  if (estadoResolucion !== 'ACEPTADA' && estadoResolucion !== 'DENEGADA') {
    throw new Error('VALIDATION_ERROR: solo se puede generar PDF final para ACEPTADA o DENEGADA.');
  }

  return true;
}

function buildTemplateData(solicitud) {
  var s = solicitud || {};
  var estado = _pdfPermisos_safeString_(s.estado_resolucion).toUpperCase();
  var checks = _pdfPermisos_buildChecks_(estado);
  var fechaGeneracion = nowDate();

  var data = {
    '{{LOGO_CENTRO}}': '',
    '{{NOMBRE_CENTRO}}': 'Colegio Concertado San José de la Montaña',
    '{{DIRECCION_CENTRO}}': 'Cotlliure, 22',
    '{{CP_CIUDAD}}': 'Palma',

    '{{CURSO_ESCOLAR}}': _pdfPermisos_valueOrDash_(s.curso_escolar || '2025-2026'),
    '{{ID_SOLICITUD}}': _pdfPermisos_valueOrDash_(s.id_solicitud),
    '{{FECHA_SOLICITUD}}': _pdfPermisos_valueOrDash_(_pdfPermisos_formatDateOnly_(s.fecha_solicitud || fechaGeneracion)),
    '{{FECHA_GENERACION_DOCUMENTO}}': _pdfPermisos_valueOrDash_(_pdfPermisos_formatDateOnly_(fechaGeneracion)),

    '{{NOMBRE_PROFESOR}}': _pdfPermisos_valueOrDash_(s.nombre_profesor),
    '{{APELLIDOS_PROFESOR}}': _pdfPermisos_valueOrDash_(s.apellidos_profesor),
    '{{DNI_PROFESOR}}': _pdfPermisos_valueOrDash_(s.dni_profesor),
    '{{EMAIL_INSTITUCIONAL_PROFESOR}}': _pdfPermisos_valueOrDash_(s.email_institucional_profesor),
    '{{ETAPA}}': _pdfPermisos_valueOrDash_(s.etapa),
    '{{PUESTO_TRABAJO}}': _pdfPermisos_valueOrDash_(s.puesto_trabajo),

    '{{TIPO_SOLICITUD}}': _pdfPermisos_valueOrDash_(s.categoria_permiso),
    '{{CATEGORIA_PERMISO}}': _pdfPermisos_valueOrDash_(s.categoria_permiso),
    '{{TIPO_PERMISO}}': _pdfPermisos_valueOrDash_(s.tipo_permiso),
    '{{ARTICULO_REFERENCIA_PERMISO}}': _pdfPermisos_valueOrDash_(s.articulo_referencia_permiso),
    '{{TIPO_COMPUTO}}': _pdfPermisos_valueOrDash_(s.tipo_computo),

    '{{FECHA_INICIO}}': _pdfPermisos_valueOrDash_(_pdfPermisos_formatDateOnly_(s.fecha_inicio)),
    '{{FECHA_FIN}}': _pdfPermisos_valueOrDash_(_pdfPermisos_formatDateOnly_(s.fecha_fin)),
    '{{HORA_INICIO}}': _pdfPermisos_valueOrDash_(_pdfPermisos_formatTimeOnly_(s.hora_inicio)),
    '{{HORA_FIN}}': _pdfPermisos_valueOrDash_(_pdfPermisos_formatTimeOnly_(s.hora_fin)),
    '{{NUM_DIAS_SOLICITADOS}}': _pdfPermisos_valueOrDash_(_pdfPermisos_formatNumber_(s.num_dias_solicitados)),
    '{{NUM_HORAS_SOLICITADAS}}': _pdfPermisos_valueOrDash_(_pdfPermisos_formatNumber_(s.num_horas_solicitadas)),

    '{{OBSERVACIONES_PROFESOR}}': _pdfPermisos_valueOrDash_(s.observaciones_profesor),

    '{{CHECK_ACEPTADA}}': checks.check_aceptada,
    '{{CHECK_DENEGADA}}': checks.check_denegada,
    '{{ESTADO_RESOLUCION}}': _pdfPermisos_valueOrDash_(estado),
    '{{DIAS_AUTORIZADOS}}': _pdfPermisos_valueOrDash_(_pdfPermisos_formatNumber_(s.dias_autorizados)),
    '{{HORAS_AUTORIZADAS}}': _pdfPermisos_valueOrDash_(_pdfPermisos_formatNumber_(s.horas_autorizadas)),
    '{{OBSERVACIONES_DIRECCION}}': _pdfPermisos_valueOrDash_(s.observaciones_direccion),
    '{{JUSTIFICANTE_ADJUNTO}}': _pdfPermisos_valueOrDash_(s.justificante_adjunto || 'NO'),

    '{{FECHA_RESOLUCION}}': _pdfPermisos_valueOrDash_(_pdfPermisos_formatDateOnly_(s.fecha_resolucion || fechaGeneracion)),
    '{{NOMBRE_RESUELVE}}': _pdfPermisos_valueOrDash_(s.nombre_resuelve || 'Dirección'),
    '{{EMAIL_RESUELVE}}': _pdfPermisos_valueOrDash_(s.email_resuelve),

    '{{ETAPA_RESPONSABLE}}': _pdfPermisos_valueOrDash_(s.etapa_responsable || 'TODAS'),
    '{{ESTADO_CORTO}}': estado === 'ACEPTADA' ? 'OK' : (estado === 'DENEGADA' ? 'NO' : '—')
  };

  _pdfPermisos_assertRequiredTemplateFields_(data);
  return data;
}

function generateFinalPdf(solicitud) {
  assertGenerable(solicitud);

  var cfg = getProjectConfig();
  var templateId = _pdfPermisos_safeString_(cfg.TEMPLATE_SOLICITUD_PERMISOS_ID);
  var outputFolderId = _pdfPermisos_safeString_(cfg.PDF_OUTPUT_FOLDER_ID);

  if (!templateId) throw new Error('CONFIG_ERROR: TEMPLATE_SOLICITUD_PERMISOS_ID no configurado.');
  if (!outputFolderId) throw new Error('CONFIG_ERROR: PDF_OUTPUT_FOLDER_ID no configurado.');

  var data = buildTemplateData(solicitud);
  var fechaGeneracion = nowDate();

  try {
    var templateFile = DriveApp.getFileById(templateId);
    var outputFolder = DriveApp.getFolderById(outputFolderId);
    var baseName = _pdfPermisos_buildFileBaseName_(solicitud, fechaGeneracion);

    var docCopy = templateFile.makeCopy(baseName + ' [DOC]', outputFolder);
    var doc = DocumentApp.openById(docCopy.getId());
    var body = doc.getBody();

    if (!body) throw new Error('INTEGRITY_ERROR: body de documento no disponible.');

    _pdfPermisos_insertLogo_(body);
    _pdfPermisos_replaceAll_(body, data);

    doc.saveAndClose();

    var pdfBlob = docCopy.getBlob().getAs(MimeType.PDF).setName(baseName + '.pdf');
    var pdfFile = outputFolder.createFile(pdfBlob);

    return {
      docUrl: docCopy.getUrl(),
      pdfUrl: pdfFile.getUrl(),
      fechaGeneracion: fechaGeneracion
    };

  } catch (e) {
    throw new Error(
      'EXTERNAL_ERROR: fallo generando documento/PDF final. ' +
      (e && e.message ? e.message : String(e))
    );
  }
}

function _pdfPermisos_insertLogo_(body) {
  var pattern = _pdfPermisos_escapeRegExp_('{{LOGO_CENTRO}}');
  var found = body.findText(pattern);

  if (!found) return;

  try {
    var logoBlob = DriveApp.getFileById(PDF_PERMISOS_LOGO_FILE_ID).getBlob();
    var textElement = found.getElement().asText();
    var parent = textElement.getParent();

    textElement.setText('');

    var image;
    if (parent && parent.appendInlineImage) {
      image = parent.appendInlineImage(logoBlob);
    } else {
      image = body.insertImage(0, logoBlob);
    }

    image.setWidth(55);
    image.setHeight(55);

  } catch (err) {
    body.replaceText(pattern, '');
  }
}

function _pdfPermisos_replaceAll_(body, replacements) {
  Object.keys(replacements || {}).forEach(function(key) {
    var value = _pdfPermisos_safeString_(replacements[key]);
    var pattern = _pdfPermisos_escapeRegExp_(key);
    body.replaceText(pattern, value);
  });
}

function _pdfPermisos_buildChecks_(estadoResolucion) {
  if (estadoResolucion === 'ACEPTADA') {
    return { check_aceptada: '☑', check_denegada: '☐' };
  }

  if (estadoResolucion === 'DENEGADA') {
    return { check_aceptada: '☐', check_denegada: '☑' };
  }

  return { check_aceptada: '☐', check_denegada: '☐' };
}

function _pdfPermisos_assertRequiredTemplateFields_(data) {
  var required = [
    '{{ID_SOLICITUD}}',
    '{{NOMBRE_PROFESOR}}',
    '{{APELLIDOS_PROFESOR}}',
    '{{ESTADO_RESOLUCION}}'
  ];

  var missing = required.filter(function(key) {
    return _pdfPermisos_isEmpty_(data[key]) || data[key] === '—';
  });

  if (missing.length > 0) {
    throw new Error('VALIDATION_ERROR: faltan datos críticos para plantilla PDF -> ' + missing.join(', '));
  }
}

function _pdfPermisos_formatDateOnly_(value) {
  if (_pdfPermisos_isEmpty_(value)) return '';

  if (Object.prototype.toString.call(value) === '[object Date]') {
    if (isNaN(value.getTime())) return '';
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'dd/MM/yyyy');
  }

  var text = _pdfPermisos_safeString_(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    var parts = text.split('-');
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) return text;

  return text;
}

function _pdfPermisos_formatTimeOnly_(value) {
  if (_pdfPermisos_isEmpty_(value)) return '';

  if (Object.prototype.toString.call(value) === '[object Date]') {
    if (isNaN(value.getTime())) return '';
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'HH:mm');
  }

  var text = _pdfPermisos_safeString_(value);

  if (/^\d{1,2}:\d{2}$/.test(text)) {
    var parts = text.split(':');
    return ('0' + parts[0]).slice(-2) + ':' + parts[1];
  }

  if (/^\d{1,2}:\d{2}:\d{2}$/.test(text)) {
    var p = text.split(':');
    return ('0' + p[0]).slice(-2) + ':' + p[1];
  }

  if (text.indexOf('1899-12-30') >= 0) return '';

  return text;
}

function _pdfPermisos_formatNumber_(value) {
  if (_pdfPermisos_isEmpty_(value)) return '';

  var text = _pdfPermisos_safeString_(value).replace(',', '.');
  var n = Number(text);

  if (!Number.isFinite(n)) return _pdfPermisos_safeString_(value);
  if (Math.floor(n) === n) return String(n);

  return String(n).replace('.', ',');
}

function _pdfPermisos_valueOrDash_(value) {
  var text = _pdfPermisos_safeString_(value);
  return text ? text : '—';
}

function _pdfPermisos_buildFileBaseName_(solicitud, fechaGeneracion) {
  var id = _pdfPermisos_safeString_(solicitud && solicitud.id_solicitud);
  var estado = _pdfPermisos_safeString_(solicitud && solicitud.estado_resolucion).toUpperCase();
  var estadoCorto = estado === 'ACEPTADA' ? 'OK' : (estado === 'DENEGADA' ? 'NO' : 'RES');
  var ts = formatDate(fechaGeneracion, 'yyyyMMdd_HHmmss') + '_' + fechaGeneracion.getMilliseconds();

  return 'SOL_' + (id || 'SIN_ID') + '_' + estadoCorto + '_' + ts;
}

function _pdfPermisos_escapeRegExp_(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function _pdfPermisos_safeString_(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}

function _pdfPermisos_isEmpty_(value) {
  return _pdfPermisos_safeString_(value) === '';
}