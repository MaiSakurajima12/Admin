const supabase = require('../config/db');

class RubricModel {
    static async create(rubricData) {
        const { data, error } = await supabase
            .from('rubricas')
            .insert([{
                criterio: rubricData.criterio,
                descripcion: rubricData.descripcion || '',
                puntos_maximos: rubricData.puntos_maximos,
                orden: rubricData.orden || 0,
                clase_id: rubricData.clase_id || null
            }])
            .select();
        return { data, error };
    }

    static async getAll() {
        const { data, error } = await supabase
            .from('rubricas')
            .select('*, rubrica_niveles(*)')
            .order('orden', { ascending: true });
        return { data, error };
    }

    static async getByClass(claseId) {
        const { data, error } = await supabase
            .from('rubricas')
            .select('*, rubrica_niveles(*)')
            .eq('clase_id', claseId)
            .order('orden', { ascending: true });
        return { data, error };
    }

    static async getByTaskId(tareaId) {
        const { data, error } = await supabase
            .from('tarea_rubricas')
            .select(`
                *,
                rubricas:rubrica_id (
                    id,
                    criterio,
                    descripcion,
                    puntos_maximos,
                    orden,
                    rubrica_niveles (*)
                )
            `)
            .eq('tarea_id', tareaId)
            .order('orden', { ascending: true });
        return { data, error };
    }

    static async getById(id) {
        const { data, error } = await supabase
            .from('rubricas')
            .select('*')
            .eq('id', id)
            .single();
        return { data, error };
    }

    static async getByIdWithLevels(id) {
        const { data, error } = await supabase
            .from('rubricas')
            .select('*, rubrica_niveles(*)')
            .eq('id', id)
            .single();
        return { data, error };
    }

    static async getTaskByRubricId(rubricaId) {
        const { data, error } = await supabase
            .from('tarea_rubricas')
            .select('tarea_id')
            .eq('rubrica_id', rubricaId)
            .maybeSingle();
        return { data, error };
    }

    static async getLevelById(id) {
        const { data, error } = await supabase
            .from('rubrica_niveles')
            .select('*')
            .eq('id', id)
            .single();
        return { data, error };
    }

    static async update(id, rubricData) {
        const { data, error } = await supabase
            .from('rubricas')
            .update({
                criterio: rubricData.criterio,
                descripcion: rubricData.descripcion,
                puntos_maximos: rubricData.puntos_maximos,
                orden: rubricData.orden
            })
            .eq('id', id)
            .select();
        return { data, error };
    }

    static async delete(id) {
        const { error: levelsError } = await supabase
            .from('rubrica_niveles')
            .delete()
            .eq('rubrica_id', id);

        if (levelsError) return { error: levelsError };

        const { error: taskLinksError } = await supabase
            .from('tarea_rubricas')
            .delete()
            .eq('rubrica_id', id);

        if (taskLinksError) return { error: taskLinksError };

        const { error } = await supabase
            .from('rubricas')
            .delete()
            .eq('id', id);
        return { error };
    }

    static async createLevel(levelData) {
        const { data, error } = await supabase
            .from('rubrica_niveles')
            .insert([{
                rubrica_id: levelData.rubrica_id,
                puntos: levelData.puntos,
                titulo: levelData.titulo,
                descripcion: levelData.descripcion || '',
                orden: levelData.orden || 0
            }])
            .select();
        return { data, error };
    }

    static async getLevelsByRubric(rubricaId) {
        const { data, error } = await supabase
            .from('rubrica_niveles')
            .select('*')
            .eq('rubrica_id', rubricaId)
            .order('orden', { ascending: true });
        return { data, error };
    }

    static async updateLevel(id, levelData) {
        const { data, error } = await supabase
            .from('rubrica_niveles')
            .update({
                puntos: levelData.puntos,
                titulo: levelData.titulo,
                descripcion: levelData.descripcion,
                orden: levelData.orden
            })
            .eq('id', id)
            .select();
        return { data, error };
    }

    static async deleteLevel(id) {
        const { error } = await supabase
            .from('rubrica_niveles')
            .delete()
            .eq('id', id);
        return { error };
    }

    static async assignRubricToTask(tareaId, rubricaId, orden = 0) {
        const { data, error } = await supabase
            .from('tarea_rubricas')
            .insert([{
                tarea_id: tareaId,
                rubrica_id: rubricaId,
                orden: orden
            }])
            .select();
        return { data, error };
    }

    static async removeRubricFromTask(tareaId, rubricaId) {
        const { error } = await supabase
            .from('tarea_rubricas')
            .delete()
            .eq('tarea_id', tareaId)
            .eq('rubrica_id', rubricaId);
        return { error };
    }

    static async updateTaskRubricOrder(tareaId, rubricaId, orden) {
        const { data, error } = await supabase
            .from('tarea_rubricas')
            .update({ orden })
            .eq('tarea_id', tareaId)
            .eq('rubrica_id', rubricaId)
            .select();
        return { data, error };
    }

    static async gradeRubric(entregaId, rubricaId, puntosObtenidos) {
        const { data, error } = await supabase
            .from('calificaciones_rubrica')
            .upsert({
                entrega_id: entregaId,
                rubrica_id: rubricaId,
                puntos_obtenidos: puntosObtenidos
            }, { onConflict: 'entrega_id,rubrica_id' })
            .select();

        return { data: data?.[0], error };
    }

    static async setRubricDetail(calificacionRubricaId, rubricaNivelId, puntosObtenidos) {
        const { data: existingData, error: existingError } = await supabase
            .from('calificaciones_rubrica_detalle')
            .select('*')
            .eq('calificacion_rubrica_id', calificacionRubricaId)
            .limit(1);

        if (existingError) return { error: existingError };

        if (Array.isArray(existingData) && existingData.length > 0) {
            const { data, error } = await supabase
                .from('calificaciones_rubrica_detalle')
                .update({
                    rubrica_nivel_id: rubricaNivelId,
                    puntos_obtenidos: puntosObtenidos
                })
                .eq('calificacion_rubrica_id', calificacionRubricaId)
                .select();
            return { data: data?.[0], error };
        }

        const { data, error } = await supabase
            .from('calificaciones_rubrica_detalle')
            .insert([{
                calificacion_rubrica_id: calificacionRubricaId,
                rubrica_nivel_id: rubricaNivelId,
                puntos_obtenidos: puntosObtenidos
            }])
            .select();
        return { data: data?.[0], error };
    }

    static async getSubmissionGrades(entregaId) {
        const { data, error } = await supabase
            .from('calificaciones_rubrica')
            .select(`
                *,
                rubricas (
                    id,
                    criterio,
                    descripcion,
                    puntos_maximos,
                    orden
                ),
                calificaciones_rubrica_detalle (
                    id,
                    rubrica_nivel_id,
                    puntos_obtenidos,
                    rubrica_niveles (*)
                )
            `)
            .eq('entrega_id', entregaId)
            .order('rubrica_id', { ascending: true });
        return { data, error };
    }

    static async deleteSubmissionGrades(entregaId) {
        const { data: grades, error: gradesError } = await supabase
            .from('calificaciones_rubrica')
            .select('id')
            .eq('entrega_id', entregaId);

        if (gradesError) return { error: gradesError };

        const gradeIds = (grades || []).map(item => item.id);
        if (gradeIds.length > 0) {
            const { error: detailsError } = await supabase
                .from('calificaciones_rubrica_detalle')
                .delete()
                .in('calificacion_rubrica_id', gradeIds);

            if (detailsError) return { error: detailsError };
        }

        const { error } = await supabase
            .from('calificaciones_rubrica')
            .delete()
            .eq('entrega_id', entregaId);
        return { error };
    }
}

module.exports = RubricModel;
