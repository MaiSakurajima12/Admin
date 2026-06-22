const supabase = require('../config/db');

class ClassModel {
    static async create(classData) {
        const codigo = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const { data, error } = await supabase
            .from('clases')
            .insert([{
                nombre_clase: classData.nombre_clase,
                seccion: classData.seccion,
                materia: classData.materia,
                profesor_id: classData.profesor_id,
                codigo_acceso: codigo
            }])
            .select();
        return { data, error };
    }

    static async join(claseId, estudianteId) {
        const { data, error } = await supabase
            .from('inscripciones')
            .insert([{ clase_id: claseId, estudiante_id: estudianteId }])
            .select();
        return { data, error };
    }
}

module.exports = ClassModel;