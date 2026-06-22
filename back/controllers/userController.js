const supabase = require('../config/db');

exports.updateAvatar = async (req, res) => {
    try {
        const user = req.user || req.session?.user;
        if (!user) {
            return res.status(401).json({ error: "Sesión expirada o no iniciada" });
        }

        const file = req.file; 

        if (!file) {
            return res.status(400).json({ error: "No se subió ningún archivo" });
        }

        const fileName = `avatar_${user.id}_${Date.now()}`;

        const { data, error } = await supabase.storage
            .from('avatares')
            .upload(fileName, file.buffer, { 
                contentType: file.mimetype,
                upsert: true
            });

        if (error) throw error;

        const { data: publicUrl } = supabase.storage.from('avatares').getPublicUrl(fileName);
        const url = publicUrl.publicUrl;

        const { error: dbError } = await supabase
            .from('usuarios')
            .update({ avatar_url: url })
            .eq('id', user.id);

        if (dbError) throw dbError;

        if (req.session?.user) {
            req.session.user.avatar_url = url;
        }
        if (req.user) {
            req.user.avatar_url = url;
        }

        res.json({ url });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "No se pudo actualizar la foto de perfil" });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const user = req.user || req.session?.user;
        if (!user) {
            return res.status(401).json({ error: "Sesión expirada o no iniciada" });
        }

        const { nombre, apellido, email } = req.body;

        if (!nombre || !apellido || !email) {
            return res.status(400).json({ error: "Todos los campos son requeridos" });
        }

        const { error } = await supabase
            .from('usuarios')
            .update({ nombre, apellido, email })
            .eq('id', user.id);

        if (error) throw error;

        if (req.session?.user) {
            req.session.user.nombre = nombre;
            req.session.user.apellido = apellido;
            req.session.user.email = email;
        }
        if (req.user) {
            req.user.nombre = nombre;
            req.user.apellido = apellido;
            req.user.email = email;
        }

        res.json({ message: "Perfil actualizado correctamente" });
    } catch (err) {
        console.error('Error al actualizar perfil:', err);
        res.status(500).json({ error: "No se pudo actualizar el perfil" });
    }
};

exports.deleteAccount = async (req, res) => {
    try {
        const user = req.user || req.session?.user;
        if (!user) {
            return res.status(401).json({ error: "Sesión expirada o no iniciada" });
        }


        await supabase.from('entregas').delete().eq('estudiante_id', user.id);

        await supabase.from('tareas').delete().eq('creador_id', user.id);

        await supabase.from('anuncios').delete().eq('autor_id', user.id);

        await supabase.from('inscripciones').delete().eq('estudiante_id', user.id);

        const { error } = await supabase
            .from('usuarios')
            .delete()
            .eq('id', user.id);

        if (error) throw error;

        req.session.destroy((err) => {
            if (err) console.error('Error al destruir sesión:', err);
        });

        res.json({ message: "Cuenta eliminada correctamente" });
    } catch (err) {
        console.error('Error al eliminar cuenta:', err);
        res.status(500).json({ error: "No se pudo eliminar la cuenta" });
    }
};

exports.deleteAvatar = async (req, res) => {
    try {
        const user = req.user || req.session?.user;
        if (!user) {
            return res.status(401).json({ error: "Sesión expirada o no iniciada" });
        }

        const { data: userData, error: fetchError } = await supabase
            .from('usuarios')
            .select('avatar_url')
            .eq('id', user.id)
            .single();

        if (fetchError) throw fetchError;

        if (userData.avatar_url) {
            const urlParts = userData.avatar_url.split('/');
            const fileName = urlParts[urlParts.length - 1];

            await supabase.storage
                .from('avatares')
                .remove([fileName])
                .catch(err => console.log('Archivo no encontrado o ya eliminado:', err));
        }

        const { error: updateError } = await supabase
            .from('usuarios')
            .update({ avatar_url: null })
            .eq('id', user.id);

        if (updateError) throw updateError;

        if (req.session?.user) {
            req.session.user.avatar_url = null;
        }
        if (req.user) {
            req.user.avatar_url = null;
        }

        res.json({ message: "Avatar eliminado correctamente" });
    } catch (err) {
        console.error('Error al eliminar avatar:', err);
        res.status(500).json({ error: "No se pudo eliminar el avatar" });
    }
};