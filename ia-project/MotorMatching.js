/**
 * ESLABÓN 2: MOTOR DE MATCHING MATEMÁTICO (JS Puro)
 */
function calcularMatching(contexto) {
  contexto.estado.faseActual = "MATCHING_INVENTARIO";

  const perfil = contexto.perfilObjetivo;
  const inventario = contexto.inventarioCompleto;
  const requiereOmri = contexto.requerimientos.requiereOmri;

  let candidatosEvaluados = inventario.map(materia => {
    let score = 0;
    let penalizacionCritica = false;
    let justificaciones = [];

    const textoCert = (materia.certificacion || "").toUpperCase();
    const esOrganico = textoCert.includes("OMRI") || textoCert.includes("ORGANIC");
    
    if (requiereOmri && !esOrganico) {
      score -= 1000; 
      penalizacionCritica = true;
      justificaciones.push("Descartado: No es orgánico.");
    }

    if (perfil.rangoHlbDeseado && perfil.rangoHlbDeseado.length === 2 && materia.hlb) {
      const hlbMateria = parseFloat(materia.hlb);
      const hlbMin = perfil.rangoHlbDeseado[0];
      const hlbMax = perfil.rangoHlbDeseado[1];
      
      if (!isNaN(hlbMateria)) {
        if (hlbMateria >= hlbMin && hlbMateria <= hlbMax) {
          score += 30;
        } else {
          const distancia = Math.min(Math.abs(hlbMateria - hlbMin), Math.abs(hlbMateria - hlbMax));
          score += Math.max(0, 15 - (distancia * 2)); 
        }
      }
    }

    if (perfil.arquitecturaTeorica && materia.funcion) {
      const funcionMateria = materia.funcion.toLowerCase();
      const sirveParaAlgo = perfil.arquitecturaTeorica.some(arq => 
        funcionMateria.includes(arq.rol.toLowerCase()) || 
        arq.rol.toLowerCase().includes(funcionMateria)
      );
      if (sirveParaAlgo) score += 40;
    }

    score += 10;

    return {
      sap: materia.sap || "N/A",
      // 👇 AQUÍ ESTABA EL ERROR. AHORA FORZAMOS EL NOMBRE COMERCIAL EXACTO 👇
      nombre: materia.nombre_comercial || materia.nombre || materia.nombre_quimico || "Desconocido", 
      funcion: materia.funcion || "",
      score: score,
      viable: !penalizacionCritica && score > 0,
      notas: justificaciones.join(" ")
    };
  });

  contexto.candidatos.aprobadosTop = candidatosEvaluados
    .filter(c => c.viable)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12); 

  return contexto;
}