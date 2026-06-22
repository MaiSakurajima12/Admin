const supabase = require('../config/db');

class FaqModel {
    static async getPublicFaqs() {
        const { data, error } = await supabase
            .from('faqs')
            .select('*')
            .eq('activo', true)
            .order('orden', { ascending: true });
        return { data, error };
    }

    static async getAllFaqs() {
        const { data, error } = await supabase
            .from('faqs')
            .select('*')
            .order('contador_usos', { ascending: false });
        return { data, error };
    }

    static async create(faqData) {
        const { data, error } = await supabase
            .from('faqs')
            .insert([{
                pregunta: faqData.pregunta,
                respuesta: faqData.respuesta,
                categoria: faqData.categoria || null,
                orden: faqData.orden || 0,
                activo: faqData.activo !== undefined ? faqData.activo : true
            }])
            .select();
        return { data, error };
    }

    static async update(id, faqData) {
        const { data, error } = await supabase
            .from('faqs')
            .update({
                pregunta: faqData.pregunta,
                respuesta: faqData.respuesta,
                categoria: faqData.categoria || null,
                orden: faqData.orden || 0,
                activo: faqData.activo !== undefined ? faqData.activo : true
            })
            .eq('id', id)
            .select();
        return { data, error };
    }

    static async delete(id) {
        const { data, error } = await supabase
            .from('faqs')
            .update({ activo: false })
            .eq('id', id)
            .select();
        return { data, error };
    }

    static async incrementUsage(id) {
        const { data: faqData, error: fetchError } = await supabase
            .from('faqs')
            .select('contador_usos')
            .eq('id', id)
            .single();

        if (fetchError || !faqData) {
            return { data: null, error: fetchError || new Error('FAQ no encontrada') };
        }

        const { data, error } = await supabase
            .from('faqs')
            .update({ contador_usos: (faqData.contador_usos || 0) + 1 })
            .eq('id', id)
            .select();

        return { data, error };
    }

    static async recordUsage(faqId, usuarioId, tipoUso) {
        const { data, error } = await supabase
            .from('faq_usos')
            .insert([{
                faq_id: faqId,
                usuario_id: usuarioId || null,
                tipo_uso: tipoUso,
                fecha_creacion: new Date().toISOString()
            }])
            .select();
        return { data, error };
    }
}

module.exports = FaqModel;