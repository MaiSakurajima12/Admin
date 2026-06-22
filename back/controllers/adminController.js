const AdminModel = require('../model/adminModel');

exports.renderDashboard = async (req, res) => {
    try {
        const user = req.user || req.session?.user || {};
        res.render('admin_dashboard', { user });
    } catch (err) {
        console.error('Error renderizando admin dashboard:', err);
        res.redirect('/dashboard');
    }
};

exports.getMetrics = async (req, res) => {
    try {
        const range = req.query.range || '30d';
        const data = await AdminModel.getDashboardData(range);
        res.json(data);
    } catch (err) {
        console.error('Error obteniendo métricas de admin:', err);
        res.status(500).json({ error: err?.message || 'No se pudieron obtener las métricas' });
    }
};