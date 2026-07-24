/**
 * ESLABÓN 1: AGENTE CONCEPTUAL (Gemini Flash)
 * Genera el perfil químico objetivo (HLB, pH, restricciones) en función de los requerimientos.
 */
function generarPerfilConceptual(contexto) {
  contexto.estado.faseActual = "AGENTE_1_CONCEPTUAL";
  
  const reqStr = JSON.stringify(contexto.requerimientos);

  const promptAgente1 = `Eres el Director Científico Teórico de I+D Agrícola.
Tu misión NO es formular un producto final con marcas o inventario, sino definir el "Perfil Químico Ideal" que debe cumplir un coadyuvante basado en estos requerimientos:

REQUERIMIENTOS NORMALIZADOS:
${reqStr}

INSTRUCCIONES DE ANALISIS TÉCNICO:
1. Determina el rango numérico de HLB ideal según la familia de plaguicidas o cultivos indicados.
2. Determina el rango de pH de la solución.
3. Identifica restricciones químicas críticas (ej. incompatibilidades iónicas, restricciones por normatividad orgánica, etc.).
4. Propón una "Arquitectura Teórica" de funciones y proporciones preliminares para balancear la mezcla.

Devuelve EXCLUSIVAMENTE un JSON puro con esta estructura exacta:
{
  "rangoHlbDeseado": [11.0, 13.5],
  "rangoPhDeseado": [5.5, 7.0],
  "restriccionesQuimicas": ["Evitar surfactantes aniónicos fuertes", "No exceder 5% en solventes polares"],
  "arquitecturaTeorica": [
    { 
      "rol": "Surfactante / Humectante", 
      "proporcionEstimada": 20.0, 
      "justificacion": "Requerido para romper tensión superficial en hoja cerosa." 
    }
  ]
}`;

  const modeloSeleccionado = contexto.inputsRaw.modelo_ia || "gemini-3.5-flash-lite"; 
  const respuesta = ejecutarPeticionGemini(promptAgente1, modeloSeleccionado);
  
  if (!respuesta.success) {
    throw new Error("Agente Conceptual (1) falló: " + respuesta.error);
  }

  contexto.perfilObjetivo = respuesta.datosFormulacion;
  return contexto;
}