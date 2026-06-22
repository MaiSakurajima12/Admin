
window.rubricModalContext = null;
window.rubricModalTaskId = null;
window.rubricModalClaseId = null;

async function loadAllRubrics() {
    try {
        const response = await fetch('/api/rubrics', {
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Error al cargar rúbricas');
        const rubrics = await response.json();
        displayRubrics(rubrics);
    } catch (err) {
        console.error('Error al cargar rúbricas:', err);
        showError('Error', 'No se pudieron cargar las rúbricas');
    }
}

function openRubricModal(context = null, taskId = null, claseId = null) {
    window.rubricModalContext = context;
    window.rubricModalTaskId = taskId;
    window.rubricModalClaseId = claseId;
    
    if (claseId) {
        loadRubricsByClass(claseId);
    } else {
        loadAllRubrics();
    }
}

async function loadRubricsByClass(claseId) {
    try {
        const response = await fetch(`/api/rubrics/class/${claseId}`, {
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Error al cargar rúbricas de clase');
        const rubrics = await response.json();
        displayRubrics(rubrics);
    } catch (err) {
        console.error('Error al cargar rúbricas de clase:', err);
        showError('Error', 'No se pudieron cargar las rúbricas');
    }
}

async function refreshRubricViews() {
    const claseToUse = window.rubricModalClaseId || window.claseId || null;
    if (claseToUse) {
        await loadRubricsByClass(claseToUse);
    } else {
        await loadAllRubrics();
    }
    if (window.rubricModalContext === 'assignment' && claseToUse) {
        loadRubricsForAssignment(claseToUse);
    }
}


function escapeHtml(value) {
    if (value === undefined || value === null) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function displayRubrics(rubrics) {
    const tbody = document.getElementById('rubricsTableBody');
    if (!tbody) return;

    if (!rubrics || rubrics.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No hay rúbricas aún</td></tr>';
        return;
    }

    tbody.innerHTML = rubrics.map(r => {
        const criterio = r.criterio || '';
        const descripcion = r.descripcion || '';
        return `
        <tr>
            <td><strong>${escapeHtml(criterio)}</strong></td>
            <td>${escapeHtml(descripcion) || '-'}</td>
            <td class="text-center">${r.puntos_maximos}</td>
            <td class="text-center">
                <button type="button" class="menu-button-sm edit-rubric-btn"
                    data-rubric-id="${escapeHtml(r.id)}"
                    data-rubric-criterio="${escapeHtml(criterio)}"
                    data-rubric-descripcion="${escapeHtml(descripcion)}"
                    data-rubric-puntos="${r.puntos_maximos}">
                    <i class="fa-solid fa-pen"></i> Editar
                </button>
                <button type="button" class="menu-button-sm delete-rubric-btn"
                    data-rubric-id="${escapeHtml(r.id)}"
                    data-rubric-criterio="${escapeHtml(criterio)}">
                    <i class="fa-solid fa-trash"></i> Eliminar
                </button>
            </td>
        </tr>
    `;
    }).join('');

    attachRubricRowListeners();
}

function attachRubricRowListeners() {
    document.querySelectorAll('.edit-rubric-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            editRubric(
                btn.dataset.rubricId,
                btn.dataset.rubricCriterio,
                btn.dataset.rubricDescripcion,
                Number(btn.dataset.rubricPuntos)
            );
        });
    });

    document.querySelectorAll('.delete-rubric-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            deleteRubric(btn.dataset.rubricId, btn.dataset.rubricCriterio);
        });
    });
}


async function createNewRubric(btn) {
    const criterio = document.getElementById('newRubricCriterio')?.value;
    const descripcion = document.getElementById('newRubricDescripcion')?.value || '';
    const puntos_maximos = document.getElementById('newRubricPuntos')?.value;

    if (!validateNotEmpty(criterio, 'El criterio')) return;
    if (!validateNotEmpty(puntos_maximos, 'Los puntos máximos')) return;
    if (!validateRange(puntos_maximos, 1, 100, 'Los puntos máximos')) return;

    const btnEl = btn || getPrimaryButtonInModal('rubricModal');
    setButtonLoading(btnEl, true, 'Creando...');
    showLoading('Creando rúbrica', 'Por favor espere...');
    try {
        const payload = {
            criterio,
            descripcion,
            puntos_maximos: Number(puntos_maximos)
        };

        if (window.rubricModalTaskId) {
            payload.tarea_id = window.rubricModalTaskId;
        }

        if (window.rubricModalClaseId) {
            payload.clase_id = window.rubricModalClaseId;
        }

        const response = await fetch('/api/rubrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Error al crear rúbrica');
        }

        await showSuccess('Rúbrica creada', 'La rúbrica se agregó correctamente');
        document.getElementById('newRubricCriterio').value = '';
        document.getElementById('newRubricDescripcion').value = '';
        document.getElementById('newRubricPuntos').value = '';
        
        if (typeof bootstrap !== 'undefined') {
            const modal = bootstrap.Modal.getInstance(document.getElementById('rubricModal'));
            if (modal) modal.hide();
        }

        refreshRubricViews();
    } catch (err) {
        console.error('Error:', err);
        showError('Error', err.message);
    } finally {
        setButtonLoading(btnEl, false);
    }
}


function editRubric(id, criterio, descripcion, puntos) {
    window.rubricModalClaseId = window.claseId || window.rubricModalClaseId || null;
    document.getElementById('editRubricId').value = id;
    document.getElementById('editRubricCriterio').value = criterio;
    document.getElementById('editRubricDescripcion').value = descripcion;
    document.getElementById('editRubricPuntos').value = puntos;

    if (typeof bootstrap !== 'undefined') {
        new bootstrap.Modal(document.getElementById('editRubricModal')).show();
    }
}


async function saveRubricChanges(btn) {
    const id = document.getElementById('editRubricId').value;
    const criterio = document.getElementById('editRubricCriterio').value;
    const descripcion = document.getElementById('editRubricDescripcion').value || '';
    const puntos_maximos = document.getElementById('editRubricPuntos').value;

    if (!validateNotEmpty(criterio, 'El criterio')) return;
    if (!validateNotEmpty(puntos_maximos, 'Los puntos máximos')) return;
    if (!validateRange(puntos_maximos, 1, 100, 'Los puntos máximos')) return;

    const btnEl = btn || getPrimaryButtonInModal('editRubricModal');
    setButtonLoading(btnEl, true, 'Guardando...');
    try {
        const response = await fetch(`/api/rubrics/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ criterio, descripcion, puntos_maximos: Number(puntos_maximos) })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Error al actualizar');
        }

        await showSuccess('Rúbrica actualizada', 'Los cambios se guardaron correctamente');
        
        if (typeof bootstrap !== 'undefined') {
            const modal = bootstrap.Modal.getInstance(document.getElementById('editRubricModal'));
            if (modal) modal.hide();
        }

        refreshRubricViews();
    } catch (err) {
        showError('Error', err.message);
    } finally {
        setButtonLoading(btnEl, false);
    }
}


async function deleteRubric(id, criterio) {
    const result = await showConfirm(
        'Eliminar rúbrica?',
        '¿Estás seguro de que deseas eliminar la rúbrica "' + criterio + '"?',
        'Sí, eliminar',
        'Cancelar'
    );

    if (!result.isConfirmed) return;

    showLoading('Eliminando rúbrica', 'Por favor espere...');
    try {
        const response = await fetch(`/api/rubrics/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            const data = await response.json().catch(() => null);
            throw new Error(data?.error || 'Error al eliminar');
        }

        await showSuccess('Rúbrica eliminada', 'Se eliminó correctamente');
        refreshRubricViews();
    } catch (err) {
        showError('Error', err.message);
    }
}


async function loadRubricsForAssignment(claseId = null) {
    try {
        let endpoint = '/api/rubrics';
        if (claseId) {
            endpoint = `/api/rubrics/class/${claseId}`;
        }

        const response = await fetch(endpoint, {
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Error al cargar rúbricas');
        const rubrics = await response.json();
        
        const container = document.getElementById('rubricsCheckboxContainer');
        if (!container) return;

        if (!rubrics || rubrics.length === 0) {
            container.innerHTML = '<p class="small text-muted mb-0">No hay rúbricas disponibles. <a href="#" onclick="openRubricModal(\'assignment\', null, \'' + (claseId || '') + '\'); return false;">Crear una</a></p>';
            return;
        }

        container.innerHTML = rubrics.map(r => `
            <div class="form-check">
                <input class="form-check-input" type="checkbox" value="${r.id}" id="rubrica_${r.id}" name="rubricaIds" data-max="${r.puntos_maximos}">
                <label class="form-check-label" for="rubrica_${r.id}">
                    <strong>${r.criterio}</strong> - ${r.puntos_maximos} pts
                    ${r.descripcion ? `<div class="small text-muted ms-4">${r.descripcion}</div>` : ''}
                </label>
            </div>
        `).join('');
    } catch (err) {
        console.error('Error al cargar rúbricas:', err);
    }
}


async function loadRubricsForGrading(tareaId) {
    try {
        const response = await fetch(`/api/rubrics/task/${tareaId}`, {
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Error al cargar rúbricas');
        const rubrics = await response.json();

        const container = document.getElementById('rubricGradingContainer');
        if (!container) return;

        if (!rubrics || rubrics.length === 0) {
            container.innerHTML = '<p class="text-muted small">No hay rúbricas para esta tarea.</p>';
            return;
        }

        let totalMax = 0;
        const rubricsHtml = rubrics.map((tr, idx) => {
            const rubric = tr.rubricas || tr;
            totalMax += rubric.puntos_maximos;
            return `
                <div class="mb-3 p-3 border rounded bg-light">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                            <strong>${rubric.criterio}</strong>
                            ${rubric.descripcion ? `<div class="small text-muted">${rubric.descripcion}</div>` : ''}
                        </div>
                        <span class="badge bg-primary">${rubric.puntos_maximos} pts</span>
                    </div>
                    <input type="number" class="form-control form-control-sm rubric-grade-input" 
                           id="rubricGrade_${rubric.id}" 
                           min="0" max="${rubric.puntos_maximos}" 
                           placeholder="Calificación" style="max-width: 120px;">
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="mb-3">
                <h6 class="fw-bold mb-3">Calificar por rúbrica:</h6>
                ${rubricsHtml}
                <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mt-3">
                    <div>
                        <span class="small text-muted">Total de rúbrica:</span>
                        <div class="fw-bold fs-5"><span id="rubricTotalScore">0</span> / <span id="rubricTotalMaxScore">${totalMax}</span></div>
                    </div>
                    <button type="button" class="btn btn-success btn-sm" onclick="saveRubricGrades(window.currentSubmissionId)">Confirmar calificación por rúbrica</button>
                </div>
            </div>
        `;

        attachRubricGradeListeners();
    } catch (err) {
        console.error('Error al cargar rúbricas para calificación:', err);
    }
}


async function saveRubricGrades(entregaId = window.currentSubmissionId) {
    const inputs = document.querySelectorAll('.rubric-grade-input');
    const calificaciones = {};
    let valido = true;

    inputs.forEach(input => {
        const rubricId = input.id.replace('rubricGrade_', '');
        const valor = input.value;
        
        if (valor === '') {
            input.classList.add('is-invalid');
            valido = false;
        } else {
            input.classList.remove('is-invalid');
            calificaciones[rubricId] = Number(valor);
        }
    });

    if (!valido) {
        showError('Error de validación', 'Completa todas las calificaciones de rúbricas');
        return;
    }

    try {
        const response = await fetch(`/api/rubrics/submission/${entregaId}/grades`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ calificaciones })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Error al guardar');
        }

        await showSuccess('Calificaciones guardadas', 'Se registraron las puntuaciones por rúbrica');
        updateRubricTotal();
    } catch (err) {
        showError('Error', err.message);
    }
}


function attachRubricGradeListeners() {
    const inputs = document.querySelectorAll('.rubric-grade-input');
    inputs.forEach(input => {
        input.addEventListener('input', updateRubricTotal);
    });
    updateRubricTotal();
}

function updateRubricTotal() {
    const inputs = document.querySelectorAll('.rubric-grade-input');
    let totalScore = 0;
    let totalMax = 0;

    inputs.forEach(input => {
        const max = Number(input.getAttribute('max')) || 0;
        const value = Number(input.value) || 0;
        totalScore += value;
        totalMax += max;
    });

    const totalScoreEl = document.getElementById('rubricTotalScore');
    const totalMaxEl = document.getElementById('rubricTotalMaxScore');
    if (totalScoreEl) totalScoreEl.textContent = totalScore;
    if (totalMaxEl) totalMaxEl.textContent = totalMax;

    const notaInput = document.getElementById('notaInput');
    if (notaInput) {
        notaInput.value = totalScore;
    }
}


async function loadStudentRubricGrades(entregaId) {
    try {
        const response = await fetch(`/api/rubrics/submission/${entregaId}`, {
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Error al cargar calificaciones');
        const grades = await response.json();

        const container = document.getElementById('studentRubricGradesContainer');
        if (!container) return;

        if (!grades || grades.length === 0) {
            container.innerHTML = '<p class="text-muted small">No hay calificaciones por rúbrica aún.</p>';
            return;
        }

        let totalScore = 0;
        let maxScore = 0;
        
        const gradesHtml = grades.map(g => {
            const rubric = g.rubricas || g;
            const scored = g.puntos_obtenidos || 0;
            totalScore += scored;
            maxScore += rubric.puntos_maximos;
            const percent = ((scored) / rubric.puntos_maximos * 100).toFixed(0);
            
            return `
                <div class="mb-2 p-2 border-start border-info ps-3">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <strong>${rubric.criterio}</strong>
                            <div class="small text-muted">${scored}/${rubric.puntos_maximos}</div>
                        </div>
                        <span class="badge ${percent >= 70 ? 'bg-success' : percent >= 50 ? 'bg-warning' : 'bg-danger'}">${percent}%</span>
                    </div>
                </div>
            `;
        }).join('');

        const avgPercent = (totalScore / maxScore * 100).toFixed(0);
        const color = avgPercent >= 70 ? 'success' : avgPercent >= 50 ? 'warning' : 'danger';

        container.innerHTML = `
            <div class="bg-light p-3 rounded mb-3">
                <h6 class="fw-bold mb-3">Desglose de puntuación:</h6>
                ${gradesHtml}
                <div class="mt-3 pt-3 border-top">
                    <div class="d-flex justify-content-between align-items-center">
                        <strong>Total:</strong>
                        <span class="badge bg-${color} fs-6">${totalScore}/${maxScore} (${avgPercent}%)</span>
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        console.error('Error al cargar calificaciones:', err);
    }
}

async function loadRubricsForTaskDetail(tareaId) {
    try {
        const response = await fetch(`/api/rubrics/task/${tareaId}`, {
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Error al cargar rúbricas');
        const rubrics = await response.json();

        const container = document.getElementById('rubricasDetalleContainer');
        if (!container) return;

        if (!rubrics || rubrics.length === 0) {
            return;
        }

        let totalMaxPuntos = 0;
        const rubricasHtml = rubrics.map(tr => {
            const rubric = tr.rubricas || tr;
            totalMaxPuntos += rubric.puntos_maximos;
            return `
                <div class="p-3 border-bottom">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <strong>${rubric.criterio}</strong>
                            ${rubric.descripcion ? `<div class="small text-muted mt-1">${rubric.descripcion}</div>` : ''}
                        </div>
                        <span class="badge bg-info">${rubric.puntos_maximos} pts</span>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div class="card border-0 shadow-sm">
                <div class="card-header bg-light fw-bold">
                    <i class="fa-solid fa-list-check me-2"></i> Rúbricas de evaluación
                </div>
                <div class="card-body p-0">
                    ${rubricasHtml}
                    <div class="p-3 bg-light">
                        <div class="d-flex justify-content-between">
                            <span>Puntos totales por rúbrica:</span>
                            <strong>${totalMaxPuntos} puntos</strong>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        console.error('Error al cargar rúbricas para detalles de tarea:', err);
    }
}
