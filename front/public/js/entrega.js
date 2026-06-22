document.addEventListener('change', function(e) {
    if (e.target && e.target.id === 'submissionFile') {
        const fileName = e.target.files[0]?.name || "";
        document.getElementById('fileNameDisplay').textContent = fileName;
        // render a preview for images / pdfs
        const previewContainer = document.getElementById('submissionPreview');
        if (previewContainer) {
            // clear previous preview
            previewContainer.innerHTML = '';
            const file = e.target.files[0];
            if (file) {
                if (file.type.startsWith('image/')) {
                    const img = document.createElement('img');
                    const url = URL.createObjectURL(file);
                    img.src = url;
                    img.className = 'img-fluid rounded';
                    img.style.maxHeight = '80vh';
                    img.onload = () => {
                        try { URL.revokeObjectURL(url); } catch (e) {}
                    };
                    previewContainer.appendChild(img);
                } else if (file.name && /\.pdf$/i.test(file.name)) {
                    const embed = document.createElement('iframe');
                    const url = URL.createObjectURL(file);
                    embed.src = url;
                    embed.style.width = '100%';
                    embed.style.height = '70vh';
                    embed.setAttribute('aria-label', 'Vista previa PDF');
                    previewContainer.appendChild(embed);
                } else {
                    const p = document.createElement('div');
                    p.className = 'small text-muted';
                    p.textContent = file.name;
                    previewContainer.appendChild(p);
                }
            }
        }
    }
});

document.addEventListener('submit', function(e) {
    if (e.target && e.target.id === 'submissionForm') {
        e.preventDefault();
    }
});

async function submitTask(tareaId, btn) {
    const fileInput = document.getElementById('submissionFile');
    const comentario = document.getElementById('comentarioAlumno')?.value.trim() || '';
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const estudianteId = user.id;
    const btnEl = btn || document.querySelector('button[onclick*="submitTask("]') || null;

    console.log('submitTask invoked', { tareaId, fileName: fileInput?.files[0]?.name, comentario, estudianteId });

    if (!fileInput.files[0]) {
        showConfirm(
            'Sin archivo',
            '¿Estás seguro de que deseas entregar la tarea sin archivo adjunto?',
            'Sí, entregar sin archivo',
            'Cancelar'
        ).then(result => {
            if (!result.isConfirmed) return;
            submitTaskWithoutFile(tareaId, comentario, estudianteId, null, btnEl);
        });
        return;
    }

    if (!validateFileSize(fileInput.files[0], 20)) return;

    submitTaskWithoutFile(tareaId, comentario, user.id, fileInput.files[0], btnEl);
}

async function submitTaskWithoutFile(tareaId, comentario, estudianteId, archivo = null, btnEl = null) {
    setButtonLoading(btnEl, true, 'Entregando...');
    showLoading('Entregando tarea', 'Por favor espere...');

    const formData = new FormData();
    formData.append('tarea_id', tareaId);
    formData.append('estudiante_id', estudianteId);
    formData.append('comentario_alumno', comentario);
    if (archivo) {
        formData.append('archivo_entrega', archivo);
    }

    try {
        console.log('sending POST to /api/assignments/submit', { tareaId, estudianteId, hasFile: !!archivo });
        const response = await fetch('/api/assignments/submit', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        if (response.ok) {
            await showSuccess('¡Tarea entregada!', 'Tu tarea ha sido entregada correctamente');
            refreshSubmissionView();
        } else {
            const err = await response.json().catch(() => null);
            const message = err?.error || `No se pudo entregar la tarea (status ${response.status})`;
            showError('Error al entregar', message);
        }
    } catch (error) {
        showError('Error de conexión', 'No se pudo conectar con el servidor');
    } finally {
        setButtonLoading(btnEl, false);
    }
}

function refreshSubmissionView() {
    if (typeof openTaskDetail === 'function' && window.currentTaskId) {
        openTaskDetail(window.currentTaskId);
    } else {
        location.reload();
    }
}

// Helper to open a preview for existing submission URLs (images / pdfs)
function openSubmissionPreview(url) {
    if (!url) return;
    const isImage = url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const isPdf = url.match(/\.pdf$/i);

    if (isImage) {
        Swal.fire({
            imageUrl: url,
            imageAlt: 'Vista previa',
            showConfirmButton: true,
            confirmButtonText: 'Cerrar',
            width: '90%'
        });
        return;
    }

    if (isPdf) {
        Swal.fire({
            html: `<iframe src="${url}" style="width:100%;height:80vh;border:0;" aria-label="Vista previa PDF"></iframe>`,
            showConfirmButton: true,
            confirmButtonText: 'Cerrar',
            width: '95%'
        });
        return;
    }

    // default: open in new tab
    window.open(url, '_blank');
}

async function cancelSubmission(entregaId) {
    showConfirm(
        '¿Anular entrega?',
        '¿Estás seguro de que deseas anular la entrega? Esta acción no se puede deshacer.',
        'Sí, anular entrega',
        'Cancelar'
    ).then(async (result) => {
        if (!result.isConfirmed) return;

        showLoading('Anulando entrega', 'Por favor espere...');

        try {
            const response = await fetch(`/api/assignments/submission/${entregaId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                await showSuccess('Entrega anulada', 'La entrega ha sido anulada correctamente');
                refreshSubmissionView();
            } else {
                showError('Error al anular', 'No se pudo anular la entrega');
            }
        } catch (error) {
            showError('Error de conexión', 'No se pudo conectar con el servidor');
        }
    });
}

function renderInlinePreview(containerId, url) {
    const container = document.getElementById(containerId);
    if (!container || !url) return;
    container.innerHTML = '';
    if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        const img = document.createElement('img');
        img.src = url;
        img.className = 'img-fluid rounded';
        img.style.maxHeight = '320px';
        container.appendChild(img);
    } else if (url.match(/\.pdf$/i)) {
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.width = '100%';
        iframe.style.height = '420px';
        iframe.setAttribute('aria-label', 'Vista previa PDF');
        container.appendChild(iframe);
    } else {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.className = 'btn btn-sm btn-outline-primary';
        a.textContent = 'Descargar archivo';
        container.appendChild(a);
    }
}