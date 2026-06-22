function verDetalleEntrega(alumno) {
    if (typeof alumno === 'string') {
        alumno = JSON.parse(alumno);
    }
    const container = document.getElementById('detalleEntrega');

    if (!alumno.entrega) {
        container.innerHTML = `
            <h3>${alumno.nombre} ${alumno.apellido}</h3>
            <p class="text-danger">El alumno aún no ha realizado la entrega.</p>
        `;
        return;
    }

    let archivoHtml = '';
    if (alumno.entrega.archivo_entrega_url) {
        const url = alumno.entrega.archivo_entrega_url;
        const fallbackFileName = alumno.entrega.nombre_archivo || url.split('/').pop().split('?')[0] || 'Archivo entregado';
        const isPdf = url.toLowerCase().includes('.pdf') || url.includes('application/pdf');
        const isPpt = /\.(ppt|pptx)$/i.test(url);
        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
        const isAudio = /\.(mp3|m4a|wav|ogg|webm|aac)$/i.test(url);
        const isVideo = /\.(mp4|webm|ogg)$/i.test(url);
        const isText = /\.(txt|md|csv|json|js|html|htm|xml)$/i.test(url);

        if (isPdf) {
            archivoHtml = `
                <div class="border rounded mb-3 bg-white">
                    <iframe src="${url}" style="width: 100%; height: 600px; border: none; border-radius: 4px;"></iframe>
                </div>
                <div class="text-end mt-2"><a href="${url}" target="_blank" class="submission-file-link">${fallbackFileName}</a></div>
            `;
        } else if (isPpt) {
            archivoHtml = `
                <div class="border rounded p-3 bg-light mb-3">
                    <i class="fa-solid fa-file-powerpoint me-2"></i>
                    <span class="d-block mb-2">Vista previa no disponible para este formato.</span>
                    <a href="${url}" target="_blank" class="text-decoration-none submission-file-link">Abrir archivo PPTX</a>
                </div>
            `;
        } else if (isImage) {
            archivoHtml = `
                <div class="border rounded mb-3 bg-white p-3 text-center">
                    <img src="${url}" alt="Archivo entregado" style="max-width: 100%; max-height: 600px; border-radius: 4px;">
                </div>
                <div class="text-end mt-2"><a href="${url}" target="_blank" class="submission-file-link">${fallbackFileName}</a></div>
            `;
        } else if (isAudio) {
            archivoHtml = `
                <div class="border rounded mb-3 bg-white p-3 text-center">
                    <audio controls style="width:100%;">
                        <source src="${url}">
                        Tu navegador no soporta la reproducción de audio.
                    </audio>
                    <div class="mt-2"><a href="${url}" target="_blank" class="submission-file-link">${fallbackFileName}</a></div>
                </div>
            `;
        } else if (isVideo) {
            archivoHtml = `
                <div class="border rounded mb-3 bg-white p-3 text-center">
                    <video controls style="width:100%; max-height: 600px;">
                        <source src="${url}">
                        Tu navegador no soporta la reproducción de video.
                    </video>
                    <div class="mt-2"><a href="${url}" target="_blank" class="submission-file-link">${fallbackFileName}</a></div>
                </div>
            `;
        } else if (isText) {
            archivoHtml = `
                <div class="border rounded mb-3 bg-white p-3" style="max-height: 600px; overflow:auto;">
                    <iframe src="${url}" style="width: 100%; height: 100%; border: none;"></iframe>
                </div>
                <div class="text-end mt-2"><a href="${url}" target="_blank" class="submission-file-link">${fallbackFileName}</a></div>
            `;
        } else {
            archivoHtml = `
                <div class="border rounded p-3 bg-light mb-3">
                    <i class="fa-solid fa-file me-2"></i>
                    <a href="${url}" target="_blank" class="text-decoration-none submission-file-link">${fallbackFileName}</a>
                </div>
            `;
        }
    } else {
        archivoHtml = `
            <div class="border rounded p-3 bg-light mb-3">
                <span class="text-muted"><i class="fa-solid fa-circle-exclamation me-2"></i>Sin archivo adjunto</span>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="text-start">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h3>${alumno.nombre} ${alumno.apellido}</h3>
                <div class="d-flex align-items-center">
                    <input type="number" id="notaInput" class="form-control me-2" style="width: 80px;" 
                           value="${alumno.entrega.calificacion || ''}" placeholder="0" min="0" max="${alumno.puntos_maximos_tarea}">
                    <span class="fw-bold">/ ${alumno.puntos_maximos_tarea}</span>
                    <button class="btn btn-success ms-3" onclick="guardarNota('${alumno.entrega.id}', ${alumno.puntos_maximos_tarea})">Calificar</button>
                </div>
            </div>
            
            <h6 class="fw-bold mb-3">Comentario privado del profesor:</h6>
            <textarea id="comentarioProfesor" class="form-control mb-4" rows="3" placeholder="Escribe tu comentario privado para el alumno...">${alumno.entrega.comentario_profesor || ''}</textarea>
            <div class="d-flex gap-2 mb-4">
                <button class="menu-button-sm" type="button" onclick="startVoiceDictation('comentarioProfesor', this)">Dictar comentario</button>
                <button class="menu-button-sm" type="button" id="saplingAnalyzeBtn" onclick="analyzeCommentWithSapling('comentarioProfesor', this)">Detectar % hecha (IA)</button>
                <span id="saplingResult" class="small text-muted ms-2"></span>
            </div>

            <h6 class="fw-bold mb-3">Archivo entregado:</h6>
            ${archivoHtml}

            <div id="rubricGradingContainer" class="mt-4"></div>

            ${alumno.entrega.comentario_alumno ? `
                <h6 class="fw-bold mt-4 mb-3">Comentario del alumno:</h6>
                <div class="border-start border-info rounded p-3 bg-light">
                    <p id="studentSubmissionComment" class="mb-0">${alumno.entrega.comentario_alumno}</p>
                </div>
            ` : ''}
        </div>
    `;

    window.currentSubmissionId = alumno.entrega.id;

    // Cargar rúbricas para esta tarea
    const tareaId = window.currentTaskId || new URLSearchParams(window.location.search).get('tareaId') || 
                    document.querySelector('[data-tarea-id]')?.dataset.tareaId;
    if (tareaId && typeof loadRubricsForGrading === 'function') {
        setTimeout(() => loadRubricsForGrading(tareaId), 200);
    }
}

async function analyzeCommentWithSapling(fieldId, btn) {
    const textarea = document.getElementById(fieldId);
    if (!textarea) return;
    let text = textarea.value || '';
    if (!text || text.trim().length === 0) {
        const studentCommentEl = document.getElementById('studentSubmissionComment');
        if (studentCommentEl && studentCommentEl.textContent.trim()) {
            text = studentCommentEl.textContent.trim();
        }
    }

    const fileLink = document.querySelector('.submission-file-link');
    if ((!text || !text.trim()) && fileLink && fileLink.href) {
        const fileUrl = fileLink.href;
        const supportedExtensions = /\.(txt|pdf|doc|docx|ppt|pptx)$/i;
        if (supportedExtensions.test(fileUrl)) {
            if (/\.(txt)$/i.test(fileUrl)) {
                try {
                    const fileResponse = await fetch(fileUrl, { credentials: 'include' });
                    if (fileResponse.ok) {
                        text = await fileResponse.text();
                    }
                } catch (err) {
                    console.warn('No se pudo leer el archivo del alumno para IA:', err);
                }
            } else {
                text = `Analiza este archivo adjunto para detectar posible contenido generado por IA: ${fileUrl}`;
            }
        } else {
            return showError('Archivo no compatible', 'Solo se pueden analizar archivos .txt, .pdf, .doc/.docx y .ppt/.pptx.');
        }
    }

    if (!text || text.trim().length === 0) {
        return showError('Texto requerido', 'No hay texto para analizar. Añade un comentario o sube un archivo compatible.');
    }
    const resultSpan = document.getElementById('saplingResult');
    btn.disabled = true;
    resultSpan.textContent = 'Analizando...';

    try {
        const res = await fetch('/api/integrations/sapling', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ text })
        });
        const j = await res.json();
        if (!res.ok) {
            throw new Error(j.error || 'Error en análisis');
        }
        const percent = j.percent ?? j.percent_complete ?? j.percentaje;
        if (percent === undefined || percent === null || !Number.isFinite(Number(percent))) {
            resultSpan.textContent = `IA: ${j.percent || j.percent_complete || j.percentaje || 'N/A'}%`;
        } else {
            const rawPercent = Number(percent);
            const displayPercent = rawPercent <= 1 ? rawPercent * 100 : rawPercent;
            resultSpan.textContent = `IA: ${displayPercent.toFixed(1)}% hecho`;
        }
    } catch (err) {
        resultSpan.textContent = '';
        showError('Error IA', err.message || 'No se pudo analizar');
    } finally {
        btn.disabled = false;
    }
}

async function guardarNota(entregaId, puntoMaximo) {
    const calificacion = document.getElementById('notaInput').value;
    const comentario_profesor = document.getElementById('comentarioProfesor')?.value || '';

    if (!validateNotEmpty(calificacion, 'La calificación')) return;
    if (!validateRange(calificacion, 0, puntoMaximo, 'La calificación')) return;

    showLoading('Guardando calificación', 'Por favor espere...');

    try {
        const response = await fetch(`/api/assignments/grade/${entregaId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ calificacion, comentario_profesor })
        });

        if (response.ok) {
            const rubricInputs = document.querySelectorAll('.rubric-grade-input');
            if (rubricInputs.length > 0 && typeof saveRubricGrades === 'function') {
                await saveRubricGrades(entregaId);
            }
            await showSuccess('Calificación guardada', 'La calificación y comentario han sido guardados correctamente');
            location.reload();
        } else {
            showError('Error al guardar', 'No se pudo guardar la calificación');
        }
    } catch (err) {
        showError('Error de conexión', 'No se pudo conectar con el servidor');
    }
}