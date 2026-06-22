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

