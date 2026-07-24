/**
 * ESLABÓN 0: NORMALIZACIÓN DE REQUERIMIENTOS (JavaScript Puro)
 * Estandariza los datos crudos recibidos desde el Frontend.
 */
function normalizarRequerimientos(contexto) {
  contexto.estado.faseActual = "NORMALIZACIÓN";
  const crudos = contexto.inputsRaw;

  // 1. Limpieza de arrays de texto
  contexto.requerimientos.cultivos = crudos.cultivos ? crudos.cultivos.split(",").map(c => c.trim()) : ["Todos"];
  contexto.requerimientos.plaguicidas = crudos.plaguicidas ? crudos.plaguicidas.split(",").map(p => p.trim()) : ["General"];
  
  // 2. Validación booleana para certificación ecológica
  contexto.requerimientos.requiereOmri = crudos.organico && (
    crudos.organico.toUpperCase().includes("ORGÁNICO") || 
    crudos.organico.toUpperCase().includes("OMRI")
  );

  // 3. Normalización numérica de la matriz de funcionalidades
  if (crudos.matriz && Array.isArray(crudos.matriz)) {
    contexto.requerimientos.funcionalidades = crudos.matriz.map(item => {
      let potencia = parseInt(item.potencia_deseada.split("/")[0]); 
      return {
        funcion: item.funcionalidad.trim(),
        nivelRequerido: isNaN(potencia) ? 2 : potencia
      };
    });
  }

  // Ordenar prioridades de mayor a menor nivel exigido
  contexto.requerimientos.funcionalidades.sort((a, b) => b.nivelRequerido - a.nivelRequerido);
  
  return contexto;
}