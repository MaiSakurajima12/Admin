const ClassModel = require('../model/classModel');
const supabase = require('../config/db'); 

const crypto = require('crypto'); 

exports.createClass = async (req, res) => {
    try {
        const { nombre_clase, seccion, materia, profesor_id } = req.body;

        if (!nombre_clase || nombre_clase.trim() === '') {
            return res.status(400).json({ error: "El nombre de la clase es obligatorio" });
        }
        if (!seccion || seccion.trim() === '') {
            return res.status(400).json({ error: "La sección es obligatoria" });
        }
        if (!profesor_id) {
            return res.status(400).json({ error: "El profesor es obligatorio" });
        }

        const { data: profesor } = await supabase
            .from('usuarios')
            .select('id')
            .eq('id', profesor_id)
            .single();

        if (!profesor) {
            return res.status(400).json({ error: "El profesor especificado no existe" });
        }

        let codigo_acceso = crypto.randomBytes(3).toString('hex');
        codigo_acceso = codigo_acceso.toUpperCase();

        const { data: nuevaClase, error: errorClase } = await supabase
            .from('clases')
            .insert([{ 
                nombre_clase, 
                seccion, 
                materia: materia || null, 
                profesor_id, 
                codigo_acceso 
            }])
            .select()
            .single();

        if (errorClase) throw errorClase;

        await supabase
            .from('inscripciones')
            .insert([{ 
                estudiante_id: profesor_id, 
                clase_id: nuevaClase.id, 
                rol_en_clase: 'profesor' 
            }]);

        res.status(201).json(nuevaClase);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "No se pudo crear la clase" });
    }
};

exports.joinClass = async (req, res) => {
    try {
        const { codigo_acceso } = req.body;
        const user = req.user || req.session?.user;
        if (!user) {
            return res.status(401).json({ error: "Sesión expirada o no iniciada" });
        }
        const usuario_id = user.id;

        if (!codigo_acceso || codigo_acceso.trim() === '') {
            return res.status(400).json({ error: "El código de clase es obligatorio" });
        }

        const normalizedCode = codigo_acceso.toUpperCase();
        const { data: clase, error: claseError } = await supabase
            .from('clases')
            .select('id')
            .eq('codigo_acceso', normalizedCode)
            .single();

        if (claseError || !clase) {
            return res.status(404).json({ error: "Código de clase no encontrado" });
        }

        const { data: existingInscripcion } = await supabase
            .from('inscripciones')
            .select('id')
            .eq('clase_id', clase.id)
            .eq('estudiante_id', usuario_id)
            .single();

        if (existingInscripcion) {
            return res.status(400).json({ error: "Ya estás inscrito en esta clase" });
        }

        const { error: joinError } = await supabase
            .from('inscripciones') 
            .insert([{ 
                clase_id: clase.id, 
                estudiante_id: usuario_id, 
                rol_en_clase: 'estudiante' 
            }]);

        if (joinError) throw joinError;

        res.status(200).json({ message: "¡Unido con éxito!" });

    } catch (err) {
        console.error("Error al unirse:", err);
        res.status(500).json({ error: "No se pudo completar la unión a la clase" });
    }
};

exports.removeStudent = async (req, res) => {
    try {
        const { classId, studentId } = req.params;
        const user = req.user || req.session?.user;
        if (!user) {
            return res.status(401).json({ error: "Sesión expirada o no iniciada" });
        }
        const userId = user.id;

        const { data: clase } = await supabase
            .from('clases')
            .select('profesor_id')
            .eq('id', classId)
            .single();

        if (!clase) {
            return res.status(404).json({ error: 'Clase no encontrada' });
        }

        if (clase.profesor_id !== userId) {
            return res.status(403).json({ error: 'Solo el profesor puede dar de baja alumnos' });
        }

        const { data: inscripcion } = await supabase
            .from('inscripciones')
            .select('rol_en_clase')
            .eq('clase_id', classId)
            .eq('estudiante_id', studentId)
            .single();

        if (!inscripcion) {
            return res.status(404).json({ error: 'Inscripción no encontrada' });
        }

        if (inscripcion.rol_en_clase !== 'estudiante') {
            return res.status(400).json({ error: 'No se puede eliminar a este usuario' });
        }

        const { error } = await supabase
            .from('inscripciones')
            .delete()
            .eq('clase_id', classId)
            .eq('estudiante_id', studentId);

        if (error) throw error;

        res.json({ message: 'Alumno dado de baja correctamente' });
    } catch (err) {
        console.error('Error al dar de baja alumno:', err);
        res.status(500).json({ error: 'No se pudo dar de baja al alumno' });
    }
};

exports.uploadBanner = async (req, res) => {
    try {
        const { classId } = req.params;
        const user = req.user || req.session?.user;
        const file = req.file;

        if (!user) {
            return res.status(401).json({ error: "Sesión expirada o no iniciada" });
        }

        if (!file) {
            return res.status(400).json({ error: "No se subió ningún archivo" });
        }

        const { data: clase } = await supabase
            .from('clases')
            .select('profesor_id, portada_url')
            .eq('id', classId)
            .single();

        if (!clase) {
            return res.status(404).json({ error: 'Clase no encontrada' });
        }

        if (clase.profesor_id !== user.id) {
            return res.status(403).json({ error: 'Solo el profesor puede actualizar el banner' });
        }

        if (clase.portada_url) {
            const urlParts = clase.portada_url.split('/');
            const fileName = urlParts[urlParts.length - 1];
            await supabase.storage
                .from('class-banners')
                .remove([fileName])
                .catch(err => console.log('Archivo anterior no encontrado:', err));
        }

        const fileName = `banner_${classId}_${Date.now()}`;
        const { data, error } = await supabase.storage
            .from('class-banners')
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (error) throw error;

        const { data: publicUrl } = supabase.storage
            .from('class-banners')
            .getPublicUrl(fileName);
        const url = publicUrl.publicUrl;

        const { error: updateError } = await supabase
            .from('clases')
            .update({ portada_url: url })
            .eq('id', classId);

        if (updateError) throw updateError;

        res.json({ url });
    } catch (err) {
        console.error('Error al subir banner:', err);
        res.status(500).json({ error: 'No se pudo subir el banner' });
    }
};

exports.deleteClass = async (req, res) => {
    try {
        const { classId } = req.params;
        const user = req.user || req.session?.user;

        if (!user) {
            return res.status(401).json({ error: "Sesión expirada o no iniciada" });
        }

        const { data: clase, error: claseError } = await supabase
            .from('clases')
            .select('profesor_id')
            .eq('id', classId)
            .single();

        if (claseError || !clase) {
            return res.status(404).json({ error: 'Clase no encontrada' });
        }

        if (clase.profesor_id !== user.id) {
            return res.status(403).json({ error: 'Solo el profesor puede eliminar la clase' });
        }

        const { data: tareas } = await supabase
            .from('tareas')
            .select('id')
            .eq('clase_id', classId);

        if (tareas && tareas.length > 0) {
            await supabase
                .from('entregas')
                .delete()
                .in('tarea_id', tareas.map(t => t.id));
        }

        await supabase
            .from('tareas')
            .delete()
            .eq('clase_id', classId);

        await supabase
            .from('rubricas')
            .delete()
            .eq('clase_id', classId);

        await supabase
            .from('anuncios')
            .delete()
            .eq('clase_id', classId);

        await supabase
            .from('inscripciones')
            .delete()
            .eq('clase_id', classId);

        const { error: deleteError } = await supabase
            .from('clases')
            .delete()
            .eq('id', classId);

        if (deleteError) throw deleteError;

        res.json({ message: 'Clase eliminada correctamente' });
    } catch (err) {
        console.error('Error al eliminar clase:', err);
        res.status(500).json({ error: 'No se pudo eliminar la clase' });
    }
};