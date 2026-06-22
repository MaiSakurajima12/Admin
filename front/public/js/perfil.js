async function updateAvatar() {
    const fileInput = document.getElementById('avatarInput');
    const file = fileInput.files[0];

    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    try {
        const response = await fetch('/api/auth/update-avatar', {
            method: 'POST',
            body: formData,
            credentials: 'include'
        });

        const result = await response.json();
        if (response.ok) {
            document.getElementById('profileImage').src = result.url;
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            user.avatar_url = result.url;
            localStorage.setItem('user', JSON.stringify(user));
            
            const deleteBtn = document.querySelector('button[onclick="deleteAvatar()"]');
            if (!deleteBtn) {
                const container = document.querySelector('.position-relative.d-inline-block.mb-3');
                const newDeleteBtn = document.createElement('button');
                newDeleteBtn.className = 'btn btn-sm btn-outline-danger rounded-circle position-absolute bottom-0 start-0';
                newDeleteBtn.onclick = deleteAvatar;
                newDeleteBtn.title = 'Eliminar foto de perfil';
                newDeleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
                container.appendChild(newDeleteBtn);
            }
            
            alert("Foto actualizada correctamente");
        } else {
            alert('Error: ' + (result.error || 'No se pudo actualizar la foto'));
        }
    } catch (err) {
        console.error(err);
        alert('Error al subir la foto');
    }
}

async function deleteAvatar() {
    if (!confirm('¿Estás seguro de que quieres eliminar tu foto de perfil?')) return;

    try {
        const response = await fetch('/api/auth/delete-avatar', {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.ok) {
            document.getElementById('profileImage').src = '/public/img/default-avatar.png';
            const deleteBtn = document.querySelector('button[onclick="deleteAvatar()"]');
            if (deleteBtn) deleteBtn.remove();
            
            alert('Foto de perfil eliminada correctamente');
        } else {
            const error = await response.json();
            alert('Error: ' + (error.error || 'No se pudo eliminar la foto de perfil'));
        }
    } catch (err) {
        console.error(err);
        alert('Error al eliminar la foto de perfil');
    }
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = '/logout';
}

document.getElementById('profileForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const nombre = document.getElementById('nombre').value;
    const apellido = document.getElementById('apellido').value;
    const email = document.getElementById('email').value;
    
    try {
        const response = await fetch('/api/auth/update-profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ nombre, apellido, email })
        });
        
        if (response.ok) {
            alert('Perfil actualizado correctamente');
            location.reload(); 
        } else {
            const error = await response.json();
            alert('Error: ' + (error.error || 'No se pudo actualizar el perfil'));
        }
    } catch (err) {
        console.error(err);
        alert('Error al actualizar el perfil');
    }
});

async function deleteAccount() {
    if (!confirm('¿Estás seguro de que quieres eliminar tu cuenta? Esta acción no se puede deshacer.')) return;
    
    if (!confirm('Esta es tu última oportunidad. ¿Realmente quieres eliminar tu cuenta permanentemente?')) return;
    
    try {
        const response = await fetch('/api/auth/delete-account', {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            alert('Cuenta eliminada correctamente');
            localStorage.removeItem('user');
            window.location.href = '/login';
        } else {
            const error = await response.json();
            alert('Error: ' + (error.error || 'No se pudo eliminar la cuenta'));
        }
    } catch (err) {
        console.error(err);
        alert('Error al eliminar la cuenta');
    }
}