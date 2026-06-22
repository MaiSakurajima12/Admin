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
        // If a specific faqId is provided, compute the correlation for that FAQ and override
        const faqId = req.query.faqId;
        if (faqId) {
            try {
                const specific = await AdminModel.getFaqTicketCorrelation(range, faqId);
                data.faqTicketCorrelation = specific;
            } catch (e) {
                console.warn('Could not compute faqTicketCorrelation for faqId', faqId, e.message || e);
            }
        }
        res.json(data);
    } catch (err) {
        console.error('Error obteniendo métricas de admin:', err);
        res.status(500).json({ error: err?.message || 'No se pudieron obtener las métricas' });
    }
};