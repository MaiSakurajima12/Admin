const supabase = require('../config/db');

exports.isTeacherOfClass = async (req, res, next) => {
    const { clase_id } = req.body; 
    const userId = req.user.id; 

    const { data, error } = await supabase
        .from('inscripciones')
        .select('rol_en_clase')
        .eq('clase_id', clase_id)
        .eq('estudiante_id', userId)
        .single();

    if (data && data.rol_en_clase === 'profesor') {
        next(); 
    } else {
        res.status(403).json({ error: "No tienes permiso de profesor en esta clase" });
    }
};