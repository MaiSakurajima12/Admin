const supabase = require('../config/db');

exports.isAdmin = async (req, res, next) => {
    const user = req.user || req.session?.user;
    if (!user) {
        if (req.accepts('application/json')) {
            return res.status(401).json({ error: 'No autorizado' });
        }
        return res.redirect('/login');
    }

    if (user.is_admin) {
        return next();
    }

    if (req.accepts('application/json')) {
        return res.status(403).json({ error: 'Acceso restringido. Se requiere permiso de administrador.' });
    }
    return res.redirect('/dashboard');
};

module.exports = { isAdmin: exports.isAdmin };