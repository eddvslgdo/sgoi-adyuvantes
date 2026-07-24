/**
 * ESLABÓN 3: AGENTE ARQUITECTO
 */
function construirCandidatas(contexto) {
  contexto.estado.faseActual = "AGENTE_2_ARQUITECTO";

  const perfilTeorico = JSON.stringify(contexto.perfilObjetivo);
  const topCandidatos = JSON.stringify(contexto.candidatos.aprobadosTop);
  const requerimientos = JSON.stringify(contexto.requerimientos);

const promptAgente2 = `Eres un Arquitecto de Formulación Agrícola Senior.
Tu objetivo es diseñar TRES (3) propuestas de formulación comercial.

REQUERIMIENTOS SOLICITADOS POR EL USUARIO:
${requerimientos}

INVENTARIO DISPONIBLE (MATERIAS PRIMAS QUE PASARON LOS FILTROS):
${topCandidatos}

REGLAS QUÍMICAS DE HIERRO (VIOLARLAS ES ERROR GRAVE):
1. NOMBRE DEL COMPONENTE: Usa SIEMPRE el "nombre_comercial" tal cual aparece en el inventario.
2. PROHIBIDO AGREGAR BUFFER INNECESARIO: Si no pidieron "Acidificante" o "Buffer", PROHIBIDO incluir Ácido Cítrico o similares.
3. AJUSTE DE BALANCE AL 100%: Usa "Agua desionizada (C.S.P.)" (SAP: "N/A") SOLO para completar el porcentaje faltante. 
4. PROHIBIDO FÓRMULAS 100% AGUA: ¡BAJO NINGUNA CIRCUNSTANCIA puedes devolver una fórmula compuesta solo por vehículo/agua! 
5. USO OBLIGATORIO DE EXTERNOS: Si el 'Inventario Disponible' está vacío (ej. por restricciones OMRI) o carece de los activos necesarios para cubrir las funciones pedidas (como Dispersión o Penetración), es OBLIGATORIO que incluyas las materias primas ideales usando el SAP: "EXTERNO" y su nombre real del mercado global.

Devuelve EXCLUSIVAMENTE un JSON puro con esta estructura:
{
  "variantes": [
    {
      "tipo": "AltaPerformance",
      "descripcionEstrategica": "...",
      "componentes": [
        {
          "sap": "Código SAP o 'N/A' o 'EXTERNO'",
          "nombre": "Nombre comercial",
          "funcion": "Función que satisface",
          "porcentaje": 15.0
        }
      ]
    },
    { "tipo": "Balanceada", "descripcionEstrategica": "...", "componentes": [] },
    { "tipo": "BajoCosto", "descripcionEstrategica": "...", "componentes": [] }
  ]
}`;

  const modeloSeleccionado = contexto.inputsRaw.modelo_ia || "gemini-3.5-flash-lite";
  const respuesta = ejecutarPeticionGemini(promptAgente2, modeloSeleccionado);

  if (!respuesta.success) {
    throw new Error("Agente Arquitecto falló: " + respuesta.error);
  }

  contexto.formulaciones = respuesta.datosFormulacion.variantes;
  return contexto;
}