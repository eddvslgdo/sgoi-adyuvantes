/**
 * ESLABÓN 5: AGENTE DESARROLLO EXPERIMENTAL (Gemini Flash)
 * Convierte la fórmula aprobada en un protocolo reproducible a escala de laboratorio.
 */
function generarProtocoloFinal(contexto) {
  contexto.estado.faseActual = "AGENTE_4_LABORATORIO";

  const datosAuditoria = JSON.stringify(contexto.validacion);
  const requerimientos = JSON.stringify(contexto.requerimientos);

  const promptAgente4 = `Eres un Investigador de Desarrollo Experimental en Laboratorio.
Tu función es tomar la fórmula validada y estructurar el informe final y protocolo experimental para elaborar 500g de prototipo.

REQUERIMIENTOS INICIALES:
${requerimientos}

DATOS DE AUDITORÍA Y FÓRMULA GANADORA:
${datosAuditoria}

INSTRUCCIONES TÉCNICAS:
1. Extrae los valores de dificultad, estabilidad estimada, costo relativo, evaluación técnica y recomendación de compras provenientes de los datos de auditoría.
2. Diseña el protocolo de preparación paso a paso a escala laboratorio (500g) usando equipos de vaso de precipitado, agitación y orden de adición.
3. Genera la matriz de perfil de funcionalidad (asigna un nivel del 1 al 4 a las propiedades solicitadas).

Devuelve EXCLUSIVAMENTE un JSON puro con esta estructura exacta para el Frontend:
{
  "dificultad": "Baja / Moderada / Crítica",
  "estabilidad_estimada": "Ej: 95%",
  "costo_relativo": "Económico / Estándar / Premium",
  "evaluacion_tecnica": "Resumen del dictamen técnico...",
  "recomendacion_compras": "Justificación de compras externas...",
  "protocolo_estabilidad": "Parámetros CIPAC sugeridos a 54°C y congelación.",
  "diagrama_manufactura": "Pasos detallados de laboratorio para preparar 500g...",
  "evaluaciones_adicionales": "Ensayos recomendados (Tensión superficial, etc.).",
  "perfil_funcionalidad": [
    {
      "propiedad": "Nombre de la propiedad",
      "nivel": 4
    }
  ],
  "componentes": [
    {
      "sap": "Código SAP o 'N/A' o 'EXTERNO'",
      "nombre": "Nombre del componente",
      "funcion": "Rol en la mezcla",
      "porcentaje": "15.0%"
    }
  ]
}`;

  const modeloSeleccionado = contexto.inputsRaw.modelo_ia || "gemini-3.5-flash-lite";
  const respuesta = ejecutarPeticionGemini(promptAgente4, modeloSeleccionado);

  if (!respuesta.success || !respuesta.datosFormulacion) {
    throw new Error("Agente Laboratorio devolvió un formato inválido o vacío.");
  }

  // Asignamos el resultado asegurándonos de que no sea nulo
  contexto.laboratorio = respuesta.datosFormulacion;

  return contexto;
}