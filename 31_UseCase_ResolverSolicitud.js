/**
 * 31_UseCase_ResolverSolicitud.gs
 * Orquesta la resolución completa de solicitudes (ACEPTADA / DENEGADA).
 * Sin acceso directo a Sheets.
 */

/**
 * Resuelve una solicitud existente.
 *
 * @param {string} idSolicitud ID de la solicitud.
 * @param {string} decision Decisión: ACEPTADA o DENEGADA.
 * @param {Object} datosResolucion Datos de resolución.
 * @param {string} actorEmail Email del actor que resuelve.
 * @returns {{ok: boolean, data: {id_solicitud: string, estado: string, pdf_url: string, doc_url: string}}}
 */
function resolverSolicitud(idSolicitud, decision, datosResolucion, actorEmail) {
  var safeId = String(idSolicitud === null || idSolicitud === undefined ? '' : idSolicitud).trim();
  var safeDecision = String(decision === null || decision === undefined ? '' : decision).trim().toUpperCase();
  var safeActor = String(actorEmail === null || actorEmail === undefined ? '' : actorEmail).trim().toLowerCase();
  var datos = datosResolucion || {};

  if (!safeId) {
    throw new Error('VALIDATION_ERROR: idSolicitud es obligatorio.');
  }

  if (!safeActor) {
    throw new Error('VALIDATION_ERROR: actorEmail es obligatorio.');
  }

  assertInstitutionalUser(safeActor);

  var solicitud = findById(safeId);

  if (!solicitud) {
    throw new Error('NOT_FOUND: solicitud no encontrada.');
  }

  if (
    String(solicitud.estado === null || solicitud.estado === undefined ? '' : solicitud.estado)
      .trim()
      .toUpperCase() !== 'PENDIENTE'
  ) {
    throw new Error('CONFLICT: la solicitud no está en estado PENDIENTE.');
  }

  var permisoKey = String(solicitud.permiso_key === null || solicitud.permiso_key === undefined ? '' : solicitud.permiso_key).trim();
  var permisoConfig = findByPermisoKey(permisoKey);

  if (!permisoConfig) {
    throw new Error('NOT_FOUND: configuración de permiso no encontrada.');
  }

  assertCanResolve(safeActor, solicitud.etapa, solicitud.categoria_permiso);
  assertDecisionAllowed(safeDecision);

  var resolutor = _resolverSolicitud_buildResolucionContext_(safeActor, solicitud, datos);
  var basePatch = buildResolucionPatch(solicitud, safeDecision, datos, resolutor);

  var acumuladosPatch = {
    acumulado_previo_curso: '',
    acumulado_post_resolucion: '',
    exceso_sobre_maximo: '',
    alerta_exceso_enviada_direccion: ''
  };

  var requiereAcumulado = String(permisoConfig.requiere_acumulado === null || permisoConfig.requiere_acumulado === undefined ? '' : permisoConfig.requiere_acumulado)
    .trim()
    .toUpperCase() === 'SI';

  if (requiereAcumulado && basePatch.estado_resolucion === 'ACEPTADA') {
    try {
      var unidadControl = String(permisoConfig.unidad_control === null || permisoConfig.unidad_control === undefined ? '' : permisoConfig.unidad_control)
        .trim()
        .toUpperCase();

      var maximoPorCurso = permisoConfig.maximo_por_curso;

      var previo = calcularAcumuladoPrevio(
        solicitud.email_institucional_profesor,
        solicitud.permiso_key,
        solicitud.curso_escolar,
        unidadControl
      );

      var autorizadoBase = 0;

      if (unidadControl === 'HORAS') {
        autorizadoBase = Number(basePatch.horas_autorizadas || 0);
      } else if (unidadControl === 'DIAS') {
        autorizadoBase = Number(basePatch.dias_autorizados || 0);
      }

      var posterior = simularAcumuladoPosterior(previo, autorizadoBase);
      var exceso = evaluarExceso(maximoPorCurso, posterior);

      acumuladosPatch.acumulado_previo_curso = previo;
      acumuladosPatch.acumulado_post_resolucion = posterior;
      acumuladosPatch.exceso_sobre_maximo = exceso ? 'SI' : 'NO';
      acumuladosPatch.alerta_exceso_enviada_direccion = 'NO';
    } catch (eAc) {
      throw new Error('EXTERNAL_ERROR: error calculando acumulados.');
    }
  }

  var pdfInfo;

  try {
    var pdfPayload = Object.assign({}, solicitud, basePatch);
    assertGenerable(pdfPayload);
    pdfInfo = generateFinalPdf(pdfPayload);
  } catch (ePdf) {
    throw new Error('EXTERNAL_ERROR: error generando PDF final.');
  }

  var finalPatch = _resolverSolicitud_applyPostResolutionPatch_(
    solicitud,
    basePatch,
    acumuladosPatch,
    pdfInfo,
    nowDate()
  );

  try {
    updateSolicitud(safeId, finalPatch);
  } catch (eUp) {
    throw new Error('EXTERNAL_ERROR: error actualizando la solicitud.');
  }

  var notificationPayload = Object.assign({}, solicitud, finalPatch);

  try {
    auditStateChange(
      safeId,
      solicitud.estado,
      finalPatch.estado_resolucion,
      _resolverSolicitud_buildAuditPayload_(safeActor, solicitud, finalPatch, 'STATE_CHANGE')
    );

    auditEvent(
      'RESUELTA',
      _resolverSolicitud_buildAuditPayload_(safeActor, solicitud, finalPatch, 'RESUELTA')
    );
  } catch (eAudit) {
    try {
      auditError('AUDIT_ERROR_RESOLUCION', eAudit, {
        id_solicitud: safeId,
        actor_email: safeActor,
        origen: 'SISTEMA'
      });
    } catch (eAudit2) {}
  }

  try {
    notificarResolucionProfesor(notificationPayload);
  } catch (eNotifProf) {
    try {
      auditError('NOTIF_PROF_ERROR', eNotifProf, {
        id_solicitud: safeId,
        actor_email: safeActor,
        origen: 'SISTEMA'
      });
    } catch (ignore1) {}
  }

  try {
    notificarResolucionDireccion(notificationPayload);
  } catch (eNotifDir) {
    try {
      auditError('NOTIF_DIR_ERROR', eNotifDir, {
        id_solicitud: safeId,
        actor_email: safeActor,
        origen: 'SISTEMA'
      });
    } catch (ignore2) {}
  }

  if (finalPatch.estado_resolucion === 'ACEPTADA') {
    try {
      var jefaturas = listJefaturas(solicitud.etapa, solicitud.categoria_permiso) || [];

      if (jefaturas.length > 0) {
        notificarJefaturaResolucion(notificationPayload, jefaturas);
      }
    } catch (eJef) {
      try {
        auditError('NOTIF_JEF_ERROR', eJef, {
          id_solicitud: safeId,
          actor_email: safeActor,
          origen: 'SISTEMA'
        });
      } catch (ignore3) {}
    }
  }

  if (finalPatch.estado_resolucion === 'ACEPTADA' && finalPatch.exceso_sobre_maximo === 'SI') {
    try {
      notificarExcesoADireccion(notificationPayload, {
        acumulado_previo_curso: finalPatch.acumulado_previo_curso,
        acumulado_post_resolucion: finalPatch.acumulado_post_resolucion,
        maximo_por_curso: permisoConfig.maximo_por_curso
      });

      try {
        updateSolicitud(safeId, {
          alerta_exceso_enviada_direccion: 'SI',
          actualizado_el: nowDate(),
          actualizado_por_email: safeActor
        });
      } catch (ignoreUpdateAlert) {}
    } catch (eExceso) {
      try {
        auditError('NOTIF_EXCESO_ERROR', eExceso, {
          id_solicitud: safeId,
          actor_email: safeActor,
          origen: 'SISTEMA'
        });
      } catch (ignore4) {}
    }
  }

  return {
    ok: true,
    data: {
      id_solicitud: safeId,
      estado: finalPatch.estado_resolucion,
      pdf_url: finalPatch.pdf_url || '',
      doc_url: finalPatch.doc_url || ''
    }
  };
}

/**
 * Construye contexto de resolutor para buildResolucionPatch.
 *
 * @param {string} actorEmail Email actor normalizado.
 * @param {Object} solicitud Solicitud actual.
 * @param {Object} datosResolucion Datos recibidos.
 * @returns {{nombre_resuelve: string, email_resuelve: string}}
 * @private
 */
function _resolverSolicitud_buildResolucionContext_(actorEmail, solicitud, datosResolucion) {
  var nombre = '';

  if (datosResolucion && datosResolucion.nombre_resuelve) {
    nombre = String(datosResolucion.nombre_resuelve).trim();
  }

  if (!nombre && solicitud && solicitud.nombre_resuelve) {
    nombre = String(solicitud.nombre_resuelve).trim();
  }

  if (!nombre) {
    nombre = actorEmail;
  }

  return {
    nombre_resuelve: nombre,
    email_resuelve: actorEmail
  };
}

/**
 * Aplica patch posterior a resolución.
 *
 * @param {Object} solicitud Solicitud actual.
 * @param {Object} basePatch Patch de resolución.
 * @param {Object} acumuladosPatch Patch acumulados.
 * @param {Object} pdfInfo Resultado generateFinalPdf().
 * @param {Date} now Fecha actual.
 * @returns {Object} Patch final combinado.
 * @throws {Error} EXTERNAL_ERROR si pdfInfo es inválido.
 * @private
 */
function _resolverSolicitud_applyPostResolutionPatch_(solicitud, basePatch, acumuladosPatch, pdfInfo, now) {
  if (!pdfInfo || !pdfInfo.pdfUrl || !pdfInfo.docUrl) {
    throw new Error('EXTERNAL_ERROR: resultado PDF inválido.');
  }

  var patch = {};

  Object.keys(basePatch || {}).forEach(function(k) {
    patch[k] = basePatch[k];
  });

  patch.doc_url = pdfInfo.docUrl;
  patch.pdf_url = pdfInfo.pdfUrl;
  patch.fecha_generacion_documento = pdfInfo.fechaGeneracion ? pdfInfo.fechaGeneracion : now;

  patch.acumulado_previo_curso = acumuladosPatch.acumulado_previo_curso;
  patch.acumulado_post_resolucion = acumuladosPatch.acumulado_post_resolucion;
  patch.exceso_sobre_maximo = acumuladosPatch.exceso_sobre_maximo;
  patch.alerta_exceso_enviada_direccion = acumuladosPatch.alerta_exceso_enviada_direccion;

  patch.fecha_envio_resolucion = now;
  patch.fecha_notificacion_profesor = now;

  patch.actualizado_el = now;
  patch.actualizado_por_email = patch.email_resuelve || '';

  return patch;
}

/**
 * Construye payload unificado para auditoría.
 *
 * @param {string} actorEmail Email actor.
 * @param {Object} solicitud Solicitud original.
 * @param {Object} patch Patch aplicado.
 * @param {string} tipoEvento Tipo de evento.
 * @returns {Object} Contexto de auditoría.
 * @private
 */
function _resolverSolicitud_buildAuditPayload_(actorEmail, solicitud, patch, tipoEvento) {
  var estadoAnterior = '';

  if (solicitud && solicitud.estado_resolucion) {
    estadoAnterior = solicitud.estado_resolucion;
  } else if (solicitud && solicitud.estado) {
    estadoAnterior = solicitud.estado;
  }

  var estadoNuevo = patch && patch.estado_resolucion ? patch.estado_resolucion : '';

  return {
    id_solicitud: solicitud && solicitud.id_solicitud ? solicitud.id_solicitud : '',
    actor_email: actorEmail,
    actor_rol: 'RESOLUTOR',
    tipo_evento: tipoEvento || 'EVENTO',
    estado_anterior: estadoAnterior,
    estado_nuevo: estadoNuevo,
    campo_modificado: 'estado',
    valor_anterior: estadoAnterior,
    valor_nuevo: estadoNuevo,
    detalle_evento: 'Resolución de solicitud',
    origen: 'SISTEMA'
  };
}