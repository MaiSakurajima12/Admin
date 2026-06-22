document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = document.getElementById('nombre').value.trim();
    const apellido = document.getElementById('apellido').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword')?.value || '';
    
    const btn = document.getElementById('regBtn');

    if (!validateNotEmpty(nombre, 'El nombre')) return;
    if (!validateNotEmpty(apellido, 'El apellido')) return;
    if (!validateEmail(email)) return;
    if (!validateNotEmpty(password, 'La contraseña')) return;
    if (password.length > 16) {
        showError('Contraseña demasiado larga', 'La contraseña no debe exceder 16 caracteres');
        return;
    }
    if (!validatePassword(password)) return;

    if (confirmPassword && password !== confirmPassword) {
        showError('Contraseñas no coinciden', 'Las contraseñas deben ser idénticas');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Registrando...';

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, apellido, email, password })
        });

        const result = await response.json();

        if (response.ok) {
            await showSuccess('¡Registro exitoso!', 'Redirigiendo al login...');
            setTimeout(() => {
                window.location.href = '/login';
            }, 1500);
        } else {
            showError('Error al registrar', result.error || 'No se pudo crear la cuenta');
            btn.disabled = false;
            btn.innerHTML = 'Crear mi cuenta';
        }
    } catch (error) {
        showError('Error de conexión', 'No se pudo conectar con el servidor');
        btn.disabled = false;
        btn.innerHTML = 'Crear mi cuenta';
    }
});