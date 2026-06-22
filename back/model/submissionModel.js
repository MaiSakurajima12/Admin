const supabase = require('../config/db');

class SubmissionModel {
    static async submit(submissionData) {
        const insertObj = {
            tarea_id: submissionData.tarea_id,
            estudiante_id: submissionData.estudiante_id,
            archivo_entrega_url: submissionData.archivo_entrega_url,
            comentario_alumno: submissionData.comentario_alumno,
            fecha_envio: new Date()
        };

        const { data, error } = await supabase
            .from('entregas')
            .insert([insertObj])
            .select();
        return { data, error };
    }

    static async grade(entregaId, nota, comentario) {
        const { data, error } = await supabase
            .from('entregas')
            .update({ 
                calificacion: nota, 
                comentario_profesor: comentario, 
                estado: 'calificado' 
            })
            .eq('id', entregaId)
            .select();
        return { data, error };
    }
}

module.exports = SubmissionModel;