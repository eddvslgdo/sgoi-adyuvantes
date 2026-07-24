/**
 * FLUJO PRINCIPAL DE INVESTIGACIÓN Y DESARROLLO (PIPELINE AGÉNTICO EN 5 NIVELES)
 */

/** Orquestador.js */

function diseñarCoadyuvanteV2(datosFrontend) {
  let contexto;
  try {
    // 1. INICIALIZACIÓN DE ESTADO
    contexto = inicializarContexto(datosFrontend);

    // 2. NORMALIZACIÓN DE DATOS (JS)
    contexto = normalizarRequerimientos(contexto);

    // 3. AGENTE 1: DISEÑO CONCEPTUAL (Gemini Flash)
    contexto = generarPerfilConceptual(contexto);

    // 4. LECTURA DE INVENTARIO CORPORATIVO (RAG)
    contexto.estado.faseActual = "RECUPERACIÓN_INVENTARIO";
    contexto.inventarioCompleto = obtenerInventario(); 

    // 5. MOTOR DE MATCHING Y SCORING MATEMÁTICO (JS)
    contexto = calcularMatching(contexto);

    // 6. AGENTE 2: ARQUITECTO DE 3 VARIANTES (Gemini Flash)
    contexto = construirCandidatas(contexto);

    // 7. AGENTE 3: AUDITOR Y REVISOR DE MEJOR OPCIÓN (Gemini Pro)
    contexto = revisarYSeleccionar(contexto);

    // 8. AGENTE 4: DESARROLLO EXPERIMENTAL Y JSON FINAL (Gemini Flash)
    contexto = generarProtocoloFinal(contexto);

    // VALIDACIÓN DE SEGURIDAD
    if (!contexto.laboratorio || typeof contexto.laboratorio !== "object") {
      throw new Error("El Agente 4 (Laboratorio) no devolvió un objeto válido de resultados.");
    }

    // Marcar como exitoso
    contexto.estado.faseActual = "FINALIZADO";
    contexto.estado.exitoso = true;

    // Retorno directo que el Frontend ya sabe renderizar
    return {
      success: true,
      datosFormulacion: contexto.laboratorio
    };

  } catch (error) {
    console.error(`Error crítico en fase [${contexto ? contexto.estado.faseActual : "DESCONOCIDA"}]:`, error);
    return {
      success: false,
      error: `Error en Pipeline [Fase: ${contexto ? contexto.estado.faseActual : "Inicial"}]: ${error.message}`
    };
  }
}