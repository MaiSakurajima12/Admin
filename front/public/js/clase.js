async function createPost(claseId, btn) {
    const contenido = document.getElementById('postContent')?.value.trim();
    const archivoInput = document.getElementById('postFile');
    const tieneArchivo = archivoInput?.files?.length > 0;
    const tieneContenido = contenido.length > 0;

    if (!tieneContenido && !tieneArchivo) {
        showError('Error al publicar', 'Debes escribir texto o adjuntar un archivo antes de publicar.');
        return;
    }

    const btnEl = btn || null;
    setButtonLoading(btnEl, true, 'Publicando...');
    showLoading('Publicando anuncio', 'Por favor espere...');

    try {
        const formData = new FormData();
        formData.append('contenido', contenido);
        formData.append('clase_id', claseId);
        if (archivoInput?.files?.length > 0) {
            formData.append('archivo', archivoInput.files[0]);
        }

        const response = await fetch('/api/posts', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        if (response.ok) {
            await showSuccess('¡Anuncio publicado!', 'El anuncio ha sido publicado correctamente');
            location.reload();
        } else {
            const errorData = await response.json().catch(() => null);
            showError('Error al publicar', errorData?.error || 'No se pudo publicar el anuncio');
        }
    } catch (error) {
        showError('Error de conexión', 'No se pudo conectar con el servidor');
    } finally {
        setButtonLoading(btnEl, false);
    }
}

function switchSection(section) {
    const sections = ['tasks', 'personas', 'rendimiento', 'rubrics'];

    sections.forEach(name => {
        const el = document.getElementById(`section${name.charAt(0).toUpperCase() + name.slice(1)}`);
        if (el) {
            if (name === section) {
                el.classList.remove('d-none');
            } else {
                el.classList.add('d-none');
            }
        }
    });

    if (section === 'tasks') {
        showTaskView('overview');
    }

    if (section === 'rubrics') {
        if (typeof claseId !== 'undefined' && claseId) {
            loadRubricsByClass(claseId);
        } else {
            loadAllRubrics();
        }
    }

    const buttons = {
        tasks: 'tabTasksBtn',
        personas: 'tabPersonasBtn',
        rendimiento: 'tabRendimientoBtn',
        rubrics: 'tabRubricsBtn'
    };

    Object.entries(buttons).forEach(([name, id]) => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.classList.toggle('active', name === section);
        }
    });
}

function showTaskView(view) {
    const overview = document.getElementById('tasksOverview');
    const detail = document.getElementById('taskDetailSection');
    const review = document.getElementById('taskReviewSection');

    if (!overview || !detail || !review) return;

    overview.classList.toggle('d-none', view !== 'overview');
    detail.classList.toggle('d-none', view !== 'detail');
    review.classList.toggle('d-none', view !== 'review');
}

async function loadSectionHtml(url, sectionId, adjustDom) {
    const container = document.getElementById(sectionId);
    if (!container) return;

    container.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status"></div>
            <div class="mt-3 text-muted">Cargando...</div>
        </div>
    `;

    try {
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) throw new Error('Error al cargar');

        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const main = doc.querySelector('main');
        if (!main) throw new Error('Contenido no disponible');

        const temp = document.createElement('div');
        temp.innerHTML = main.innerHTML;

        const topActions = sectionId === 'taskReviewSection'
            ? `
                <div class="mb-3 d-flex gap-2 flex-wrap">
                    <button class="btn btn-light btn-sm" onclick="backToTasks()">← Volver a tareas</button>
                    <button class="btn btn-outline-secondary btn-sm" onclick="backToTaskDetail()">Volver a detalles</button>
                </div>
              `
            : `
                <div class="mb-3">
                    <button class="btn btn-light btn-sm" onclick="backToTasks()">← Volver a tareas</button>
                </div>
              `;

        
        temp.querySelectorAll('script').forEach(script => script.remove());

        container.innerHTML = `${topActions}${temp.innerHTML}`;
        await executeScriptsFromDocument(doc, container);

        if (adjustDom) adjustDom(container, sectionId);
    } catch (error) {
        container.innerHTML = `
            <div class="alert alert-danger">No se pudo cargar el contenido. Intenta de nuevo.</div>
        `;
    }
}

async function executeScriptsFromDocument(doc, container) {
    const scripts = Array.from(doc.querySelectorAll('script'));
    for (const script of scripts) {
        const scriptSrc = script.getAttribute('src');
        if (scriptSrc) {
            const alreadyLoaded = Array.from(document.querySelectorAll('script[src]')).some(existing => existing.getAttribute('src') === scriptSrc);
            if (!alreadyLoaded) {
                await new Promise(resolve => {
                    const newScript = document.createElement('script');
                    newScript.src = scriptSrc;
                    newScript.onload = () => resolve();
                    newScript.onerror = () => resolve();
                    document.body.appendChild(newScript);
                });
            }
        } else if (script.textContent && script.textContent.trim()) {
            const inlineScript = document.createElement('script');
            inlineScript.text = script.textContent;
            container.appendChild(inlineScript);
        }
    }
}

function openTaskDetail(taskId, event) {
    if (event) event.preventDefault();
    window.currentTaskId = taskId;
    showTaskView('detail');

    loadSectionHtml(`/tarea/${taskId}`, 'taskDetailSection', (container) => {
        const backLink = container.querySelector('nav a[href*="/clase/"]');
        if (backLink) {
            backLink.removeAttribute('href');
            backLink.addEventListener('click', (evt) => {
                evt.preventDefault();
                backToTasks();
            });
        }

        const reviewLink = container.querySelector(`a[href="/tarea/${taskId}/revision"]`);
        if (reviewLink) {
            reviewLink.removeAttribute('href');
            reviewLink.addEventListener('click', (evt) => {
                evt.preventDefault();
                openTaskReview(taskId);
            });
        }

        if (typeof loadRubricsForTaskDetail === 'function') {
            loadRubricsForTaskDetail(taskId);
        }
    });
}

function openTaskReview(taskId, event) {
    if (event) event.preventDefault();
    window.currentTaskId = taskId;
    showTaskView('review');

    loadSectionHtml(`/tarea/${taskId}/revision`, 'taskReviewSection', (container) => {
        const backLink = container.querySelector(`nav a[href="/tarea/${taskId}"]`);
        if (backLink) {
            backLink.removeAttribute('href');
            backLink.addEventListener('click', (evt) => {
                evt.preventDefault();
                backToTaskDetail();
            });
        }

        const studentButtons = container.querySelectorAll('button.list-group-item-action');
        studentButtons.forEach(btn => {
            const onclickAttr = btn.getAttribute('onclick') || '';
            const jsonMatch = onclickAttr.match(/verDetalleEntrega\('(.+)'\)/);
            if (jsonMatch && jsonMatch[1]) {
                const alumnoData = jsonMatch[1];
                btn.removeAttribute('onclick');
                btn.addEventListener('click', function(evt) {
                    evt.preventDefault();
                    verDetalleEntrega(alumnoData);
                });
            }
        });

        if (typeof loadRubricsForGrading === 'function') {
            loadRubricsForGrading(taskId);
        }
    });
}

function backToTasks() {
    showTaskView('overview');
}

function backToTaskDetail() {
    if (window.currentTaskId) {
        openTaskDetail(window.currentTaskId);
    } else {
        backToTasks();
    }
}

function removeStudent(classId, studentId, studentName) {
    showConfirm(
        '¿Dar de baja alumno?',
        `¿Estás seguro de que deseas dar de baja a ${studentName}?`,
        'Sí, dar de baja',
        'Cancelar'
    ).then(async result => {
        if (!result.isConfirmed) return;

        showLoading('Dando de baja alumno', 'Por favor espere...');

        try {
            const response = await fetch(`/api/classes/${classId}/students/${studentId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                await showSuccess('Alumno dado de baja', `${studentName} ha sido dado de baja correctamente`);
                location.reload();
            } else {
                const errorData = await response.json().catch(() => null);
                showError('Error al dar de baja', errorData?.error || 'No se pudo dar de baja al alumno');
            }
        } catch (err) {
            showError('Error de conexión', 'No se pudo conectar con el servidor');
        }
    });
}

function actualizarRendimientoIndividual() {
    const selector = document.getElementById('studentSelector');
    if (!selector) return;

    const studentId = selector.value;
    const performance = window.studentPerformanceMap?.[studentId];

    if (!studentId) {
        document.getElementById('studentPerformanceSection')?.classList.add('d-none');
        return;
    }

    if (!performance) {
        showError('Datos no encontrados', 'No se encontraron datos para este alumno');
        return;
    }

    document.getElementById('studentAverage').textContent = performance.promedioCalificacion;
    document.getElementById('studentDelivered').textContent = performance.tareasEntregadas;
    document.getElementById('studentDeliveryPercent').textContent = `${performance.porcentajeEntrega}%`;
    document.getElementById('studentGraded').textContent = performance.tareasCalificadas;
    document.getElementById('studentOnTime').textContent = performance.entregadasAtiempo;
    document.getElementById('studentLate').textContent = performance.entregadasTarde;
    document.getElementById('studentNotDelivered').textContent = performance.noEntregadas;

    const totalTareas = performance.entregadasAtiempo + performance.entregadasTarde + performance.noEntregadas;
    const onTimePercent = totalTareas > 0 ? ((performance.entregadasAtiempo / totalTareas) * 100).toFixed(1) : 0;
    const latePercent = totalTareas > 0 ? ((performance.entregadasTarde / totalTareas) * 100).toFixed(1) : 0;
    const notDeliveredPercent = totalTareas > 0 ? ((performance.noEntregadas / totalTareas) * 100).toFixed(1) : 0;

    document.getElementById('studentOnTimeBar').style.width = `${onTimePercent}%`;
    document.getElementById('studentLateBar').style.width = `${latePercent}%`;
    document.getElementById('studentNotDeliveredBar').style.width = `${notDeliveredPercent}%`;

    document.getElementById('studentPerformanceSection')?.classList.remove('d-none');
}

document.addEventListener('DOMContentLoaded', () => {
    const dataElement = document.getElementById('studentPerformanceData');
    if (dataElement) {
        try {
            window.studentPerformanceMap = JSON.parse(dataElement.textContent || '{}');
        } catch (err) {
            window.studentPerformanceMap = {};
        }
    } else {
        window.studentPerformanceMap = {};
    }

    switchSection('tasks');
});

async function deletePost(postId) {
    showConfirm(
        '¿Eliminar anuncio?',
        '¿Estás seguro de que deseas eliminar este anuncio?',
        'Sí, eliminar',
        'Cancelar'
    ).then(async (result) => {
        if (!result.isConfirmed) return;

        showLoading('Eliminando anuncio', 'Por favor espere...');

        try {
            const response = await fetch(`/api/posts/${postId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                await showSuccess('Anuncio eliminado', 'El anuncio ha sido eliminado correctamente');
                location.reload();
            } else {
                const errorData = await response.json().catch(() => null);
                showError('Error al eliminar', errorData?.error || 'No se pudo eliminar el anuncio');
            }
        } catch (error) {
            showError('Error de conexión', 'No se pudo conectar con el servidor');
        }
    });
}

async function deleteAssignment(assignmentId) {
    showConfirm(
        '¿Eliminar tarea?',
        '¿Estás seguro de que deseas eliminar esta tarea? Esta acción no se puede deshacer.',
        'Sí, eliminar',
        'Cancelar'
    ).then(async (result) => {
        if (!result.isConfirmed) return;

        showLoading('Eliminando tarea', 'Por favor espere...');

        try {
            const response = await fetch(`/api/assignments/${assignmentId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                await showSuccess('Tarea eliminada', 'La tarea ha sido eliminada correctamente');
                location.reload();
            } else {
                const errorData = await response.json().catch(() => null);
                showError('Error al eliminar', errorData?.error || 'No se pudo eliminar la tarea');
            }
        } catch (error) {
            showError('Error de conexión', 'No se pudo conectar con el servidor');
        }
    });
}

async function deleteClass(claseId, nombreClase) {
    showConfirm(
        '¿Eliminar clase?',
        `¿Estás seguro de que deseas eliminar la clase "${nombreClase}"? Esta acción no se puede deshacer y se eliminarán todas las tareas, entregas y rúbricas asociadas.`,
        'Sí, eliminar clase',
        'Cancelar'
    ).then(async (result) => {
        if (!result.isConfirmed) return;

        showLoading('Eliminando clase', 'Por favor espere...');

        try {
            const response = await fetch(`/api/classes/${claseId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                await showSuccess('Clase eliminada', 'La clase ha sido eliminada correctamente');
                window.location.href = '/dashboard';
            } else {
                const errorData = await response.json().catch(() => null);
                showError('Error al eliminar', errorData?.error || 'No se pudo eliminar la clase');
            }
        } catch (error) {
            showError('Error de conexión', 'No se pudo conectar con el servidor');
        }
    });
}

async function uploadClassBanner(classId, event) {
    const file = event.target.files[0];
    
    if (!file) return;

    if (!validateFileType(file, ['image/jpeg', 'image/png', 'image/gif', 'image/webp'])) return;
    if (!validateFileSize(file, 5)) return;

    showLoading('Subiendo banner', 'Por favor espere...');

    const formData = new FormData();
    formData.append('banner', file);

    try {
        const response = await fetch(`/api/classes/${classId}/banner`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        const result = await response.json();
        if (response.ok) {
            const bannerDiv = event.target.closest('.p-5');
            if (bannerDiv) {
                bannerDiv.style.backgroundImage = `url('${result.url}')`;
            }
            await showSuccess('Banner actualizado', 'El banner se ha actualizado correctamente');
        } else {
            showError('Error al subir', result.error || 'No se pudo subir el banner');
        }
    } catch (error) {
        showError('Error de conexión', 'No se pudo conectar con el servidor');
    } finally {
        // Loading modal is closed by success/error alerts automatically
    }
}

async function transcribeAnnouncementFile() {
    const fileInput = document.getElementById('postFile');
    const contentEl = document.getElementById('postContent');
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        alert('Selecciona un archivo de audio primero');
        return;
    }
    const file = fileInput.files[0];
    if (!file.type.startsWith('audio/')) {
        alert('El archivo seleccionado no parece ser audio');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', 'anuncios');

    try {
        const res = await fetch('/api/integrations/transcribe-upload', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });
        const json = await res.json();
        if (!res.ok) {
            alert(json.error || 'No se pudo transcribir');
            return;
        }
        if (json.transcript) {
            contentEl.value = (contentEl.value ? contentEl.value + "\n\n" : "") + json.transcript;
            alert('Transcripción añadida al contenido');
        }
    } catch (err) {
        console.error('Transcribe error:', err);
        alert('Error al transcribir audio');
    }
}