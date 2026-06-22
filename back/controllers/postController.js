const supabase = require('../config/db');
const PostModel = require('../model/postModel');

exports.createPost = async (req, res) => {
    try {
        const { contenido, clase_id } = req.body;
        const user = req.user || req.session?.user;
        
        if (!user) {
            return res.status(401).json({ error: "Sesión expirada o no iniciada" });
        }

        const autor_id = user.id;
        let archivo_adjunto_url = null;

        if (req.file) {
            try {
                const fileName = `anuncio_${autor_id}_${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('anuncios')
                    .upload(fileName, req.file.buffer, {
                        contentType: req.file.mimetype,
                        upsert: false
                    });

                if (uploadError) {
                    console.error('No se pudo subir archivo del anuncio:', uploadError.message);
                    return res.status(500).json({ error: 'No se pudo subir el archivo adjunto del anuncio' });
                }

                const { data: publicUrlData, error: publicUrlError } = supabase.storage.from('anuncios').getPublicUrl(fileName);
                if (publicUrlError) {
                    console.warn('No se pudo obtener la URL pública del anuncio:', publicUrlError.message);
                }

                archivo_adjunto_url = publicUrlData?.publicUrl || publicUrlData?.publicURL || `${process.env.SUPABASE_URL}/storage/v1/object/public/anuncios/${fileName}`;
            } catch (uploadErr) {
                console.error('Error al subir archivo del anuncio:', uploadErr.message);
                return res.status(500).json({ error: 'Error al subir el archivo adjunto del anuncio' });
            }
        }

        const { data, error } = await PostModel.create({
            contenido,
            clase_id,
            autor_id,
            archivo_adjunto_url
        });

        if (error) {
            console.error("Error de Supabase:", error);
            throw error;
        }

        res.status(201).json(data[0]);
    } catch (err) {
        console.error("Error en createPost:", err);
        res.status(500).json({ error: "No se pudo publicar el anuncio", detalle: err.message });
    }
};

exports.deletePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const user = req.user || req.session?.user;
        
        if (!user) {
            return res.status(401).json({ error: "Sesión expirada o no iniciada" });
        }

        const { data: post, error: postError } = await supabase.from('anuncios').select('clase_id, autor_id').eq('id', postId).single();
        if (postError || !post) return res.status(404).json({ error: 'Anuncio no encontrado' });

        const { data: clase, error: claseError } = await supabase
            .from('clases')
            .select('profesor_id')
            .eq('id', post.clase_id)
            .single();

        if (claseError) throw claseError;

        const isProfesorDeClase = clase && clase.profesor_id === user.id;
        const isAutorDelAnuncio = post.autor_id === user.id;

        if (!isProfesorDeClase && !isAutorDelAnuncio) {
            return res.status(403).json({ error: 'No tienes permiso para eliminar este anuncio' });
        }

        const { error } = await PostModel.delete(postId);
        if (error) throw error;

        res.json({ message: 'Anuncio eliminado' });
    } catch (err) {
        console.error('Error en deletePost:', err);
        res.status(500).json({ error: 'No se pudo eliminar el anuncio' });
    }
};