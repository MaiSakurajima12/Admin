const supabase = require('../config/db');

class AssignmentModel {

static async create(assignmentData) {
        const { data, error } = await supabase
            .from('tareas')
            .insert([
                {
                    clase_id: assignmentData.clase_id,
                    titulo: assignmentData.titulo,
                    descripcion: assignmentData.descripcion, 
                    puntos_maximos: assignmentData.puntos_maximos,
                    fecha_entrega: assignmentData.fecha_entrega,
                    creador_id: assignmentData.creador_id, 
                    archivo_guia_url: assignmentData.archivo_guia_url,
                    unidad_id: assignmentData.unidad_id || null,
                    fecha_creacion: new Date()
                }
            ])
            .select();
        
        return { data, error };
    }

    static async getByClass(claseId) {
        const { data, error } = await supabase
            .from('tareas')
            .select(`
                *,
                usuarios:creador_id (nombre, apellido, avatar_url)
            `)
            .eq('clase_id', claseId);
        return { data, error };
    }


    static async getById(id) {
        const { data, error } = await supabase
            .from('tareas')
            .select('*')
            .eq('id', id)
            .single();
        
        return { data, error };
    }

    static async update(id, updateData) {
        const { data, error } = await supabase
            .from('tareas')
            .update({
                unidad_id: updateData.unidad_id
            })
            .eq('id', id)
            .select();
        
        return { data, error };
    }

    static async delete(id) {
        const { error } = await supabase
            .from('tareas')
            .delete()
            .eq('id', id);
        
        return { error };
    }
}

module.exports = AssignmentModel;