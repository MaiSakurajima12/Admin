
document.addEventListener('DOMContentLoaded', function() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const sidebarLinks = document.querySelectorAll('.sidebar-link');

    function refreshSidebarToggle() {
        if (!sidebarToggle) return;
        if (window.innerWidth >= 992) {
            sidebarToggle.style.display = 'none';
            return;
        }
        sidebarToggle.style.display = sidebar.classList.contains('show') ? 'none' : 'inline-flex';
    }

    document.querySelectorAll('.class-banner').forEach(card => {
        const bg = card.dataset.bg || '';
        if (bg) {
            card.style.backgroundImage = `url("${bg}")`;
        }
    });

    refreshSidebarToggle();
    window.addEventListener('resize', refreshSidebarToggle);

    if (typeof setupClassCodeInputs === 'function') setupClassCodeInputs();
    const joinModalEl = document.getElementById('joinModal');
    if (joinModalEl) {
        joinModalEl.addEventListener('shown.bs.modal', function () {
            const first = document.querySelector('#classCodeContainer .code-input');
            if (first) first.focus();
        });
    }

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('show');
            overlay.classList.toggle('show');
            refreshSidebarToggle();
        });
    }

    if (overlay) {
        overlay.addEventListener('click', function() {
            sidebar.classList.remove('show');
            overlay.classList.remove('show');
            refreshSidebarToggle();
        });
    }

    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const section = this.getAttribute('data-section');
            if (!section) {
                return;
            }

            e.preventDefault();
            
            sidebarLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            const dashboardId = section + '-section';
            const dashboardEl = document.getElementById(dashboardId);
            if (dashboardEl) {
                document.querySelectorAll('.content-section').forEach(sec => {
                    sec.classList.remove('active');
                });
                dashboardEl.classList.add('active');
            } else if (typeof window.switchSection === 'function') {
                try {
                    window.switchSection(section);
                } catch (err) {
                    console.error('Error calling switchSection:', err);
                }
            }
            
            if (window.innerWidth < 992) {
                sidebar.classList.remove('show');
                overlay.classList.remove('show');
                refreshSidebarToggle();
            }

            if (section === 'calendar') {
                loadPendingAssignments();
            } else if (section === 'submissions') {
                loadStudentSubmissions();
            }
        });
    });

    const selectedSection = document.body.dataset.selectedSection;
    if (selectedSection === 'calendar') {
        loadPendingAssignments();
    } else if (selectedSection === 'submissions') {
        loadStudentSubmissions();
    }

});

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function setButtonLoading(btn, loading, label) {
    if (!btn) return;
    if (loading) {
        if (!btn.dataset.origHtml) btn.dataset.origHtml = btn.innerHTML;
        btn.disabled = true;
        const spinner = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>';
        btn.innerHTML = `${spinner}${label || btn.dataset.loadingLabel || 'Procesando...'}`;
    } else {
        if (btn.dataset.origHtml) {
            btn.innerHTML = btn.dataset.origHtml;
            delete btn.dataset.origHtml;
        }
        btn.disabled = false;
    }
}

function getPrimaryButtonInModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return null;
    return modal.querySelector('.modal-footer .btn-primary');
}

function getClassCodeFromBoxes() {
    const boxes = document.querySelectorAll('#classCodeContainer .code-input');
    if (!boxes || boxes.length === 0) return null;
    let code = '';
    boxes.forEach(b => { code += (b.value || '').toUpperCase(); });
    return code;
}

function setupClassCodeInputs() {
    const container = document.getElementById('classCodeContainer');
    if (!container) return;
    const inputs = container.querySelectorAll('.code-input');
    inputs.forEach((input, idx) => {
        input.addEventListener('input', (e) => {
            let val = (e.target.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (val.length > 1) val = val.charAt(0);
            e.target.value = val;
            if (val && idx < inputs.length - 1) {
                inputs[idx + 1].focus();
            }
        });

        input.addEventListener('keydown', (e) => {
            // If user presses a printable character, replace current value and move focus
            const isPrintable = e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey;
            if (isPrintable) {
                const ch = e.key.toUpperCase();
                if (/^[A-Z0-9]$/.test(ch)) {
                    e.preventDefault();
                    e.target.value = ch;
                    if (idx < inputs.length - 1) inputs[idx + 1].focus();
                    return;
                }
            }

            if (e.key === 'Backspace' && !e.target.value && idx > 0) {
                inputs[idx - 1].focus();
            }
            if (e.key === 'ArrowLeft' && idx > 0) inputs[idx - 1].focus();
            if (e.key === 'ArrowRight' && idx < inputs.length - 1) inputs[idx + 1].focus();
        });

        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const paste = (e.clipboardData || window.clipboardData).getData('text').trim().toUpperCase();
            const chars = paste.replace(/[^A-Z0-9]/g, '').split('');
            for (let i = 0; i < inputs.length; i++) {
                inputs[i].value = chars[i] || '';
            }
            // focus next empty or last
            for (let j = 0; j < inputs.length; j++) {
                if (!inputs[j].value) { inputs[j].focus(); return; }
            }
            inputs[inputs.length - 1].focus();
        });
    });
}

async function loadPendingAssignments() {
    const container = document.getElementById('calendarContainer');
    
    try {
        const response = await fetch('/api/assignments/pending/my-assignments', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Error al cargar tareas pendientes');
        }

        const tareas = await response.json();
        const tareasPendientes = tareas
            .filter(tarea => !tarea.entregado)
            .sort((a, b) => new Date(b.fecha_entrega) - new Date(a.fecha_entrega));

        if (tareasPendientes.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fa-solid fa-check-circle text-success" style="font-size: 3rem;"></i>
                    <p class="text-muted mt-3">¡No hay tareas pendientes!</p>
                </div>
            `;
            return;
        }

        const tareasAgrupadas = {};
        const fechaLabels = {};
        tareasPendientes.forEach(tarea => {
            const fechaObj = new Date(tarea.fecha_entrega);
            const fechaKey = fechaObj.toISOString().slice(0, 10);
            const fechaLabel = fechaObj.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
            if (!tareasAgrupadas[fechaKey]) {
                tareasAgrupadas[fechaKey] = [];
                fechaLabels[fechaKey] = fechaLabel;
            }
            tareasAgrupadas[fechaKey].push(tarea);
        });

        let html = '';
        const fechasOrdenadas = Object.keys(tareasAgrupadas).sort();
        for (const fechaKey of fechasOrdenadas) {
            const tareasPorFecha = tareasAgrupadas[fechaKey];
            html += `<h5 class="mt-4 mb-3"><i class="fa-solid fa-calendar-day me-2"></i>${fechaLabels[fechaKey]}</h5>`;
            
            tareasPorFecha.forEach(tarea => {
                const horaEntrega = new Date(tarea.fecha_entrega).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const claseTarea = tarea.entregado ? 'entregado' : '';
                const iconoEntrega = tarea.entregado ? '<i class="fa-solid fa-check text-success me-2"></i>' : '';
                const tituloSeguro = escapeHtml(tarea.titulo);
                const nombreClaseSeguro = escapeHtml(tarea.clases?.nombre_clase);
                const seccionSeguro = escapeHtml(tarea.clases?.seccion);
                const descripcionSeguro = escapeHtml(tarea.descripcion || '');
                
                html += `
                    <div class="task-card ${claseTarea}">
                        <div class="row align-items-center">
                            <div class="col-md-8">
                                <h6 class="mb-1">${iconoEntrega}<strong>${tituloSeguro}</strong></h6>
                                <p class="mb-1 small text-muted">${nombreClaseSeguro} - ${seccionSeguro}</p>
                                <p class="mb-0 small text-muted">${descripcionSeguro.substring(0, 100)}...</p>
                            </div>
                            <div class="col-md-4 text-md-end mt-3 mt-md-0">
                                <p class="mb-1"><strong>${horaEntrega}</strong></p>
                                <p class="mb-0 small text-muted">Valor: ${tarea.puntos_maximos} pts</p>
                                ${tarea.entregado ? '<span class="badge bg-success">Entregado</span>' : '<span class="badge bg-warning">Pendiente</span>'}
                            </div>
                        </div>
                    </div>
                `;
            });
        }

        container.innerHTML = html;
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="fa-solid fa-exclamation-circle me-2"></i>
                Error al cargar las tareas: ${error.message}
            </div>
        `;
    }
}

async function loadStudentSubmissions() {
    const container = document.getElementById('submissionsContainer');
    
    try {
        const response = await fetch('/api/assignments/submissions/my-history', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Error al cargar entregas');
        }

        const entregas = (await response.json())
            .sort((a, b) => new Date(b.fecha_envio) - new Date(a.fecha_envio));

        if (entregas.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fa-solid fa-inbox text-muted" style="font-size: 3rem;"></i>
                    <p class="text-muted mt-3">Aún no has entregado ningún trabajo</p>
                </div>
            `;
            return;
        }

        let html = '';
        entregas.forEach(entrega => {
            const fechaEntrega = new Date(entrega.fecha_envio).toLocaleDateString('es-ES', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            const horaEntrega = new Date(entrega.fecha_envio).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });

            const tituloSeguro = escapeHtml(entrega.tareas?.titulo);
            const nombreClaseSeguro = escapeHtml(entrega.tareas?.clases?.nombre_clase);
            const seccionSeguro = escapeHtml(entrega.tareas?.clases?.seccion);
            const comentarioAlumnoSeguro = escapeHtml(entrega.comentario_alumno);
            const comentarioProfesorSeguro = escapeHtml(entrega.comentario_profesor);
            const puntosMaximosSeguro = escapeHtml(entrega.tareas?.puntos_maximos);
            const claseEntrega = entrega.calificacion !== null && entrega.calificacion !== undefined ? 'calificado' : '';
            const estadoBadge = entrega.calificacion !== null && entrega.calificacion !== undefined 
                ? `<span class="badge bg-success">Calificado: ${escapeHtml(entrega.calificacion)} / ${puntosMaximosSeguro}</span>`
                : `<span class="badge bg-info">Por calificar</span>`;

            html += `
                <div class="submission-card ${claseEntrega}">
                    <div class="row align-items-center">
                        <div class="col-md-8">
                            <h6 class="mb-1"><strong>${tituloSeguro}</strong></h6>
                            <p class="mb-1 small text-muted">${nombreClaseSeguro} - ${seccionSeguro}</p>
                            <p class="mb-0 small text-muted">Entregado: ${fechaEntrega} a las ${horaEntrega}</p>
                            ${comentarioAlumnoSeguro ? `<p class="mb-0 small text-muted mt-2"><em>"${comentarioAlumnoSeguro}"</em></p>` : ''}
                        </div>
                        <div class="col-md-4 text-md-end mt-3 mt-md-0">
                            ${estadoBadge}
                            ${entrega.calificacion !== null && entrega.calificacion !== undefined && entrega.comentario_profesor 
                                ? `<p class="small text-muted mt-2"><strong>Comentario:</strong> ${comentarioProfesorSeguro}</p>` 
                                : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="fa-solid fa-exclamation-circle me-2"></i>
                Error al cargar las entregas: ${error.message}
            </div>
        `;
    }
}

async function createClass(btn) {
    const nombre_clase = document.getElementById('className')?.value.trim();
    const seccion = document.getElementById('classSection')?.value.trim();
    const materia = document.getElementById('classSubject')?.value.trim();

    const user = JSON.parse(localStorage.getItem('user'));

    if (!validateNotEmpty(nombre_clase, 'El nombre de la clase')) return;
    if (!validateNotEmpty(seccion, 'La sección')) return;

    const btnEl = btn || getPrimaryButtonInModal('createModal');
    setButtonLoading(btnEl, true, 'Creando...');
    try {
        const response = await fetch('/api/classes/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                nombre_clase, 
                seccion, 
                materia, 
                profesor_id: user.id 
            }),
            credentials: 'include'
        });

        const result = await response.json();
        if (response.ok) {
            await showSuccess('¡Clase creada!', 'La clase se ha creado correctamente');
            location.reload(); 
        } else {
            showError('Error al crear clase', result.error || 'No se pudo crear la clase');
        }
    } catch (error) {
        showError('Error de conexión', 'No se pudo conectar con el servidor');
    } finally {
        setButtonLoading(btnEl, false);
    }
}

async function joinClass(btn) {
    let codigo_acceso = null;
    const fromBoxes = getClassCodeFromBoxes();
    if (fromBoxes) codigo_acceso = fromBoxes;
    if (!codigo_acceso) codigo_acceso = document.getElementById('classCode')?.value.trim();
    const user = JSON.parse(localStorage.getItem('user'));

    if (!validateNotEmpty(codigo_acceso, 'El código de clase')) return;

    const btnEl = btn || getPrimaryButtonInModal('joinModal');
    setButtonLoading(btnEl, true, 'Uniendo...');
    try {
        const response = await fetch('/api/classes/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                codigo_acceso, 
                estudiante_id: user.id 
            }),
            credentials: 'include'
        });

        const result = await response.json();
        if (response.ok) {
            await showSuccess('¡Unido exitosamente!', 'Te has unido a la clase');
            location.reload();
        } else {
            showError('Código no válido', result.error || 'El código de clase no es válido');
        }
    } catch (error) {
        showError('Error de conexión', 'No se pudo conectar con el servidor');
    } finally {
        setButtonLoading(btnEl, false);
    }
}

async function uploadBanner(classId, event) {
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
            const bannerElement = event.target.closest('.card-header');
            if (bannerElement) {
                bannerElement.style.backgroundImage = `url('${result.url}')`;
            }
            await showSuccess('Banner actualizado', 'El banner se ha actualizado correctamente');
        } else {
            showError('Error al subir banner', result.error || 'No se pudo subir el banner');
        }
    } catch (error) {
        showError('Error de conexión', 'No se pudo conectar con el servidor');
    }
}

function logout() {
    showConfirm(
        '¿Cerrar sesión?',
        '¿Estás seguro de que deseas cerrar sesión?',
        'Sí, cerrar sesión',
        'Cancelar'
    ).then((result) => {
        if (result.isConfirmed) {
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/login';
        }
    });
}
