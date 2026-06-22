const supabase = require('../config/db');

const parseRange = (range = '30d') => {
    const now = new Date();
    let start = new Date(now);
    let granularity = 'day';

    if (range === '7d') {
        start.setDate(now.getDate() - 7);
        granularity = 'day';
    } else if (range === '30d') {
        start.setDate(now.getDate() - 30);
        granularity = 'day';
    } else if (range === '90d') {
        start.setDate(now.getDate() - 90);
        granularity = 'week';
    } else {
        start.setDate(now.getDate() - 30);
    }

    return { start, end: now, granularity };
};

const buildBuckets = (start, end, granularity) => {
    const buckets = [];
    const current = new Date(start);

    if (granularity === 'week') {
        current.setHours(0, 0, 0, 0);
    }

    while (current <= end) {
        const key = current.toISOString().slice(0, 10);
        let label;
        if (granularity === 'day') {
            label = key;
            current.setDate(current.getDate() + 1);
        } else if (granularity === 'week') {
            const weekEnd = new Date(current);
            weekEnd.setDate(weekEnd.getDate() + 6);
            label = `${key}`;
            current.setDate(current.getDate() + 7);
        } else {
            label = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
            current.setMonth(current.getMonth() + 1);
        }
        buckets.push({ key: label, label, count: 0 });
    }

    return buckets;
};

const bucketDate = (date, granularity) => {
    const d = new Date(date);
    if (granularity === 'week') {
        const monday = new Date(d);
        const day = monday.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        monday.setDate(monday.getDate() + diff);
        return monday.toISOString().slice(0, 10);
    }
    if (granularity === 'month') {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    return d.toISOString().slice(0, 10);
};

const findTopItems = (items, key, limit = 5) => {
    return items
        .sort((a, b) => (b.count || 0) - (a.count || 0))
        .slice(0, limit);
};

class AdminModel {
    static async getUserMetrics() {
        const roles = ['profesor', 'estudiante', 'admin'];
        const now = new Date();
        const last7 = new Date(now);
        last7.setDate(last7.getDate() - 7);
        const last30 = new Date(now);
        last30.setDate(last30.getDate() - 30);
        const active30 = new Date(now);
        active30.setDate(active30.getDate() - 30);

        const [totalUsersResp, newWeekResp, newMonthResp, activeUsersResp, adminCountResp, supportCountResp, enrollmentResp] = await Promise.all([
            supabase.from('usuarios').select('id', { count: 'exact', head: true }),
            supabase.from('usuarios').select('id', { count: 'exact', head: true }).gte('fecha_registro', last7.toISOString()),
            supabase.from('usuarios').select('id', { count: 'exact', head: true }).gte('fecha_registro', last30.toISOString()),
            supabase.from('usuarios').select('id', { count: 'exact', head: true }).gte('ultimo_login', active30.toISOString()),
            supabase.from('usuarios').select('id', { count: 'exact', head: true }).eq('is_admin', true),
            supabase.from('usuarios').select('id', { count: 'exact', head: true }).eq('is_support', true),
            supabase.from('inscripciones').select('estudiante_id, rol_en_clase')
        ]);

        const professorIds = new Set();
        const studentIds = new Set();
        (enrollmentResp.data || []).forEach((enrollment) => {
            if (enrollment.rol_en_clase === 'profesor') {
                professorIds.add(enrollment.estudiante_id);
            } else if (enrollment.rol_en_clase === 'estudiante') {
                studentIds.add(enrollment.estudiante_id);
            }
        });

        return {
            totalRegistered: totalUsersResp.count || 0,
            newUsersLastWeek: newWeekResp.count || 0,
            newUsersLastMonth: newMonthResp.count || 0,
            activeUsersLast30Days: activeUsersResp.count || 0,
            distributionByRole: {
                profesores: professorIds.size,
                estudiantes: studentIds.size,
                tecnicos: supportCountResp.count || 0,
                administradores: adminCountResp.count || 0
            }
        };
    }

    static async getAcademicMetrics() {
        const [{ count: classCount }, { count: unitCount }, { count: taskCount }, totalSubmissionsResp, gradedResp, deliveredResp, pendingResp, avgGradeResp] = await Promise.all([
            supabase.from('clases').select('id', { count: 'exact', head: true }),
            supabase.from('unidades').select('id', { count: 'exact', head: true }),
            supabase.from('tareas').select('id', { count: 'exact', head: true }),
            supabase.from('entregas').select('id', { count: 'exact', head: true }),
            supabase.from('entregas').select('id', { count: 'exact', head: true }).eq('estado', 'calificado'),
            supabase.from('entregas').select('id', { count: 'exact', head: true }).eq('estado', 'entregado'),
            supabase.from('entregas').select('id', { count: 'exact', head: true }).eq('estado', 'no_entregado'),
            supabase.from('entregas').select('avg(calificacion)')
        ]);

        const tareasData = await supabase.from('tareas').select('id, titulo');
        const entregasData = await supabase.from('entregas').select('tarea_id, estado');

        const taskMap = new Map((tareasData.data || []).map((t) => [t.id, { titulo: t.titulo, id: t.id, total: 0, noEntregadas: 0 }]));
        (entregasData.data || []).forEach((entrega) => {
            const task = taskMap.get(entrega.tarea_id);
            if (task) {
                task.total += 1;
                if (entrega.estado === 'no_entregado') {
                    task.noEntregadas += 1;
                }
            }
        });

        const tasksWithFailure = Array.from(taskMap.values()).map((task) => ({
            id: task.id,
            titulo: task.titulo,
            totalEntregas: task.total,
            incumplimiento: task.total > 0 ? Number(((task.noEntregadas / task.total) * 100).toFixed(1)) : 0
        })).sort((a, b) => b.incumplimiento - a.incumplimiento).slice(0, 5);

        return {
            activeClasses: classCount || 0,
            unitsCreated: unitCount || 0,
            tasksPublished: taskCount || 0,
            submissions: {
                total: totalSubmissionsResp.count || 0,
                calificado: gradedResp.count || 0,
                entregado: deliveredResp.count || 0,
                pendientes: pendingResp.count || 0,
                percentGraded: totalSubmissionsResp.count > 0 ? Number(((gradedResp.count / totalSubmissionsResp.count) * 100).toFixed(1)) : 0
            },
            averageGrade: avgGradeResp.data?.[0]?.avg ?? null,
            topTasksByNoSubmission: tasksWithFailure
        };
    }

    static async getRubricMetrics() {
        const [{ count: totalRubrics }, taskRubricsResp] = await Promise.all([
            supabase.from('rubricas').select('id', { count: 'exact', head: true }),
            supabase.from('tarea_rubricas').select('rubrica_id')
        ]);

        const usageMap = new Map();
        (taskRubricsResp.data || []).forEach((item) => {
            const current = usageMap.get(item.rubrica_id) || 0;
            usageMap.set(item.rubrica_id, current + 1);
        });

        const rubricIds = Array.from(usageMap.keys());
        let topCriteria = [];
        if (rubricIds.length > 0) {
            const { data: rubrics } = await supabase.from('rubricas').select('id, criterio').in('id', rubricIds);
            topCriteria = (rubrics || []).map((rub) => ({
                id: rub.id,
                criterio: rub.criterio,
                usos: usageMap.get(rub.id) || 0
            })).sort((a, b) => b.usos - a.usos).slice(0, 5);
        }

        return {
            rubricsCreated: totalRubrics || 0,
            topCriteria
        };
    }

    static async getSupportMetrics() {
        const reportsResp = await supabase
            .from('reportes_soporte')
            .select('id, estado, tipo_problema, fecha_creacion, usuario_id');

        if (reportsResp.error) {
            console.error('Error fetching support reports for metrics:', reportsResp.error);
            throw reportsResp.error;
        }

        const rows = reportsResp.data || [];
        const totals = {
            totalReports: rows.length,
            byState: {},
            byType: {},
            avgResolutionHours: null,
            technicians: []
        };

        rows.forEach((row) => {
            if (row.estado) {
                totals.byState[row.estado] = (totals.byState[row.estado] || 0) + 1;
            }
            if (row.tipo_problema) {
                totals.byType[row.tipo_problema] = (totals.byType[row.tipo_problema] || 0) + 1;
            }
        });

        return totals;
    }

    static async getTrends(range = '30d') {
        const { start, end, granularity } = parseRange(range);

        const [userRows, deliveryRows, ticketRows] = await Promise.all([
            supabase.from('usuarios').select('fecha_registro').gte('fecha_registro', start.toISOString()),
            supabase.from('entregas').select('fecha_envio').gte('fecha_envio', start.toISOString()),
            supabase.from('reportes_soporte').select('fecha_creacion').gte('fecha_creacion', start.toISOString())
        ]);

        const bucketLabels = buildBuckets(start, end, granularity);
        const labelMap = new Map(bucketLabels.map((bucket) => [bucket.key, { ...bucket }]));

        const addSeriesItem = (rows, field, labelPrefix) => {
            (rows.data || []).forEach((row) => {
                const bucketKey = bucketDate(row[field], granularity);
                const bucket = labelMap.get(bucketKey);
                if (bucket) {
                    bucket.count += 1;
                }
            });
        };

        const usersBucketMap = new Map(bucketLabels.map((bucket) => [bucket.key, { label: bucket.label, count: 0 }]));
        const deliveriesBucketMap = new Map(bucketLabels.map((bucket) => [bucket.key, { label: bucket.label, count: 0 }]));
        const ticketsBucketMap = new Map(bucketLabels.map((bucket) => [bucket.key, { label: bucket.label, count: 0 }]));

        (userRows.data || []).forEach((user) => {
            const key = bucketDate(user.fecha_registro, granularity);
            if (usersBucketMap.has(key)) {
                usersBucketMap.get(key).count += 1;
            }
        });
        (deliveryRows.data || []).forEach((delivery) => {
            const key = bucketDate(delivery.fecha_envio, granularity);
            if (deliveriesBucketMap.has(key)) {
                deliveriesBucketMap.get(key).count += 1;
            }
        });
        (ticketRows.data || []).forEach((ticket) => {
            const key = bucketDate(ticket.fecha_creacion, granularity);
            if (ticketsBucketMap.has(key)) {
                ticketsBucketMap.get(key).count += 1;
            }
        });

        return {
            labels: bucketLabels.map((bucket) => bucket.label),
            registrations: Array.from(usersBucketMap.values()).map((b) => b.count),
            deliveries: Array.from(deliveriesBucketMap.values()).map((b) => b.count),
            tickets: Array.from(ticketsBucketMap.values()).map((b) => b.count),
            granularity
        };
    }

    static async getFaqUsageSummary(range = '30d') {
        const { start } = parseRange(range);
        const [faqsResp, faqUsesResp] = await Promise.all([
            supabase.from('faqs').select('*').order('contador_usos', { ascending: false }),
            supabase.from('faq_usos').select('id, faq_id, usuario_id, tipo_uso, fecha_creacion').gte('fecha_creacion', start.toISOString())
        ]);

        return {
            faqs: faqsResp.data || [],
            totalInteractions: (faqUsesResp.data || []).length,
            interactions: faqUsesResp.data || []
        };
    }

    static async getFaqTicketCorrelation(range = '30d', faqId = null) {
        // Option 1: count ALL tickets before/after the FAQ creation date (global by date)
        // We take the most recently created FAQ and compare report timestamps to it.
        try {
            let faqDate = null;
            if (faqId) {
                const faqResp = await supabase.from('faqs').select('id, fecha_creacion').eq('id', faqId).limit(1).single();
                if (faqResp.error || !faqResp.data) {
                    return { ticketsBeforeFaq: 0, ticketsAfterFaq: 0, faqCreationDate: null };
                }
                faqDate = faqResp.data.fecha_creacion;
            } else {
                const faqResp = await supabase.from('faqs').select('id, fecha_creacion').order('fecha_creacion', { ascending: false }).limit(1);
                if (faqResp.error || !faqResp.data || faqResp.data.length === 0) {
                    return { ticketsBeforeFaq: 0, ticketsAfterFaq: 0, faqCreationDate: null };
                }
                faqDate = faqResp.data[0].fecha_creacion;
            }

            const beforeResp = await supabase.from('reportes_soporte').select('id', { count: 'exact', head: true }).lt('fecha_creacion', faqDate);
            const afterResp = await supabase.from('reportes_soporte').select('id', { count: 'exact', head: true }).gte('fecha_creacion', faqDate);

            const beforeCount = beforeResp.error ? 0 : (beforeResp.count || 0);
            const afterCount = afterResp.error ? 0 : (afterResp.count || 0);

            return {
                ticketsBeforeFaq: beforeCount,
                ticketsAfterFaq: afterCount,
                faqCreationDate: faqDate
            };
        } catch (err) {
            console.error('Error computing FAQ ticket correlation (global):', err);
            return { ticketsBeforeFaq: 0, ticketsAfterFaq: 0, faqCreationDate: null };
        }
    }

    static async getDashboardData(range = '30d') {
        const [userMetrics, academicMetrics, rubricMetrics, supportMetrics, trends, faqUsageSummary, faqTicketCorrelation] = await Promise.all([
            AdminModel.getUserMetrics(),
            AdminModel.getAcademicMetrics(),
            AdminModel.getRubricMetrics(),
            AdminModel.getSupportMetrics(),
            AdminModel.getTrends(range),
            AdminModel.getFaqUsageSummary(range),
            AdminModel.getFaqTicketCorrelation(range)
        ]);

        return {
            userMetrics,
            academicMetrics,
            rubricMetrics,
            supportMetrics,
            trends,
            faqUsageSummary,
            faqTicketCorrelation,
            reportRange: range
        };
    }
}

module.exports = AdminModel;