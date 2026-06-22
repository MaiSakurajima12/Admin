async function publishAssignment(claseId, btn) {
    const title = document.getElementById('taskTitle')?.value.trim();
    const instructions = document.getElementById('taskInstructions')?.value.trim();
    const points = document.getElementById('taskPoints')?.value;
    const dueDate = document.getElementById('taskDueDate')?.value;
    const dueDateIso = dueDate ? toDateTimeLocalIsoString(dueDate) : '';
    const unitId = document.getElementById('taskUnit')?.value;
    const fileInput = document.getElementById('taskFile');

    if (!validateNotEmpty(title, 'El título de la tarea')) return;
    if (!validateNotEmpty(instructions, 'Las instrucciones')) return;
    if (!validateRange(points, 1, 100, 'Los puntos máximos')) return;
    if (!validateDate(dueDate)) return;

    const rubricaCheckboxes = document.querySelectorAll('input[name="rubricaIds"]:checked');
    const rubricaIds = Array.from(rubricaCheckboxes).map(input => input.value);
    const rubricaTotal = Array.from(rubricaCheckboxes).reduce((sum, input) => {
        return sum + Number(input.dataset.max || 0);
    }, 0);

    if (rubricaIds.length > 0 && (rubricaTotal < 1 || rubricaTotal > 100)) {
        showError('Error de rúbricas', 'La suma de puntos de las rúbricas seleccionadas debe estar entre 1 y 100.');
        return;
    }

    if (fileInput.files[0]) {
        if (!validateFileSize(fileInput.files[0], 20)) return;
    }

    const formData = new FormData();
    formData.append('titulo', title);
    formData.append('descripcion', instructions);
    formData.append('puntos_maximos', points);
    formData.append('fecha_entrega', dueDateIso || dueDate);
    formData.append('clase_id', claseId);
    formData.append('rubrica_ids', JSON.stringify(rubricaIds));
    if (unitId) {
        formData.append('unidad_id', unitId);
    }
    
    if (fileInput.files[0]) {
        formData.append('archivo_guia', fileInput.files[0]);
    }

    const btnEl = btn || getPrimaryButtonInModal('createAssignmentModal');
    setButtonLoading(btnEl, true, 'Creando...');
    showLoading('Creando tarea', 'Por favor espere...');

    try {
        const response = await fetch('/api/assignments', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        if (response.ok) {
            await showSuccess('¡Tarea creada!', 'La tarea ha sido publicada correctamente');
            location.reload();
        } else {
            const errorData = await response.json();
            showError('Error al crear tarea', errorData.error || 'No se pudo subir la tarea');
        }
    } catch (err) {
        showError('Error de conexión', 'No se pudo conectar con el servidor');
    } finally {
        setButtonLoading(btnEl, false);
    }
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
                showError('Error al eliminar', 'No se pudo eliminar la tarea');
            }
        } catch (error) {
            showError('Error de conexión', 'No se pudo conectar con el servidor');
        }
    });
}

async function loadUnitsForClass(claseId) {
    try {
        const response = await fetch(`/api/units/class/${claseId}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            console.error('Error al cargar unidades');
            return;
        }

        const units = await response.json();
        const selectUnit = document.getElementById('taskUnit');

        if (!selectUnit) return;

        // Only replace options when the server returns at least one unit.
        // This prevents the select from being cleared unexpectedly when
        // the backend returns an empty array in certain flows.
        if (Array.isArray(units) && units.length > 0) {
            selectUnit.innerHTML = '<option value="">-- Sin unidad --</option>';
            units.forEach(unit => {
                const option = document.createElement('option');
                option.value = unit.id;
                option.textContent = `${unit.numero_unidad}. ${unit.nombre}`;
                selectUnit.appendChild(option);
            });
        } else {
            // keep existing options (do not clear) and log for debugging
            console.warn('loadUnitsForClass: no units returned, preserving existing options');
        }
    } catch (error) {
        console.error('Error al cargar unidades:', error);
    }
}

async function createUnit(claseId, btn) {
    const unitNumber = document.getElementById('unitNumber')?.value;
    const unitName = document.getElementById('unitName')?.value.trim();
    const unitDescription = document.getElementById('unitDescription')?.value.trim();

    if (!validateNotEmpty(unitName, 'El nombre de la unidad')) return;
    if (!validateRange(unitNumber, 1, 99, 'El número de unidad')) return;

    const btnEl = btn || getPrimaryButtonInModal('createUnitModal');
    setButtonLoading(btnEl, true, 'Creando...');
    showLoading('Creando unidad', 'Por favor espere...');

    try {
        const response = await fetch('/api/units', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                clase_id: claseId,
                numero_unidad: parseInt(unitNumber),
                nombre: unitName,
                descripcion: unitDescription || null
            }),
            credentials: 'include'
        });

        if (response.ok) {
            await showSuccess('¡Unidad creada!', 'La unidad ha sido creada correctamente');

            const modal = bootstrap.Modal.getInstance(document.getElementById('createUnitModal'));
            modal?.hide();

            document.getElementById('unitForm').reset();

            loadUnitsForClass(claseId);
        } else {
            const errorData = await response.json();
            showError('Error al crear unidad', errorData.error || 'No se pudo crear la unidad');
        }
    } catch (err) {
        console.error('Error:', err);
        showError('Error de conexión', 'No se pudo conectar con el servidor');
    } finally {
        setButtonLoading(btnEl, false);
    }
}

function toDateTimeLocalIsoString(dateTimeLocal) {
    if (!dateTimeLocal) return '';
    const [date, time] = dateTimeLocal.split('T');
    if (!date || !time) return '';

    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    const localDate = new Date(year, month - 1, day, hour, minute, 0);
    return isNaN(localDate.getTime()) ? '' : localDate.toISOString();
}

function getMexicoCityMinDateTime() {
    try {
        const formatter = new Intl.DateTimeFormat('sv', {
            timeZone: 'America/Mexico_City',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        return formatter.format(new Date()).replace(' ', 'T');
    } catch (error) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hour}:${minute}`;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const createAssignmentModal = document.getElementById('createAssignmentModal');
    if (createAssignmentModal) {
        createAssignmentModal.addEventListener('show.bs.modal', function(event) {
            const button = event.relatedTarget;
            const claseId = button?.getAttribute('data-clase-id');
            if (claseId) {
                loadUnitsForClass(claseId);
                loadRubricsForAssignment(claseId);
                const dueDateInput = document.getElementById('taskDueDate');
                if (dueDateInput) {
                    const minDate = getMexicoCityMinDateTime();
                    dueDateInput.min = minDate;
                    if (!dueDateInput.value) {
                        dueDateInput.value = minDate;
                    }
                }
            }
        });
    }

    const editAssignmentModal = document.getElementById('editAssignmentModal');
    if (editAssignmentModal) {
        editAssignmentModal.addEventListener('show.bs.modal', function(event) {
            const button = event.relatedTarget;
            const claseId = button?.getAttribute('data-clase-id');
            if (claseId) {
                loadUnitsForEditModal(claseId);
            }
        });
    }
});

async function editAssignment(taskId, claseId, unidadId = '') {
    const response = await fetch(`/api/units/class/${claseId}`, {
        credentials: 'include'
    });

    const units = await response.json();
    const selectUnit = document.getElementById('editTaskUnit');

    if (selectUnit) {
        selectUnit.innerHTML = '<option value="">-- Sin unidad --</option>';
        units.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit.id;
            option.textContent = `${unit.numero_unidad}. ${unit.nombre}`;
            selectUnit.appendChild(option);
        });
        selectUnit.value = unidadId || '';
    }

    document.getElementById('editAssignmentModal').dataset.taskId = taskId;

    const modal = new bootstrap.Modal(document.getElementById('editAssignmentModal'));
    modal.show();
}

async function loadUnitsForEditModal(claseId) {
    try {
        const response = await fetch(`/api/units/class/${claseId}`, {
            credentials: 'include'
        });

        if (!response.ok) return;

        const units = await response.json();
        const selectUnit = document.getElementById('editTaskUnit');

        if (!selectUnit) return;

        if (Array.isArray(units) && units.length > 0) {
            selectUnit.innerHTML = '<option value="">-- Sin unidad --</option>';
            units.forEach(unit => {
                const option = document.createElement('option');
                option.value = unit.id;
                option.textContent = `${unit.numero_unidad}. ${unit.nombre}`;
                selectUnit.appendChild(option);
            });
        } else {
            console.warn('loadUnitsForEditModal: no units returned, preserving existing options');
        }
    } catch (error) {
        console.error('Error al cargar unidades:', error);
    }
}

async function saveTaskUnit(btn) {
    const unitId = document.getElementById('editTaskUnit')?.value;
    const taskId = document.getElementById('editAssignmentModal')?.dataset.taskId;

    if (!taskId) {
        showError('Error', 'No se pudo identificar la tarea');
        return;
    }

    const btnEl = btn || getPrimaryButtonInModal('editAssignmentModal');
    setButtonLoading(btnEl, true, 'Guardando...');
    showLoading('Actualizando tarea', 'Por favor espere...');

    try {
        const response = await fetch(`/api/assignments/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                unidad_id: unitId || null
            }),
            credentials: 'include'
        });

        if (response.ok) {
            await showSuccess('¡Tarea actualizada!', 'La tarea ha sido asignada a la unidad correctamente');
            const modal = bootstrap.Modal.getInstance(document.getElementById('editAssignmentModal'));
            modal?.hide();
            location.reload();
        } else {
            const errorData = await response.json();
            showError('Error', errorData.error || 'No se pudo actualizar la tarea');
        }
    } catch (err) {
        console.error('Error:', err);
        showError('Error de conexión', 'No se pudo conectar con el servidor');
    } finally {
        setButtonLoading(btnEl, false);
    }
}

async function deleteUnit(unitId) {
    showConfirm(
        '¿Eliminar unidad?',
        '¿Estás seguro de que deseas eliminar esta unidad? Esta acción no se puede deshacer.',
        'Sí, eliminar',
        'Cancelar'
    ).then(async (result) => {
        if (!result.isConfirmed) return;

        showLoading('Eliminando unidad', 'Por favor espere...');

        try {
            const response = await fetch(`/api/units/${unitId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (response.ok) {
                await showSuccess('Unidad eliminada', 'La unidad ha sido eliminada correctamente');
                location.reload();
            } else {
                const errorData = await response.json();
                showError('Error al eliminar', errorData.error || 'No se pudo eliminar la unidad');
            }
        } catch (error) {
            showError('Error de conexión', 'No se pudo conectar con el servidor');
        }
    });
}

async function detectAssignmentCompletion() {
    const instructions = document.getElementById('taskInstructions')?.value || '';
    const resultEl = document.getElementById('aiCompletionResult');
    if (!instructions) {
        resultEl.textContent = 'Escribe las instrucciones primero';
        return;
    }
    if (instructions.length > 5000) {
        resultEl.textContent = 'Texto demasiado largo (límite 5000 caracteres)';
        return;
    }
    resultEl.textContent = 'Analizando...';
    try {
        const res = await fetch('/api/integrations/sapling', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ text: instructions })
        });
        const json = await res.json();
        if (!res.ok) {
            resultEl.textContent = json.error || 'Error en análisis';
            return;
        }
        const rawPercent = Number(json.percent);
        if (!Number.isFinite(rawPercent)) {
            resultEl.textContent = 'IA: N/A';
            return;
        }
        const displayPercent = rawPercent <= 1 ? rawPercent * 100 : rawPercent;
        resultEl.textContent = `IA: ${displayPercent.toFixed(1)}% hecho`;
    } catch (err) {
        console.error('Sapling detect error:', err);
        resultEl.textContent = 'Error al analizar con IA';
    }
}