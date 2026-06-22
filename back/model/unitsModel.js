const supabase = require('../config/db');

class UnitsModel {
    
    static async create(unitData) {
        const { data, error } = await supabase
            .from('unidades')
            .insert([{
                clase_id: unitData.clase_id,
                nombre: unitData.nombre,
                descripcion: unitData.descripcion,
                numero_unidad: unitData.numero_unidad,
                orden: unitData.orden
            }])
            .select();
        
        return { data, error };
    }

    static async getByClass(claseId) {
        const { data, error } = await supabase
            .from('unidades')
            .select('*')
            .eq('clase_id', claseId)
            .order('numero_unidad', { ascending: true });
        
        return { data, error };
    }

    static async getById(id) {
        const { data, error } = await supabase
            .from('unidades')
            .select('*')
            .eq('id', id)
            .single();
        
        return { data, error };
    }

    static async update(id, unitData) {
        const { data, error } = await supabase
            .from('unidades')
            .update({
                nombre: unitData.nombre,
                descripcion: unitData.descripcion,
                numero_unidad: unitData.numero_unidad,
                orden: unitData.orden
            })
            .eq('id', id)
            .select();
        
        return { data, error };
    }

    static async delete(id) {
        const { error } = await supabase
            .from('unidades')
            .delete()
            .eq('id', id);
        
        return { error };
    }
}

module.exports = UnitsModel;
