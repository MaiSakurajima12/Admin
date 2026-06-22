const supabase = require('../config/db');

class UserModel {
    static async findByEmail(email) {
        const { data, error } = await supabase
            .from('usuarios')
            .select('*')
            .eq('email', email)
            .single();
        return { data, error };
    }

    static async create(userData) {
        const { data, error } = await supabase
            .from('usuarios')
            .insert([{
                nombre: userData.nombre,
                apellido: userData.apellido,
                email: userData.email,
                password: userData.password
            }])
            .select();
        return { data, error };
    }
}

module.exports = UserModel;