document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const btn = document.getElementById('loginBtn');

    if (!validateNotEmpty(email, 'El correo electrónico')) return;
    if (!validateEmail(email)) return;
    if (!validateNotEmpty(password, 'La contraseña')) return;
    if (password.length > 16) {
        showError('Contraseña demasiado larga', 'La contraseña no debe exceder 16 caracteres');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Verificando...';

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const result = await response.json();

        if (response.ok) {
            localStorage.setItem('user', JSON.stringify(result.user));
            await showSuccess('¡Bienvenido!', 'Redirigiendo...');

            const isSupport = result.user?.is_support || result.user?.rol === 'soporte';
            window.location.href = isSupport ? '/support' : '/dashboard';
        } else {
            showError('Error al iniciar sesión', result.error || 'Credenciales incorrectas');
        }
    } catch (error) {
        showError('Error de conexión', 'No se pudo conectar con el servidor');
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Ingresar';
    }
});