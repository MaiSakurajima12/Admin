const supabase = require('../config/db');

exports.isSupport = async (req, res, next) => {
    const user = req.user || req.session?.user;
    if (!user) {
     
        if (req.accepts('application/json')) {
            return res.status(401).json({ error: 'No autorizado' });
        }
        return res.redirect('/login');
    }

    if (user.is_support || user.rol === 'soporte') return next();

   
    if (req.accepts('application/json')) {
        return res.status(403).json({ error: 'Acceso restringido' });
    }
    return res.redirect('/dashboard');
};

module.exports = { isSupport: exports.isSupport };
