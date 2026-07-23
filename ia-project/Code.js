const GEMINI_API_KEY =
  PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");

function doGet() {
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("AgroSystem Suite | RAG Designer")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1");
}

/**
 * FUNCIÓN PARA LEER LA BASE DE DATOS DE MATERIAS PRIMAS (RAG)
 */
function obtenerInventario() {
  try {
    const libro = SpreadsheetApp.openById(
      "1duNXyrgmefH09rgX_SlhaW0nuu7neETE4vvCg_A65qM",
    );
    const hoja = libro.getSheetByName("db_materia_prima");

    if (!hoja) throw new Error("No se encontró la pestaña 'db_materia_prima'.");

    const datos = hoja.getDataRange().getValues();
    const encabezados = datos.shift();

    const inventario = datos.map((fila) => {
      let obj = {};
      encabezados.forEach((titulo, index) => {
        if (titulo) obj[titulo.toString().trim()] = fila[index];
      });
      return obj;
    });

    return inventario;
  } catch (e) {
    throw new Error("Error al leer Google Sheets: " + e.message);
  }
}

/**
 * MOTOR DE DISEÑO INVERSO (RAG + GEMINI)
 */
function diseñarCoadyuvanteIA(datos) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);

    if (!GEMINI_API_KEY)
      throw new Error(
        "API KEY de Gemini no configurada en las Propiedades del Script.",
      );

    // 1. Obtener los materiales disponibles
    const inventarioJSON = obtenerInventario();
    const inventarioTexto = JSON.stringify(inventarioJSON);
    let matrizTexto = datos.matriz
      .map((item) => `- ${item.funcionalidad}: Nivel ${item.potencia_deseada}`)
      .join("\n");

// 2. Prompt Estratégico Nivel Experto (Arquitectura Comercial Dinámica)
    const promptEstrategico = `Eres el Director Científico Senior de Formulación Agrícola.
Tu misión es diseñar un coadyuvante (PRODUCTO COMERCIAL TERMINADO).

INVENTARIO DISPONIBLE (JSON):
${inventarioTexto}

REQUERIMIENTOS DEL CLIENTE:
- Cultivos: ${datos.cultivos}
- Plaguicida Acompañante: ${datos.plaguicidas}
- Certificación exigida: ${datos.organico}
- Perfil de Desempeño Solicitado:
${matrizTexto}

INSTRUCCIONES TÉCNICAS ESTRICTAS Y OBLIGATORIAS:
1. ECOSISTEMA COMERCIAL COMPLETO: Tu objetivo es entregar un producto final listo para venta. ESTÁ PROHIBIDO formular únicamente mezclando activos puros. SIEMPRE debes estructurar una arquitectura completa que incluya: Activos principales, Emulsificantes/Surfactantes, Acondicionadores de mezcla/Compatibilizantes, y OBLIGATORIAMENTE un Vehículo/Diluyente (ej. "Agua desionizada (C.S.P.)", SAP: N/A, u otro solvente) para completar el 100%.
2. LÓGICA DE BALANCE DE MATERIA: No tienes límites numéricos predefinidos. Analiza internamente la compatibilidad fisicoquímica, interacciones estéricas, pH y HLB global para definir los porcentajes exactos. Si el producto requiere una carga activa alta o baja, justifícalo con base en la estabilidad termodinámica de la mezcla.
3. PERFIL DE DESEMPEÑO REAL (EXTRAS): Evalúa la fórmula final. Determina su eficacia (1 al 4) para las funciones solicitadas y añade beneficios extra reales. ¡SÉ EXTREMADAMENTE CRÍTICO! Es químicamente imposible que una fórmula sea perfecta en todo. Califica con 1 (Malo) o 2 (Regular) lo que la fórmula no cubra eficientemente.
4. REGLA OMRI Y EXTERNOS: Si se exige certificación orgánica y el inventario no tiene insumos viables, formula la mezcla ideal utilizando materias primas "EXTERNAS" del mercado global.
5. SÍNTESIS, ESTABILIDAD Y PRUEBAS: Define el método de laboratorio paso a paso, pruebas CIPAC a 54°C/Frío, y evaluaciones fisicoquímicas adicionales.

Devuelve EXCLUSIVAMENTE un JSON puro con esta estructura:
{
  "dificultad": "Baja / Moderada / Crítica",
  "estabilidad_estimada": "Porcentaje (Ej: 95%)",
  "costo_relativo": "Económico / Estándar / Premium",
  "evaluacion_tecnica": "Dictamen profundo sobre interacciones químicas, solubilidad y justificación de las proporciones elegidas.",
  "recomendacion_compras": "Justifica qué materiales EXTERNOS se deben comprar, de ser necesario.",
  "protocolo_estabilidad": "Parámetros de prueba a 54°C, frío y tiempo de anaquel.",
  "diagrama_manufactura": "Pasos para preparar el prototipo a escala de laboratorio.",
  "evaluaciones_adicionales": "Pruebas recomendadas para asegurar el éxito.",
  "perfil_funcionalidad": [
    {
      "propiedad": "Nombre de la propiedad",
      "nivel": 3
    }
  ],
  "componentes": [
    {
      "sap": "Código SAP (Usa 'N/A' para el vehículo, o 'EXTERNO' para compras)",
      "nombre": "COMPONENTE",
      "funcion": "Justificación precisa de su rol en la arquitectura",
      "porcentaje": "Masa %"
    }
  ]
}`;

    return ejecutarPeticionGemini(promptEstrategico);
  } catch (error) {
    return { success: false, error: error.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * CONEXIÓN AL MOTOR IA CON BACKOFF EXPONENCIAL Y LIMPIEZA DE JSON
 */
function ejecutarPeticionGemini(promptTexto) {
  // CORRECCIÓN 1: Modelo correcto (gemini-1.5-flash)
  // Cambiamos el nombre a gemini-1.5-flash-latest
  // Usando el endpoint v1 (producción) en lugar de v1beta
  // URL conectada al modelo 3.5 Flash que tu API Key sí soporta
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

  const payload = {
    contents: [{ parts: [{ text: promptTexto }] }],
    generationConfig: { response_mime_type: "application/json" },
  };

  const opciones = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  const maxReintentos = 5;
  let delay = 4000;

  for (let intento = 1; intento <= maxReintentos; intento++) {
    try {
      const respuesta = UrlFetchApp.fetch(url, opciones);
      const codigo = respuesta.getResponseCode();
      const texto = respuesta.getContentText();

      if (codigo === 200) {
        const json = JSON.parse(texto);
        let textoIA = json.candidates[0].content.parts[0].text;

        // CORRECCIÓN 2: Limpiar el Markdown antes de parsear el JSON
        textoIA = textoIA
          .replace(/```json/gi, "")
          .replace(/```/gi, "")
          .trim();

        return { success: true, datosFormulacion: JSON.parse(textoIA) };
      }

      if ((codigo === 429 || codigo === 503) && intento < maxReintentos) {
        Utilities.sleep(delay);
        delay *= 2;
        continue;
      }

      throw new Error(`Error API HTTP ${codigo}: ${texto}`);
    } catch (error) {
      if (intento === maxReintentos) {
        return { success: false, error: error.toString() };
      }
      Utilities.sleep(delay);
      delay *= 2;
    }
  }
}

function forzarAutorizacion() {
  SpreadsheetApp.openById("1duNXyrgmefH09rgX_SlhaW0nuu7neETE4vvCg_A65qM");
}

function testGeminiAPI() {
  const KEY =
    PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");

  if (!KEY) {
    console.error("❌ LA API KEY ESTÁ VACÍA O NO SE LEYÓ CORRECTAMENTE.");
    return;
  }

  // AQUÍ ESTÁ LA URL ACTUALIZADA PARA LA PRUEBA (usando v1)
  // URL conectada al modelo 3.5 Flash que tu API Key sí soporta
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  console.log("URL generada:", url.replace(KEY, "OCULTA_POR_SEGURIDAD"));

  const payload = {
    contents: [
      { parts: [{ text: "Hola, responde solo con la palabra 'Conectado'." }] },
    ],
  };

  const opciones = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  const respuesta = UrlFetchApp.fetch(url, opciones);
  const codigo = respuesta.getResponseCode();
  const texto = respuesta.getContentText();

  console.log(`Código HTTP devuelto: ${codigo}`);
  console.log(`Respuesta completa del servidor: ${texto}`);
}

function listarModelosGemini() {
  const KEY =
    PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");

  if (!KEY) {
    console.error("❌ LA API KEY ESTÁ VACÍA.");
    return;
  }

  // URL para listar los modelos disponibles para tu cuenta
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${KEY}`;

  const opciones = {
    method: "get",
    muteHttpExceptions: true,
  };

  const respuesta = UrlFetchApp.fetch(url, opciones);
  const json = JSON.parse(respuesta.getContentText());

  if (json.models) {
    console.log("✅ MODELOS COMPATIBLES CON TU API KEY:");
    json.models.forEach((modelo) => {
      // Filtramos solo los que son de texto/gemini y soportan generateContent
      if (
        modelo.name.includes("gemini") &&
        modelo.supportedGenerationMethods.includes("generateContent")
      ) {
        console.log(`-> Nombre exacto: ${modelo.name}`);
      }
    });
  } else {
    console.log("Error al consultar:", json);
  }
}
