
/**
 * Muestra un error
 * @param {string} title - Título del error
 * @param {string} message - Mensaje del error
 */
function showError(title = 'Error', message = 'Ha ocurrido un error') {
    return Swal.fire({
        icon: 'error',
        title: title,
        text: message,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Aceptar',
        timer: 8000,
        timerProgressBar: true,
        didOpen: (modal) => {
         
            modal.dataset.isError = 'true';
        }
    });
}

/**
 * Muestra un éxito
 * @param {string} title - Título del éxito
 * @param {string} message - Mensaje del éxito
 */
function showSuccess(title = 'Éxito', message = 'Operación realizada correctamente') {
    return Swal.fire({
        icon: 'success',
        title: title,
        text: message,
        confirmButtonColor: '#28a745',
        confirmButtonText: 'Aceptar',
        timer: 2000
    });
}

/**
 * Muestra una advertencia
 * @param {string} title - Título de la advertencia
 * @param {string} message - Mensaje de la advertencia
 */
function showWarning(title = 'Advertencia', message = 'Por favor, verifica tu información') {
    return Swal.fire({
        icon: 'warning',
        title: title,
        text: message,
        confirmButtonColor: '#ffc107',
        confirmButtonText: 'Aceptar',
        timer: 6000,
        timerProgressBar: true
    });
}

/**
 * Muestra información
 * @param {string} title - Título de la información
 * @param {string} message - Mensaje de información
 */
function showInfo(title = 'Información', message = 'Información importante') {
    return Swal.fire({
        icon: 'info',
        title: title,
        text: message,
        confirmButtonColor: '#17a2b8',
        confirmButtonText: 'Aceptar',
        timer: 5000,
        timerProgressBar: true
    });
}

/**
 * Muestra una confirmación
 * @param {string} title - Título de la confirmación
 * @param {string} message - Mensaje de confirmación
 * @param {string} confirmText - Texto del botón confirmar
 * @param {string} cancelText - Texto del botón cancelar
 */
function showConfirm(title = '¿Está seguro?', message = '', confirmText = 'Sí, continuar', cancelText = 'Cancelar') {
    return Swal.fire({
        icon: 'question',
        title: title,
        text: message,
        showCancelButton: true,
        confirmButtonColor: '#007bff',
        cancelButtonColor: '#6c757d',
        confirmButtonText: confirmText,
        cancelButtonText: cancelText
    });
}

/**
 * Muestra un loading
 * @param {string} title - Título del loading
 * @param {string} message - Mensaje durante la carga
 */
function showLoading(title = 'Cargando...', message = 'Por favor espere') {
    return Swal.fire({
        title: title,
        text: message,
        icon: 'info',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: (modal) => {
            Swal.showLoading();
        }
    });
}

/**
 * Valida que un campo no esté vacío
 * @param {string} value - Valor del campo
 * @param {string} fieldName - Nombre del campo para mostrar en el mensaje
 */
function validateNotEmpty(value, fieldName = 'Este campo') {
    if (!value || value.trim() === '') {
        showError('Campo requerido', `${fieldName} es obligatorio`);
        return false;
    }
    return true;
}

/**
 * Valida formato de email
 * @param {string} email - Email a validar
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('Email inválido', 'Por favor ingresa un email válido');
        return false;
    }
    return true;
}

/**
 * Valida contraseña fuerte
 * @param {string} password - Contraseña a validar
 */
function validatePassword(password) {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
        showError('Contraseña débil', 
            'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número');
        return false;
    }
    return true;
}

/**
 * Valida que un archivo sea del tipo especificado
 * @param {File} file - Archivo a validar
 * @param {Array} allowedTypes - Tipos MIME permitidos (ej: ['application/pdf', 'image/jpeg'])
 */
function validateFileType(file, allowedTypes = []) {
    if (!file) return true;
    
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
        showError('Tipo de archivo no válido', 
            `Solo se permiten archivos: ${allowedTypes.join(', ')}`);
        return false;
    }
    return true;
}

/**
 * Valida el tamaño de un archivo (en MB)
 * @param {File} file - Archivo a validar
 * @param {number} maxSizeMB - Tamaño máximo en MB
 */
function validateFileSize(file, maxSizeMB = 10) {
    if (!file) return true;
    
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        showError('Archivo muy grande', 
            `El archivo no debe exceder ${maxSizeMB}MB. Tu archivo pesa ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        return false;
    }
    return true;
}

/**
 * Valida que un número esté en un rango
 * @param {number} value - Valor a validar
 * @param {number} min - Valor mínimo
 * @param {number} max - Valor máximo
 * @param {string} fieldName - Nombre del campo
 */
function validateRange(value, min = 0, max = 100, fieldName = 'Este valor') {
    const num = parseFloat(value);
    if (isNaN(num) || num < min || num > max) {
        showError('Valor inválido', 
            `${fieldName} debe estar entre ${min} y ${max}`);
        return false;
    }
    return true;
}

/**
 * Valida que una fecha sea válida y futura
 * @param {string} dateString - Fecha en formato YYYY-MM-DD o YYYY-MM-DDTHH:mm
 * @param {boolean} mustBeFuture - Si debe ser fecha futura
 */
function validateDate(dateString, mustBeFuture = true) {
    if (!dateString) {
        showError('Fecha requerida', 'Por favor selecciona una fecha y hora');
        return false;
    }

    const selectedDate = parseMexicoCityDateTime(dateString);
    if (!selectedDate) {
        showError('Fecha inválida', 'La fecha y hora de entrega no es válida');
        return false;
    }

    const now = new Date();
    if (mustBeFuture && selectedDate <= now) {
        showError('Fecha inválida', 'La fecha y hora de entrega debe ser posterior a la actual');
        return false;
    }

    return true;
}

function parseMexicoCityDateTime(dateString) {
    if (!dateString) return null;

    const isoDate = new Date(dateString);
    if (!isNaN(isoDate.getTime())) {
        return isoDate;
    }

    const [dateOnly, timeOnly] = dateString.split('T');
    if (!dateOnly || !timeOnly) return null;

    const [year, month, day] = dateOnly.split('-').map(Number);
    const [hours, minutes] = timeOnly.split(':').map(Number);
    if ([year, month, day, hours, minutes].some(value => Number.isNaN(value))) return null;

    const offset = getMexicoCityOffsetForDate(dateString);
    const parsed = new Date(`${dateOnly}T${timeOnly}:00${offset}`);
    return isNaN(parsed.getTime()) ? null : parsed;
}

function getMexicoCityOffsetForDate(dateTimeLocal) {
    const [date] = dateTimeLocal.split('T');
    const [year, month, day] = date.split('-').map(Number);

    if (month > 4 && month < 10) return '-05:00';
    if (month < 4 || month > 10) return '-06:00';
    if (month === 4) return day >= 5 ? '-05:00' : '-06:00';
    if (month === 10) return day >= 25 ? '-06:00' : '-05:00';
    return '-06:00';
}

/**
 * Muestra una alerta con HTML personalizado
 * @param {string} title - Título
 * @param {string} htmlContent - Contenido HTML
 * @param {string} icon - Icono (success, error, warning, info, question)
 */
function showCustomAlert(title, htmlContent, icon = 'info') {
    return Swal.fire({
        icon: icon,
        title: title,
        html: htmlContent,
        confirmButtonColor: '#007bff',
        confirmButtonText: 'Aceptar'
    });
}
function isSpeechRecognitionSupported() {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function startVoiceDictation(fieldId, button) {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Recognition) {
        return showError('Dictado no disponible', 'Tu navegador no soporta dictado de voz.');
    }

    const textarea = document.getElementById(fieldId);
    if (!textarea) return;

    const originalText = button?.textContent || 'Dictar';
    if (button) {
        button.disabled = true;
        button.textContent = 'Escuchando...';
    }

    const recognition = new Recognition();
    recognition.lang = 'es-ES';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join(' ')
            .trim();

        if (transcript) {
            textarea.value = textarea.value ? `${textarea.value} ${transcript}` : transcript;
        }
    };

    recognition.onerror = (event) => {
        const errCode = event?.error || '';
        let friendly = 'No se pudo usar el micrófono.';
        if (errCode === 'network') friendly = 'Error de red durante el dictado. Revisa tu conexión.';
        else if (errCode === 'no-speech') friendly = 'No se detectó voz. Intenta de nuevo.';
        else if (errCode === 'not-allowed' || errCode === 'service-not-allowed') friendly = 'Permiso denegado para usar el micrófono. Revisa los permisos del navegador.';
        else if (errCode === 'aborted') friendly = 'Dictado abortado.';
        else if (errCode === 'audio-capture') friendly = 'No se pudo acceder al micrófono.';

        showError('Error de dictado', friendly + (errCode ? ` (${errCode})` : ''));
    };

    recognition.onend = () => {
        if (button) {
            button.disabled = false;
            button.textContent = originalText;
        }
    };

    try {
        recognition.start();
    } catch (err) {
        if (button) {
            button.disabled = false;
            button.textContent = originalText;
        }
        showError('Error de dictado', 'No se pudo iniciar el micrófono.');
    }
}

async function transcribeAudioFileToField(fieldId, fileInputId, bucket = 'anuncios') {
    const textarea = document.getElementById(fieldId);
    const fileInput = document.getElementById(fileInputId);

    if (!textarea || !fileInput || !fileInput.files[0]) {
        return showError('Archivo requerido', 'Selecciona un archivo de audio primero.');
    }

    const file = fileInput.files[0];
    if (!file.type.startsWith('audio/')) {
        return showError('Archivo no válido', 'Selecciona un archivo de audio.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', bucket);

    const loading = showLoading('Transcribiendo audio', 'Espera un momento...');

    try {
        const response = await fetch('/api/integrations/transcribe-upload', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });
        const json = await response.json();

        if (!response.ok) {
            throw new Error(json.error || 'No se pudo transcribir el audio');
        }

        textarea.value = textarea.value ? `${textarea.value}\n${json.transcript}` : json.transcript;
        fileInput.value = '';
        await showSuccess('Transcripción completa', 'El audio se ha convertido a texto correctamente.');
    } catch (err) {
        showError('Error al transcribir', err.message || 'No se pudo transcribir el audio.');
    } finally {
        // Loading modal is replaced by success/error alerts automatically
    }
}
