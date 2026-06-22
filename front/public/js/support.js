async function submitSupportReport(btn) {
    const tipo = document.getElementById('supportProblemType').value;
    const descripcion = document.getElementById('supportDescription').value.trim();
    const fileInput = document.getElementById('supportEvidenceFile');
    const errorContainer = document.getElementById('supportError');

    errorContainer.classList.add('d-none');
    errorContainer.textContent = '';

    if (!tipo) {
        errorContainer.textContent = 'Selecciona el tipo de problema.';
        errorContainer.classList.remove('d-none');
        return;
    }
    if (!descripcion) {
        errorContainer.textContent = 'Describe el problema para que podamos ayudarte.';
        errorContainer.classList.remove('d-none');
        return;
    }

    const btnEl = btn || getPrimaryButtonInModal('supportModal');
    setButtonLoading(btnEl, true, 'Enviando...');

    try {
        const formData = new FormData();
        formData.append('tipo_problema', tipo);
        formData.append('descripcion', descripcion);
        if (fileInput && fileInput.files && fileInput.files.length > 0) {
            const f = fileInput.files[0];
            if (!f.type.startsWith('image/') && !f.type.startsWith('audio/')) {
                throw new Error('La evidencia debe ser una imagen o un audio');
            }
            formData.append('evidencia', f);
        }

        const response = await fetch('/api/support', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'No se pudo enviar el reporte');
        }

        await showSuccess('Reporte enviado', 'Tu solicitud de soporte ha sido enviada correctamente.');
        document.getElementById('supportProblemType').value = '';
        document.getElementById('supportDescription').value = '';
        if (fileInput) fileInput.value = '';
        const supportModal = bootstrap.Modal.getInstance(document.getElementById('supportModal'));
        supportModal?.hide();
    } catch (error) {
        errorContainer.textContent = error.message;
        errorContainer.classList.remove('d-none');
    } finally {
        setButtonLoading(btnEl, false);
    }
}
function setButtonLoading(btn, loading, label) {
    if (!btn) return;
    if (loading) {
        if (!btn.dataset.origHtml) btn.dataset.origHtml = btn.innerHTML;
        btn.disabled = true;
        const spinner = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>';
        btn.innerHTML = `${spinner}${label || 'Procesando...'}`;
    } else {
        if (btn.dataset.origHtml) {
            btn.innerHTML = btn.dataset.origHtml;
            delete btn.dataset.origHtml;
        }
        btn.disabled = false;
    }
}

async function openReportDetailModal(reportId) {
    const modalEl = document.getElementById('reportDetailModal');
    const modal = new bootstrap.Modal(modalEl);
    const detailTipo = document.getElementById('detailTipo');
    const detailAutor = document.getElementById('detailAutor');
    const detailFecha = document.getElementById('detailFecha');
    const detailDescripcion = document.getElementById('detailDescripcion');
    const detailEvidencia = document.getElementById('detailEvidencia');
    const detailEstado = document.getElementById('detailEstado');
    const saveButton = document.getElementById('saveReportChanges');

    detailTipo.textContent = 'Cargando...';
    detailAutor.textContent = '...';
    detailFecha.textContent = '...';
    detailDescripcion.textContent = '';
    detailEvidencia.innerHTML = '';
    detailEstado.value = 'abierto';
    saveButton.dataset.reportId = reportId;

    try {
        const response = await fetch(`/api/support/${reportId}`, { credentials: 'include' });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'No se pudo cargar el reporte');
        }

        detailTipo.textContent = data.tipo_problema || 'Reporte de soporte';
        detailAutor.textContent = data.reporter ? `${data.reporter.nombre || ''} ${data.reporter.apellido || ''}`.trim() : String(data.usuario_id || '—');
        detailFecha.textContent = data.fecha_creacion ? new Date(data.fecha_creacion).toLocaleString() : '—';
        detailDescripcion.textContent = data.descripcion || '';

        if (data.url_evidencia) {
            if (data.url_evidencia.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                detailEvidencia.innerHTML = `<img src="${data.url_evidencia}" alt="Evidencia" class="img-fluid rounded" />`;
            } else {
                detailEvidencia.innerHTML = `<a href="${data.url_evidencia}" target="_blank" class="btn btn-sm btn-outline-primary">Ver evidencia</a>`;
            }
        } else {
            detailEvidencia.innerHTML = '';
        }

        detailEstado.value = data.estado || 'abierto';
        saveButton.dataset.reportId = reportId;
        modal.show();
    } catch (err) {
        console.error(err);
        await showError('Error', err.message || 'No se pudo cargar el reporte');
    }
}

async function submitReportDetailChanges(btn) {
    const reportId = btn?.dataset?.reportId;
    if (!reportId) return;

    const estadoInput = document.getElementById('detailEstado') || document.getElementById('pageEstado');
    if (!estadoInput) return;
    const estado = estadoInput.value;
    setButtonLoading(btn, true, 'Guardando...');

    try {
        const response = await fetch(`/api/support/${reportId}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'No se pudo actualizar el reporte');
        }

        await showSuccess('Reporte actualizado', 'El estado del reporte se actualizó correctamente.');
        const detailModalEl = document.getElementById('reportDetailModal');
        if (detailModalEl) {
            const modal = bootstrap.Modal.getInstance(detailModalEl);
            modal?.hide();
            if (typeof loadAllReports === 'function') loadAllReports();
        }
    } catch (err) {
        console.error(err);
        await showError('Error', err.message || 'No se pudo guardar el reporte');
    } finally {
        setButtonLoading(btn, false);
    }
}
function transcribeSupportFile(button) {
    startVoiceDictation('supportDescription', button || document.querySelector('#supportModal button[onclick="transcribeSupportFile()"]'));
}

async function fetchTechnicians() {
    const res = await fetch('/api/support/technicians', { credentials: 'include' });
    if (!res.ok) return [];
    return await res.json();
}


async function openAssignDialog(reportId) {
    try {
        const techs = await fetchTechnicians();
        if (!techs || techs.length === 0) {
            await Swal.fire('Sin técnicos', 'No hay técnicos disponibles para asignar.', 'info');
            return;
        }

        const inputOptions = techs.reduce((acc, t) => {
            acc[t.id] = `${t.nombre || ''} ${t.apellido || ''}`.trim() || t.email;
            return acc;
        }, {});

        const { value: assignedId } = await Swal.fire({
            title: 'Asignar técnico',
            input: 'select',
            inputOptions: inputOptions,
            inputPlaceholder: 'Selecciona un técnico',
            showCancelButton: true
        });

        if (!assignedId) return;

        const resp = await fetch(`/api/support/${reportId}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ asignado_a: assignedId })
        });
        if (!resp.ok) throw new Error('No se pudo asignar el técnico');
        await Swal.fire('Asignado', 'El reporte fue asignado correctamente.', 'success');
        
        if (typeof loadAllReports === 'function') loadAllReports();
    } catch (err) {
        console.error(err);
        Swal.fire('Error', err.message || 'Error al asignar', 'error');
    }
}

