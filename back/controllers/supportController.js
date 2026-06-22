const SupportModel = require('../model/supportModel');
const supabase = require('../config/db');

const allowedProblemTypes = [
    'Problemas de cuenta y acceso',
    'Falla en la carga de datos/archivos',
    'Errores de interfaz',
    'Sugerencia de mejora/comentarios'
];

exports.createReport = async (req, res) => {
    try {
        const usuario = req.user || req.session?.user;
        if (!usuario) {
            return res.status(401).json({ error: 'Sesión expirada o no iniciada' });
        }

        const { tipo_problema, descripcion } = req.body;
        let url_evidencia = null;

        if (!tipo_problema || !allowedProblemTypes.includes(tipo_problema)) {
            return res.status(400).json({ error: 'Tipo de problema inválido' });
        }
        if (!descripcion || descripcion.trim().length === 0) {
            return res.status(400).json({ error: 'La descripción es obligatoria' });
        }
        if (descripcion.length > 1000) {
            return res.status(400).json({ error: 'La descripción no puede exceder 1000 caracteres' });
        }

        if (req.file) {
            try {
                const fileName = `soporte_${usuario.id}_${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('evidencias_soporte')
                    .upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: false });

                if (uploadError) {
                    console.warn('No se pudo subir evidencia de soporte:', uploadError.message);
                } else {
                    const { data: publicUrlData } = supabase.storage.from('evidencias_soporte').getPublicUrl(fileName);
                    url_evidencia = publicUrlData?.publicUrl || publicUrlData?.publicURL || `${process.env.SUPABASE_URL}/storage/v1/object/public/evidencias_soporte/${fileName}`;
                }
            } catch (uploadErr) {
                console.warn('Error al subir evidencia de soporte:', uploadErr.message);
            }
        }

        const { data, error } = await SupportModel.create({
            usuario_id: usuario.id,
            tipo_problema,
            descripcion,
            url_evidencia
        });

        if (error) {
            console.error('Error al guardar el reporte de soporte:', error);
            throw error;
        }

        res.status(201).json({ message: 'Reporte de soporte enviado correctamente', ticket: data[0] });
    } catch (err) {
        console.error('Error en supportController.createReport:', err);
        const errorMessage = err.message || err.details || 'No se pudo crear el reporte de soporte';
        res.status(500).json({ error: errorMessage });
    }
};

exports.listUserReports = async (req, res) => {
    try {
        const usuario = req.user || req.session?.user;
        if (!usuario) return res.status(401).json({ error: 'No autorizado' });

        const { data, error } = await SupportModel.getByUser(usuario.id);
        if (error) throw error;

      
        const rows = data || [];
        const assignedIds = [...new Set(rows.filter(r => r.asignado_a).map(r => r.asignado_a))];
        if (assignedIds.length > 0) {
            try {
                const { data: techs } = await supabase.from('usuarios').select('id, nombre, apellido, avatar_url').in('id', assignedIds);
                const map = (techs || []).reduce((acc, t) => { acc[t.id] = t; return acc; }, {});
                rows.forEach(r => { r.asignado = r.asignado_a ? map[r.asignado_a] || null : null; });
            } catch (e) {
                console.warn('Could not fetch assigned users for listUserReports:', e.message || e);
            }
        }

        res.json(rows);
    } catch (err) {
        console.error('Error listando reportes:', err);
        res.status(500).json({ error: 'No se pudieron obtener los reportes' });
    }
};

exports.listAllReports = async (req, res) => {
    try {
        const { data, error } = await SupportModel.getAll();
        if (error) throw error;
        const rows = data || [];
        const assignedIds = [...new Set(rows.filter(r => r.asignado_a).map(r => r.asignado_a))];
        if (assignedIds.length > 0) {
            try {
                const { data: techs } = await supabase.from('usuarios').select('id, nombre, apellido, avatar_url').in('id', assignedIds);
                const map = (techs || []).reduce((acc, t) => { acc[t.id] = t; return acc; }, {});
                rows.forEach(r => { r.asignado = r.asignado_a ? map[r.asignado_a] || null : null; });
            } catch (e) {
                console.warn('Could not fetch assigned users for listAllReports:', e.message || e);
            }
        }

        res.json(rows);
    } catch (err) {
        console.error('Error listando todos los reportes:', err);
        res.status(500).json({ error: 'No se pudieron obtener los reportes' });
    }
};

exports.updateReport = async (req, res) => {
    try {
        const usuario = req.user || req.session?.user;
        if (!usuario) return res.status(401).json({ error: 'No autorizado' });

        const id = req.params.id;
        const allowedStates = ['abierto', 'en_progreso', 'cerrado'];
        const patch = {};

        if (req.body.estado !== undefined) {
            if (!allowedStates.includes(req.body.estado)) {
                return res.status(400).json({ error: 'Estado inválido' });
            }
            patch.estado = req.body.estado;
        }

        if (req.body.asignado_a !== undefined) {
            const asignadoId = Number(req.body.asignado_a);
            if (!Number.isInteger(asignadoId) || asignadoId <= 0) {
                return res.status(400).json({ error: 'ID de técnico inválido' });
            }
           
            try {
                const { data: tech, error: techErr } = await supabase
                    .from('usuarios')
                    .select('id, is_support')
                    .eq('id', asignadoId)
                    .single();
                if (techErr || !tech) {
                    return res.status(400).json({ error: 'Técnico no encontrado' });
                }
                if (!tech.is_support) {
                    return res.status(400).json({ error: 'Usuario no es técnico' });
                }
            } catch (verErr) {
                console.error('Error verificando técnico:', verErr);
                return res.status(500).json({ error: 'Error al verificar técnico' });
            }
            patch.asignado_a = asignadoId;
        }

        if (Object.keys(patch).length === 0) return res.status(400).json({ error: 'Nada para actualizar' });

        const { data, error } = await SupportModel.updateStatus(id, patch);
        if (error) throw error;

        res.json({ message: 'Reporte actualizado', report: data });
    } catch (err) {
        console.error('Error actualizando reporte:', err);
        res.status(500).json({ error: 'No se pudo actualizar el reporte' });
    }
};

exports.getReport = async (req, res) => {
    try {
        const usuario = req.user || req.session?.user;
        if (!usuario) return res.status(401).json({ error: 'No autorizado' });

        const id = req.params.id;
        const { data, error } = await SupportModel.getById(id);
        if (error || !data) return res.status(404).json({ error: 'Reporte no encontrado' });

 
        let reporter = null;
        try {
            const { data: udata, error: uerr } = await supabase
                .from('usuarios')
                .select('id, nombre, apellido, email')
                .eq('id', data.usuario_id)
                .single();
            if (!uerr && udata) reporter = udata;
        } catch (ue) {
            console.warn('Could not fetch reporter info:', ue.message);
        }

      
        let assigned = null;
        try {
            if (data.asignado_a) {
                const { data: auser, error: aerr } = await supabase.from('usuarios').select('id, nombre, apellido, avatar_url').eq('id', data.asignado_a).single();
                if (!aerr && auser) assigned = auser;
            }
        } catch (ae) {
            console.warn('Could not fetch assigned user for report:', ae.message || ae);
        }

        res.json(Object.assign({}, data, { reporter, asignado: assigned }));
    } catch (err) {
        console.error('Error obteniendo reporte:', err);
        res.status(500).json({ error: 'No se pudo obtener el reporte' });
    }
};

exports.listTechnicians = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('usuarios')
            .select('id, nombre, apellido, email')
            .eq('is_support', true);
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error('Error listando tecnicos:', err);
        res.status(500).json({ error: 'No se pudieron obtener los técnicos' });
    }
};
