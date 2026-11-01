/*
 * Formulario público de inscripciones conectado a CCTA Inscripciones API.
 * La URL de la API se define con window.CCTA_API_BASE_URL antes de cargar este archivo.
 */
(() => {
  const API_BASE_URL = window.CCTA_API_BASE_URL || "http://localhost:8080";
  const requestedActivityId = new URLSearchParams(window.location.search).get("actividad");
  const statusBox = document.querySelector("#service-status");
  const activitySelect = document.querySelector("#actividadId");
  const activityDetails = document.querySelector("#actividad-detalle");
  const activityChoiceField = document.querySelector("#actividad-choice-field");
  const activityLabel = document.querySelector("#actividad-label");
  const selectedActivityTitle = document.querySelector("#actividad-seleccionada-titulo");
  const form = document.querySelector("#registration-form");
  const messageBox = document.querySelector("#form-message");
  const submitButton = document.querySelector("#submit-registration");
  const ageInput = document.querySelector("#edad");
  const guardianField = document.querySelector("#encargado-field");
  const guardianInput = document.querySelector("#nombreEncargadoLegal");
  const campFields = document.querySelector("#campamento-fields");
  const shirtInput = document.querySelector("#tallaCamisa");
  const addressInput = document.querySelector("#direccionCompleta");
  const statusSection = document.querySelector(".enroll-status-section");
  const headingBox = document.querySelector("#registration-heading");
  const noticeBox = document.querySelector("#no-activities-notice");
  const successBox = document.querySelector("#registration-success");
  let activities = [];

  // Sin actividades disponibles: se oculta el formulario y no se permite inscribirse.
  function setFormAvailable(available) {
    form.hidden = !available;
    if (headingBox) headingBox.hidden = !available;
    if (noticeBox) noticeBox.hidden = available;
    if (statusSection) statusSection.hidden = true;
  }

  const money = amount => new Intl.NumberFormat("es-CR", {
    style: "currency", currency: "CRC", maximumFractionDigits: 0
  }).format(Number(amount || 0));

  function setMessage(text, type = "info") {
    messageBox.hidden = false;
    messageBox.dataset.state = type;
    messageBox.textContent = text;
  }

  function setStatus(title, text, state = "ok") {
    statusBox.dataset.state = state;
    const symbol = state === "ok" ? "✓" : state === "error" ? "!" : "i";
    statusBox.innerHTML = `<span class="status-symbol" aria-hidden="true"></span><div><strong></strong><p></p></div>`;
    statusBox.querySelector(".status-symbol").textContent = symbol;
    statusBox.querySelector("strong").textContent = title;
    statusBox.querySelector("p").textContent = text;
  }

  function selectedActivity() {
    const id = Number(activitySelect.value);
    return activities.find(activity => Number(activity.id) === id);
  }

  function updateConditionalFields() {
    const isMinor = Number(ageInput.value) > 0 && Number(ageInput.value) < 18;
    guardianField.hidden = !isMinor;
    guardianInput.required = isMinor;

    const activity = selectedActivity();
    const isCamp = activity?.tipo === "CAMPAMENTO";
    campFields.hidden = !isCamp;
    shirtInput.required = Boolean(isCamp);
    addressInput.required = Boolean(isCamp);
    if (!isCamp) {
      shirtInput.value = "";
      addressInput.value = "";
    }
    const isPreselected = Boolean(requestedActivityId && activity && String(activity.id) === requestedActivityId);
    if (activityChoiceField) activityChoiceField.classList.toggle("activity-preselected", isPreselected);
    if (activitySelect) activitySelect.hidden = isPreselected;
    if (activityLabel) activityLabel.hidden = isPreselected;
    if (selectedActivityTitle) {
      selectedActivityTitle.hidden = !isPreselected;
      selectedActivityTitle.textContent = isPreselected ? `Actividad seleccionada: ${activity.nombre}` : "";
    }
    if (activity) {
      activityDetails.textContent = `${activity.fechaInicio || "Fecha por confirmar"} · ${money(activity.precio)} · ${activity.cuposDisponibles} cupos disponibles · ${activity.ubicacion || "Ubicación por confirmar"}`;
    } else {
      activityDetails.textContent = "Elegí una actividad disponible.";
    }
  }

  async function loadActivities() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/actividades`, {
        headers: { "Accept": "application/json" }
      });
      if (!response.ok) throw new Error(`El servicio respondió HTTP ${response.status}.`);
      activities = await response.json();
      const available = activities.filter(a => a.estado === "ACTIVA" && Number(a.cuposDisponibles) > 0);
      activitySelect.replaceChildren(new Option("Seleccioná una actividad", ""));
      for (const activity of available) {
        const option = new Option(
          `${activity.nombre} — ${money(activity.precio)} — ${activity.cuposDisponibles} cupos`,
          String(activity.id)
        );
        activitySelect.add(option);
      }
      if (!available.length) {
        activitySelect.replaceChildren(new Option("No hay actividades disponibles", ""));
        activitySelect.disabled = true;
        submitButton.disabled = true;
        activityDetails.textContent = "No hay actividades próximas disponibles.";
        setFormAvailable(false);
        return;
      }
      setFormAvailable(true);
      activitySelect.disabled = false;
      submitButton.disabled = false;
      if (requestedActivityId && available.some(a => String(a.id) === requestedActivityId)) activitySelect.value = requestedActivityId;
      updateConditionalFields();
    } catch (error) {
      activitySelect.replaceChildren(new Option("No se pudo cargar la lista", ""));
      if (statusSection) statusSection.hidden = false;
      setStatus("No se pudo cargar el servicio de inscripciones", "Intentá de nuevo en unos minutos.", "error");
      activityDetails.textContent = "No se cargaron las actividades. Intentá de nuevo en unos minutos.";
      submitButton.disabled = true;
    }
  }

  ageInput.addEventListener("input", updateConditionalFields);
  activitySelect.addEventListener("change", updateConditionalFields);

  form.addEventListener("submit", async event => {
    event.preventDefault();
    messageBox.hidden = true;
    if (successBox) successBox.hidden = true;
    if (form.hidden || !activities.some(a => a.estado === "ACTIVA" && Number(a.cuposDisponibles) > 0)) {
      setMessage("No hay actividades próximas disponibles. Por el momento no es posible inscribirse.", "error");
      return;
    }
    updateConditionalFields();
    if (!form.reportValidity()) return;
    const activity = selectedActivity();
    if (!activity) {
      setMessage("Seleccioná una actividad disponible antes de continuar.", "error");
      return;
    }

    const data = new FormData(form);
    const payload = {
      actividadId: Number(data.get("actividadId")),
      identificacion: String(data.get("identificacion") || "").trim(),
      nombre: String(data.get("nombre") || "").trim(),
      apellidos: String(data.get("apellidos") || "").trim(),
      edad: Number(data.get("edad")),
      telefono: String(data.get("telefono") || "").trim(),
      provincia: String(data.get("provincia") || "").trim(),
      canton: String(data.get("canton") || "").trim(),
      localidad: String(data.get("localidad") || "").trim(),
      iglesia: String(data.get("iglesia") || "").trim(),
      nombreEncargadoLegal: String(data.get("nombreEncargadoLegal") || "").trim(),
      padecimientos: String(data.get("padecimientos") || "").trim(),
      condicionesParticipacion: String(data.get("condicionesParticipacion") || "").trim(),
      medicamentos: String(data.get("medicamentos") || "").trim(),
      tallaCamisa: String(data.get("tallaCamisa") || "").trim(),
      direccionCompleta: String(data.get("direccionCompleta") || "").trim(),
      contactoEmergenciaNombre: String(data.get("contactoEmergenciaNombre") || "").trim(),
      contactoEmergenciaTelefono: String(data.get("contactoEmergenciaTelefono") || "").trim(),
      contactoEmergenciaParentesco: String(data.get("contactoEmergenciaParentesco") || "").trim(),
      aceptaTratamientoDatos: document.querySelector("#aceptaTratamientoDatos").checked
    };

    submitButton.disabled = true;
    submitButton.textContent = "Enviando solicitud…";
    try {
      const response = await fetch(`${API_BASE_URL}/api/inscripciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        const fieldMessages = result.campos && typeof result.campos === "object"
          ? Object.values(result.campos).filter(Boolean).join(" ") : "";
        throw new Error([result.mensaje || result.message || `No se pudo enviar la solicitud (código ${response.status}).`, fieldMessages].filter(Boolean).join(" "));
      }
      const lines = [
        `Solicitud registrada para ${result.actividad || activity.nombre}.`,
        `Número de solicitud: ${result.idInscripcion}.`,
        `Estado: ${result.estado}.`,
        result.mensaje || "La solicitud quedó registrada.",
        result.aviso || "La administración revisará la información."
      ];
      setMessage(lines.join(" "), "success");
      form.reset();
      updateConditionalFields();
      await loadActivities();
      messageBox.hidden = false;
      messageBox.dataset.state = "success";
      messageBox.textContent = lines.join(" ");
      // Si ese era el último cupo, el formulario se oculta: se muestra la confirmación fuera de él.
      if (form.hidden && successBox) {
        successBox.dataset.state = "success";
        successBox.textContent = lines.join(" ");
        successBox.hidden = false;
        messageBox.hidden = true;
      }
    } catch (error) {
      setMessage(error.message || "No se pudo registrar la solicitud. Revisá la información e intentá de nuevo.", "error");
    } finally {
      submitButton.disabled = activities.filter(a => a.estado === "ACTIVA" && Number(a.cuposDisponibles) > 0).length === 0;
      submitButton.textContent = "Enviar solicitud";
    }
  });

  loadActivities();
})();
