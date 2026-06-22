const supabase = require('../config/db');

class SupportModel {
    static async create(reportData) {
        const { data, error } = await supabase
            .from('reportes_soporte')
            .insert([{
                usuario_id: reportData.usuario_id,
                tipo_problema: reportData.tipo_problema,
                descripcion: reportData.descripcion,
                url_evidencia: reportData.url_evidencia,
                estado: 'abierto'
            }])
            .select();
        return { data, error };
    }

    static async getByUser(userId) {
        try {
            const { data, error } = await supabase
                .from('reportes_soporte')
                .select('*')
                .eq('usuario_id', userId)
                .order('fecha_creacion', { ascending: false });
            return { data, error };
        } catch (err) {
            return { data: null, error: err };
        }
    }

    static async getAll() {
        try {
            const { data, error } = await supabase
                .from('reportes_soporte')
                .select('*')
                .order('fecha_creacion', { ascending: false });
            return { data, error };
        } catch (err) {
            return { data: null, error: err };
        }
    }

    static async updateStatus(reportId, patch) {
        try {
            const { data, error } = await supabase
                .from('reportes_soporte')
                .update(patch)
                .eq('id', reportId)
                .select()
                .single();
            return { data, error };
        } catch (err) {
            return { data: null, error: err };
        }
    }

    static async getById(reportId) {
        try {
            const { data, error } = await supabase
                .from('reportes_soporte')
                .select('*')
                .eq('id', reportId)
                .single();
            return { data, error };
        } catch (err) {
            return { data: null, error: err };
        }
    }
}

module.exports = SupportModel;
