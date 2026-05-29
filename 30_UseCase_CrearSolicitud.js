/**
 * 30_UseCase_CrearSolicitud.gs
 * Orquesta el alta completa de una solicitud en estado PENDIENTE.
 * Sin acceso directo a Sheets.
 */

function crearSolicitud(payload, actorEmail) {
  var input = payload || {};
  var actor = String(actorEmail === null || actorEmail === undefined ? '' : actorEmail).trim().toLowerCase();

  if (!actor) {
    throw new Error('VALIDATION_ERROR: actorEmail es obligatorio.');
  }

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('VALIDATION_ERROR: payload inválido.');
  }

  assertInstitutionalUser(actor);

  var profesor = findByEmail(actor);
  if (!profesor) {
    throw new Error('NOT_FOUND: profesor no encontrado.');
  }

  if (isActiveByEmail(actor) !== true) {
    throw new Error('FORBIDDEN: profesor inactivo.');
  }

  var profesorSnapshot = _crearSolicitud_buildProfesorSnapshotFromPayload_(input, actor);

  var permisoKey = String(input.permiso_key === null || input.permiso_key === undefined ? '' : input.permiso_key).trim();
  if (!permisoKey) {
    throw new Error('VALIDATION_ERROR: permiso_key es obligatorio.');
  }

  input.permiso_key = permisoKey;

  var permisoConfig = findByPermisoKey(permisoKey);
  if (!permisoConfig) {
    throw new Error('NOT_FOUND: permiso_key no encontrado en CONFIG_PERMISOS.');
  }

  _crearSolicitud_applyPermisoConfigToPayload_(input, permisoConfig);

  var tipoComputo = String(input.tipo_computo === null || input.tipo_computo === undefined ? '' : input.tipo_computo)
    .trim()
    .toUpperCase();

  if (tipoComputo === 'DIA_COMPLETO') {
    if (_crearSolicitud_isEmpty_(input.fecha_fin)) {
      input.fecha_fin = input.fecha_inicio;
    }

    if (_crearSolicitud_isEmpty_(input.num_dias_solicitados)) {
      input.num_dias_solicitados = 1;
    }
  }

  var payloadValidation = validateNuevaSolicitud(input, permisoConfig);
  if (!payloadValidation.ok) {
    throw new Error('VALIDATION_ERROR: ' + payloadValidation.errors.join(' | '));
  }

  var now = nowDate();
  var cursoEscolarBaseDate = _crearSolicitud_isEmpty_(input.fecha_inicio) ? now : input.fecha_inicio;
  var cursoEscolar = getCursoEscolarFromDate(cursoEscolarBaseDate);

  var seq = Number(String(now.getTime()).slice(-6));
  if (!Number.isFinite(seq) || seq < 1) {
    seq = Math.abs(now.getTime()) % 1000000;
    if (seq < 1) seq = 1;
  }

  var idSolicitud = generateSolicitudId(cursoEscolar, seq);

  var record = _crearSolicitud_buildNuevaSolicitudRecord_(
    input,
    profesorSnapshot,
    actor,
    idSolicitud,
    cursoEscolar,
    now
  );

  createSolicitud(record);

  var resolutor = findResolutor(
    record.etapa,
    record.categoria_permiso
  );

  if (resolutor) {
    try {
      notificarNuevaSolicitudResponsable(record, resolutor);
    } catch (notifErr) {
      Logger.log('ERROR EMAIL RESPONSABLE: ' + notifErr);
    }
  }

  auditEvent('CREADA', _crearSolicitud_buildAuditContext_({
    id_solicitud: idSolicitud,
    actor_email: actor,
    estado: record.estado
  }));

  return {
    id_solicitud: idSolicitud,
    estado: record.estado
  };
}

function _crearSolicitud_buildProfesorSnapshotFromPayload_(payload, actorEmail) {
  var nombre = _crearSolicitud_safeString_(payload.nombre_profesor);
  var apellidos = _crearSolicitud_safeString_(payload.apellidos_profesor);
  var dni = _crearSolicitud_safeString_(payload.dni_profesor);
  var etapa = _crearSolicitud_safeString_(payload.etapa);
  var puestoTrabajo = _crearSolicitud_safeString_(payload.puesto_trabajo);

  if (!nombre) throw new Error('VALIDATION_ERROR: nombre_profesor es obligatorio.');
  if (!apellidos) throw new Error('VALIDATION_ERROR: apellidos_profesor es obligatorio.');
  if (!dni) throw new Error('VALIDATION_ERROR: dni_profesor es obligatorio.');
  if (!etapa) throw new Error('VALIDATION_ERROR: etapa es obligatoria.');
  if (!puestoTrabajo) throw new Error('VALIDATION_ERROR: puesto_trabajo es obligatorio.');

  return {
    email_institucional_profesor: actorEmail,
    nombre_profesor: nombre,
    apellidos_profesor: apellidos,
    dni_profesor: dni,
    etapa: etapa,
    puesto_trabajo: puestoTrabajo
  };
}

function _crearSolicitud_applyPermisoConfigToPayload_(payload, permisoConfig) {
  payload.categoria_permiso = permisoConfig.categoria_permiso || payload.categoria_permiso || '';
  payload.tipo_permiso = permisoConfig.tipo_permiso || payload.tipo_permiso || '';
  payload.articulo_referencia_permiso = permisoConfig.articulo_referencia || payload.articulo_referencia_permiso || '';
  payload.tipo_computo = permisoConfig.tipo_computo_default || payload.tipo_computo || '';
  payload.unidad_control = permisoConfig.unidad_control || payload.unidad_control || '';
  payload.maximo_por_curso = permisoConfig.maximo_por_curso || payload.maximo_por_curso || '';
  payload.requiere_acumulado = permisoConfig.requiere_acumulado || payload.requiere_acumulado || '';
}

function _crearSolicitud_buildNuevaSolicitudRecord_(payload, profesorSnapshot, actorEmail, idSolicitud, cursoEscolar, now) {
  var record = {};

  record.id_solicitud = idSolicitud;
  record.estado = 'PENDIENTE';
  record.curso_escolar = cursoEscolar;
  record.creado_el = now;
  record.actualizado_el = now;
  record.creado_por_email = actorEmail;
  record.actualizado_por_email = actorEmail;

  record.estado_resolucion = '';
  record.check_aceptada = '';
  record.check_denegada = '';

  record.email_institucional_profesor = profesorSnapshot.email_institucional_profesor;
  record.nombre_profesor = profesorSnapshot.nombre_profesor;
  record.apellidos_profesor = profesorSnapshot.apellidos_profesor;
  record.dni_profesor = profesorSnapshot.dni_profesor;
  record.etapa = profesorSnapshot.etapa;
  record.puesto_trabajo = profesorSnapshot.puesto_trabajo;

  var directFields = [
    'logo_centro',
    'nombre_centro',
    'departamento_o_unidad_centro',
    'direccion_centro',
    'cp_ciudad',
    'fecha_solicitud',
    'fecha_generacion_documento',
    'categoria_permiso',
    'permiso_key',
    'tipo_permiso',
    'articulo_referencia_permiso',
    'tipo_computo',
    'fecha_inicio',
    'fecha_fin',
    'hora_inicio',
    'hora_fin',
    'num_dias_solicitados',
    'num_horas_solicitadas',
    'observaciones_profesor',
    'justificante_adjunto',
    'unidad_control',
    'maximo_por_curso',
    'requiere_acumulado',
    'doc_url',
    'pdf_url',
    'recordatorio_programado',
    'recordatorio_enviado',
    'fecha_recordatorio',
    'jefatura_notificada_email',
    'fecha_notificacion_jefatura',
    'fecha_envio_resolucion',
    'fecha_notificacion_profesor',
    'alerta_exceso_enviada_direccion',
    'token_resolucion',
    'fecha_envio_email_responsable',
    'email_responsable_resolucion',
    'fecha_resolucion_por_email',
    'metodo_resolucion'
  ];

  directFields.forEach(function(field) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      record[field] = payload[field];
    }
  });

  if (_crearSolicitud_isEmpty_(record.fecha_solicitud)) {
    record.fecha_solicitud = now;
  }

  if (_crearSolicitud_isEmpty_(record.alerta_exceso_enviada_direccion)) {
    record.alerta_exceso_enviada_direccion = 'NO';
  }

  if (_crearSolicitud_isEmpty_(record.recordatorio_programado)) {
    record.recordatorio_programado = 'NO';
  }

  if (_crearSolicitud_isEmpty_(record.recordatorio_enviado)) {
    record.recordatorio_enviado = 'NO';
  }

  return record;
}

function _crearSolicitud_buildAuditContext_(base) {
  var ctx = base || {};
  return {
    id_solicitud: ctx.id_solicitud || '',
    actor_email: ctx.actor_email || '',
    estado: ctx.estado || '',
    fecha_evento: nowDate()
  };
}

function _crearSolicitud_safeString_(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}

function _crearSolicitud_isEmpty_(value) {
  return value === null || value === undefined || String(value).trim() === '';
}