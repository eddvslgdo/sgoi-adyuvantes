// frontend/src/api.js

const GOOGLE_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz1gboZaFnYq3qCy8oAXI3UZsz_30AC9xGag2LYvvktfYnX9ICaIr8NM3V77s4oWNgTNQ/exec";

export const llamarBackend = async (accion, payload = {}) => {
  // ESCENARIO 1: Localhost (Vite)
  if (import.meta.env.DEV) {
    console.log(`[LOCAL] Ejecutando acción: ${accion}`);

    // Convertimos la petición a formato de formulario tradicional para engañar al CORS de Google
    const datosFormulario = new URLSearchParams();
    datosFormulario.append("datos", JSON.stringify({ accion, payload }));

    const respuesta = await fetch(GOOGLE_WEB_APP_URL, {
      method: "POST",
      body: datosFormulario // Enviamos los datos limpios en la raíz del body
    });

    const resultado = await respuesta.json();
    if (!resultado.exito) throw new Error(resultado.error);
    return resultado.data;
  }

  // ESCENARIO 2: Apps Script Nativo
  else {
    let funcionDestino = accion === 'guardarProducto' ? 'guardarProductoEnSheets' : 'obtenerProductosDesdeSheets';
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler(reject)
        [funcionDestino](payload);
    });
  }
};