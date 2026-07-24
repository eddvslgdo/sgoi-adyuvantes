/**
 * ESTRUCTURA CENTRAL DEL PIPELINE DE I+D
 * Este objeto es el único estado global que se pasará entre funciones.
 */
function inicializarContexto(datosFrontend) {
  return {
    // ---------------------------------------------------
    // 1. ENTRADAS (Llenado por: Frontend)
    // ---------------------------------------------------
    inputsRaw: datosFrontend, // Lo que envió el usuario sin procesar
    
    // ---------------------------------------------------
    // 2. NORMALIZACIÓN (Llenado por: normalizarRequerimientos - JS)
    // ---------------------------------------------------
    requerimientos: {
      cultivos: [],           // Array de strings limpios
      plaguicidas: [],        // Array de strings limpios
      requiereOmri: false,    // Booleano estricto
      funcionalidades: [],    // Array de objetos { funcion: "Dispersante", nivel: 4 }
    },

    // ---------------------------------------------------
    // 3. DISEÑO CONCEPTUAL (Llenado por: Agente 1 - Gemini Flash)
    // ---------------------------------------------------
    perfilObjetivo: {
      rangoHlbDeseado: null,       // Ej: [11.0, 13.5]
      rangoPhDeseado: null,        // Ej: [4.5, 6.5]
      restriccionesQuimicas: [],   // Ej: ["Evitar aniónicos por incompatibilidad"]
      arquitecturaTeorica: []      // Ej: [{ rol: "Surfactante", proporcionEstimada: "20%" }]
    },

    // ---------------------------------------------------
    // 4. BASES DE DATOS (Llenado por: recuperarInventario - JS)
    // ---------------------------------------------------
    inventarioCompleto: [], // Todo el array parseado del Google Sheet

    // ---------------------------------------------------
    // 5. FILTRADO MATEMÁTICO (Llenado por: motorMatching - JS)
    // ---------------------------------------------------
    candidatos: {
      aprobadosTop: [], // Materias primas viables ordenadas por Score
      descartados: []   // Por si Gemini Pro necesita saber qué NO usar y por qué
    },

    // ---------------------------------------------------
    // 6. CREACIÓN (Llenado por: Agente 2 - Gemini Flash)
    // ---------------------------------------------------
    formulaciones: [], // Array con 3 opciones (Alta Performance, Balanceada, Bajo Costo)

    // ---------------------------------------------------
    // 7. AUDITORÍA (Llenado por: Agente 3 - Gemini Pro)
    // ---------------------------------------------------
    validacion: {
      formulaGanadora: {},     // La fórmula elegida
      modificaciones: [],      // Qué le corrigió el revisor a la fórmula original
      comprasRecomendadas: []  // SAPs externos justificados
    },

    // ---------------------------------------------------
    // 8. CIERRE Y ESCALA (Llenado por: Agente 4 - Gemini Flash)
    // ---------------------------------------------------
    laboratorio: {
      protocoloFabricacion: [],
      pruebasRecomendadas: []
    },

    // ---------------------------------------------------
    // 9. METADATA DEL SISTEMA (Llenado por: Orquestador)
    // ---------------------------------------------------
    estado: {
      faseActual: "INICIALIZACIÓN",
      exitoso: true,
      erroresCriticos: []
    }
  };
}