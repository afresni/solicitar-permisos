/**
 * 00_Config.gs
 * Configuración central de hojas y cabeceras del proyecto V1.
 */

const APP_CONFIG = Object.freeze({
  TIMEZONE: Session.getScriptTimeZone() || 'Europe/Madrid',
  LOCALE: 'es_ES',

  ALLOWED_DOMAINS: Object.freeze([
    'colegiosjm.es'
  ]),

  TEMPLATE_SOLICITUD_PERMISOS_ID: '15vveU1_9CIVaIpRJkY9EXPPu6BQ1RkX_HwiZkouGhWs',
  PDF_OUTPUT_FOLDER_ID: '1v54MIeLl1ForW145dEZ7xne_FM9G-dSR',

  EXTERNAL_SOURCES: Object.freeze({
    PROFESSORAT_SPREADSHEET_ID: '1P0A6XIjAwQ-UkMHw6ATdjyTjWZV9OCtBBT0u4p9ZZV8',
    PROFESSORAT_SHEET_NAME: 'PROFESSORAT'
  }),

  SHEETS: Object.freeze({
    PROFESSORAT: 'PROFESSORAT',
    SOLICITUDES_PERMISOS: 'SOLICITUDES_PERMISOS',
    CONFIG_PERMISOS: 'CONFIG_PERMISOS',
    CONFIG_RESPONSABLES: 'CONFIG_RESPONSABLES',
    LOGS_PERMISOS: 'LOGS_PERMISOS',
    RECORDATORIOS_PERMISOS: 'RECORDATORIOS_PERMISOS'
  }),

  COLUMNS: Object.freeze({
    PROFESSORAT: Object.freeze([
      'profesor_id',
      'email_institucional',
      'nombre',
      'apellidos',
      'dni',
      'etapa',
      'puesto_trabajo',
      'departamento_o_unidad',
      'activo',
      'fecha_alta',
      'fecha_baja',
      'creado_el',
      'actualizado_el'
    ]),

    SOLICITUDES_PERMISOS: Object.freeze([
      'id_solicitud',
      'estado',
      'curso_escolar',
      'creado_el',
      'actualizado_el',
      'creado_por_email',
      'actualizado_por_email',
      'logo_centro',
      'nombre_centro',
      'departamento_o_unidad_centro',
      'direccion_centro',
      'cp_ciudad',
      'fecha_solicitud',
      'fecha_generacion_documento',
      'email_institucional_profesor',
      'nombre_profesor',
      'apellidos_profesor',
      'dni_profesor',
      'etapa',
      'puesto_trabajo',
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
      'estado_resolucion',
      'check_aceptada',
      'check_denegada',
      'dias_autorizados',
      'horas_autorizadas',
      'observaciones_direccion',
      'fecha_resolucion',
      'nombre_resuelve',
      'email_resuelve',
      'unidad_control',
      'maximo_por_curso',
      'requiere_acumulado',
      'acumulado_previo_curso',
      'acumulado_post_resolucion',
      'exceso_sobre_maximo',
      'alerta_exceso_enviada_direccion',
      'fecha_alerta_exceso',
      'doc_url',
      'pdf_url',
      'recordatorio_programado',
      'recordatorio_enviado',
      'fecha_recordatorio',
      'jefatura_notificada_email',
      'fecha_notificacion_jefatura',
      'fecha_envio_resolucion',
      'fecha_notificacion_profesor',
      'token_resolucion',
      'fecha_envio_email_responsable',
      'email_responsable_resolucion',
      'fecha_resolucion_por_email',
      'metodo_resolucion'
    ]),

    CONFIG_PERMISOS: Object.freeze([
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
    ]),

    CONFIG_RESPONSABLES: Object.freeze([
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
    ]),

    LOGS_PERMISOS: Object.freeze([
      'log_id',
      'id_solicitud',
      'fecha_evento',
      'actor_email',
      'actor_rol',
      'tipo_evento',
      'estado_anterior',
      'estado_nuevo',
      'campo_modificado',
      'valor_anterior',
      'valor_nuevo',
      'detalle_evento',
      'origen',
      'correlacion_id'
    ]),

    RECORDATORIOS_PERMISOS: Object.freeze([
      'recordatorio_id',
      'id_solicitud',
      'destinatario_email',
      'destinatario_rol',
      'tipo_recordatorio',
      'canal_envio',
      'fecha_programada',
      'enviado',
      'fecha_envio',
      'resultado_envio',
      'intentos_envio',
      'ultimo_error',
      'activo',
      'creado_el',
      'actualizado_el'
    ])
  }),

  FEATURE_FLAGS: Object.freeze({
    ENABLE_RECORDATORIOS: false,
    ENABLE_PDF_GENERATION: false,
    ENABLE_EMAIL_NOTIFICATIONS: false
  })
});

function getProjectConfig() {
  return APP_CONFIG;
}

function getSheetNames() {
  return Object.values(APP_CONFIG.SHEETS);
}

function getColumnList(sheetName) {
  const columns = APP_CONFIG.COLUMNS[sheetName];

  if (!columns) {
    throw new Error(
      'CONFIG_ERROR: Hoja no configurada en COLUMNS -> ' + sheetName
    );
  }

  return columns.slice();
}

function getColumnMap(sheetName) {
  const list = getColumnList(sheetName);

  return list.reduce(function(acc, columnName) {
    acc[columnName] = columnName;
    return acc;
  }, {});
}

function getFeatureFlags() {
  return APP_CONFIG.FEATURE_FLAGS;
}