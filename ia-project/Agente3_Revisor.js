/**
 * ESLABÓN 4: AGENTE REVISOR Y AUDITOR (Gemini Pro)
 */
function revisarYSeleccionar(contexto) {
  contexto.estado.faseActual = "AGENTE_3_REVISOR";

  const req = JSON.stringify(contexto.requerimientos);
  const perfil = JSON.stringify(contexto.perfilObjetivo);
  const variantes = JSON.stringify(contexto.formulaciones);

  const promptAgente3 = `Eres el Auditor Científico Senior de Formulación Agrícola.
Tu misión es evaluar TRES (3) propuestas de formulación, elegir la mejor y devolverla INTACTA en sus nombres.

REQUERIMIENTOS: ${req}
PROPUESTAS A EVALUAR: ${variantes}

REGLAS DE ORO (PROHIBIDO DESOBEDECER):
1. NOMBRES INTACTOS: Tienes ESTRICTAMENTE PROHIBIDO modificar o inventar el valor del campo "nombre" de las materias primas. Debes devolver el nombre comercial exacto que recibiste en las propuestas.
2. PROHIBIDO AGREGAR BUFFERS: Si el Arquitecto incluyó "Ácido Cítrico", "Citrato", "Buffer" o "Acidificante" y el usuario NO lo pidió, DEBES ELIMINAR ESE COMPONENTE INMEDIATAMENTE.
3. AJUSTE DE PORCENTAJE: Si eliminas un componente no solicitado, suma ese porcentaje sobrante ÚNICAMENTE al "Agua desionizada" (Vehículo) para que la fórmula sume 100.0%.

Devuelve EXCLUSIVAMENTE un JSON con esta estructura:
{
  "tipoSeleccionado": "Nombre de la variante elegida",
  "justificacionAuditoria": "Análisis técnico...",
  "evaluacionTecnica": "Análisis de estabilidad...",
  "recomendacionCompras": "Justificación de compras o 'No se requieren compras'...",
  "dificultadEstimada": "Baja / Moderada / Crítica",
  "estabilidadEstimada": "Ej: 95%",
  "costoRelativo": "Económico / Estándar / Premium",
  "formulaAprobada": [
    {
      "sap": "Código SAP",
      "nombre": "NOMBRE EXACTO DE LA PROPUESTA (Ej: SURFACPOL...)",
      "funcion": "Función técnica",
      "porcentaje": 15.0
    }
  ]
}`;

  // Usamos el modelo experto si fue seleccionado, si no, flash
  let modeloExperto = "gemini-3.5-flash"; 
  if (contexto.inputsRaw.modelo_ia && contexto.inputsRaw.modelo_ia.includes("pro")) {
    modeloExperto = "gemini-3.5-flash"; // En tu configuración actual ambos mapean al mismo por estabilidad, pero puedes forzar 'gemini-1.5-pro' si tu API lo soporta.
  }

  const respuesta = ejecutarPeticionGemini(promptAgente3, modeloExperto);

  if (!respuesta.success) {
    throw new Error("Agente Revisor falló: " + respuesta.error);
  }

  contexto.validacion = respuesta.datosFormulacion;
  return contexto;
}