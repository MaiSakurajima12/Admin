let trendChart = null;
let supportStateChart = null;
let adminFaqs = [];
let faqUsageList = [];

async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Ocurrió un error al obtener datos');
    }
    return data;
}

function formatNumber(value) {
    return Number(value || 0).toLocaleString('es-ES');
}

function populateText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

async function loadAdminMetrics(range = '30d') {
    document.getElementById('adminLoading').classList.remove('d-none');
    document.getElementById('adminContent').classList.add('d-none');

    try {
        const data = await fetchJson(`/api/admin/metrics?range=${encodeURIComponent(range)}`);
        renderMetrics(data);
        await loadAdminFaqs();
    } catch (err) {
        console.error(err);
        await showError('Error', err.message);
    } finally {
        document.getElementById('adminLoading').classList.add('d-none');
        document.getElementById('adminContent').classList.remove('d-none');
    }
}

function renderMetrics(data) {
    const { userMetrics, academicMetrics, rubricMetrics, supportMetrics, trends, faqUsageSummary, faqTicketCorrelation } = data;

    populateText('totalUsers', formatNumber(userMetrics.totalRegistered));
    populateText('activeUsers', formatNumber(userMetrics.activeUsersLast30Days));
    populateText('profesoresCount', formatNumber(userMetrics.distributionByRole.profesores));
    populateText('estudiantesCount', formatNumber(userMetrics.distributionByRole.estudiantes));
    populateText('soporteCount', formatNumber(userMetrics.distributionByRole.tecnicos));
    populateText('adminCount', formatNumber(userMetrics.distributionByRole.administradores));

    populateText('activeClasses', formatNumber(academicMetrics.activeClasses));
    populateText('rubricsCreated', formatNumber(rubricMetrics.rubricsCreated));
    populateText('totalReports', formatNumber(supportMetrics.totalReports));
    populateText('submissionsTotal', formatNumber(academicMetrics.submissions.total));
    populateText('submissionsGraded', formatNumber(academicMetrics.submissions.calificado));
    populateText('submissionsPending', formatNumber(academicMetrics.submissions.pendientes));
    populateText('averageGrade', academicMetrics.averageGrade !== null ? Number(academicMetrics.averageGrade).toFixed(2) : '0.00');

    faqUsageList = faqUsageSummary.faqs || [];
    renderFaqUsageTable(faqUsageList);
    populateText('faqTotalInteractions', formatNumber(faqUsageSummary.totalInteractions));
    populateText('faqTicketsBefore', formatNumber(faqTicketCorrelation.ticketsBeforeFaq));
    populateText('faqTicketsAfter', formatNumber(faqTicketCorrelation.ticketsAfterFaq));

    renderTrendChart(trends);
    renderSupportStateChart(supportMetrics.byState, supportMetrics.byType);
}

function renderFaqUsageTable(items) {
    const tbody = document.getElementById('faqUsageTableBody');
    if (!tbody) return;

    if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No hay FAQs registradas.</td></tr>';
        return;
    }

    tbody.innerHTML = items.map((faq) => `
        <tr>
            <td>${escapeHtml(faq.pregunta || '')}</td>
            <td>${escapeHtml(faq.categoria || 'General')}</td>
            <td>${formatNumber(faq.contador_usos)}</td>
            <td>${faq.activo ? 'Sí' : 'No'}</td>
        </tr>
    `).join('');
}

function renderTrendChart(trends) {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;

    const data = {
        labels: trends.labels,
        datasets: [
            {
                label: 'Registros',
                data: trends.registrations,
                borderColor: '#4c63ff',
                backgroundColor: 'rgba(76,99,255,0.12)',
                tension: 0.3,
                fill: true
            },
            {
                label: 'Entregas',
                data: trends.deliveries,
                borderColor: '#198754',
                backgroundColor: 'rgba(25,135,84,0.12)',
                tension: 0.3,
                fill: true
            },
            {
                label: 'Tickets',
                data: trends.tickets,
                borderColor: '#fd7e14',
                backgroundColor: 'rgba(253,126,20,0.12)',
                tension: 0.3,
                fill: true
            }
        ]
    };

    if (trendChart) {
        trendChart.data = data;
        trendChart.update();
    } else {
        trendChart = new Chart(ctx, {
            type: 'line',
            data,
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' }
                },
                scales: {
                    x: { display: true },
                    y: { display: true, beginAtZero: true }
                }
            }
        });
    }
}

function renderSupportStateChart(stateData = {}, typeData = {}) {
    const ctx = document.getElementById('supportStateChart');
    if (!ctx) return;

    const labels = ['abierto', 'en_progreso', 'pendiente', 'cerrado'];
    const values = labels.map((key) => Number(stateData[key] || 0));

    const data = {
        labels,
        datasets: [{
            data: values,
            backgroundColor: ['#0d6efd', '#ffc107', '#198754', '#6f42c1'],
            borderColor: '#fff',
            borderWidth: 1
        }]
    };

    const overlay = document.getElementById('supportStateChartOverlay');
    const hasData = values.some((value) => value > 0);
    if (overlay) {
        overlay.classList.toggle('d-none', hasData);
    }

    if (supportStateChart) {
        supportStateChart.destroy();
        supportStateChart = null;
    }

    supportStateChart = new Chart(ctx, {
        type: 'doughnut',
        data,
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

async function loadAdminFaqs() {
    try {
        const data = await fetchJson('/api/faqs/admin');
        adminFaqs = data || [];
        renderAdminFaqsTable(adminFaqs);
    } catch (err) {
        console.error('Error cargando FAQs de administrador:', err);
        document.getElementById('adminFaqsTableBody').innerHTML = '<tr><td colspan="6" class="text-center text-danger py-4">No se pudieron cargar las FAQs de admin.</td></tr>';
    }
}

function renderAdminFaqsTable(items) {
    const tbody = document.getElementById('adminFaqsTableBody');
    if (!tbody) return;

    if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">No hay FAQs creadas aún.</td></tr>';
        return;
    }

    tbody.innerHTML = items.map((faq) => `
        <tr>
            <td>${escapeHtml(faq.pregunta || '')}</td>
            <td>${escapeHtml(faq.categoria || 'General')}</td>
            <td>${faq.activo ? 'Sí' : 'No'}</td>
            <td>${formatNumber(faq.contador_usos)}</td>
            <td class="text-end">
                <button class="btn btn-sm btn-outline-primary me-2" onclick="openFaqModal('${faq.id}')"><i class="fa-solid fa-pen-to-square"></i></button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteFaq('${faq.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function openFaqModal(id = null) {
    const modal = new bootstrap.Modal(document.getElementById('faqFormModal'));
    const formTitle = document.getElementById('faqFormTitle');
    const faqId = document.getElementById('faqId');
    const questionInput = document.getElementById('faqQuestion');
    const answerInput = document.getElementById('faqAnswer');
    const categoryInput = document.getElementById('faqCategory');
    const activeInput = document.getElementById('faqActive');
    const errorBox = document.getElementById('faqFormError');

    errorBox.classList.add('d-none');
    errorBox.textContent = '';

    if (id) {
        const faq = adminFaqs.find((item) => item.id === id);
        if (!faq) return;
        formTitle.textContent = 'Editar FAQ';
        faqId.value = id;
        questionInput.value = faq.pregunta || '';
        answerInput.value = faq.respuesta || '';
        categoryInput.value = faq.categoria || '';
        activeInput.checked = faq.activo;
    } else {
        formTitle.textContent = 'Crear FAQ';
        faqId.value = '';
        questionInput.value = '';
        answerInput.value = '';
        categoryInput.value = '';
        activeInput.checked = true;
    }

    modal.show();
}

async function submitFaqForm(btn) {
    const faqId = document.getElementById('faqId').value;
    const question = document.getElementById('faqQuestion').value.trim();
    const answer = document.getElementById('faqAnswer').value.trim();
    const category = document.getElementById('faqCategory').value.trim();
    const active = document.getElementById('faqActive').checked;
    const errorBox = document.getElementById('faqFormError');

    if (!question || !answer) {
        errorBox.textContent = 'La pregunta y la respuesta son obligatorias.';
        errorBox.classList.remove('d-none');
        return;
    }

    setButtonLoading(btn, true, faqId ? 'Guardando...' : 'Creando...');
    errorBox.classList.add('d-none');

    try {
        const payload = { pregunta: question, respuesta: answer, categoria: category, activo };
        const url = faqId ? `/api/faqs/admin/${faqId}` : '/api/faqs/admin';
        const method = faqId ? 'PUT' : 'POST';
        await fetchJson(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        await showSuccess('FAQ guardada', 'La pregunta frecuente se guardó correctamente.');
        bootstrap.Modal.getInstance(document.getElementById('faqFormModal')).hide();
        await loadAdminFaqs();
        const data = await fetchJson(`/api/admin/metrics?range=${encodeURIComponent(document.getElementById('rangeSelect').value)}`);
        renderMetrics(data);
    } catch (err) {
        errorBox.textContent = err.message;
        errorBox.classList.remove('d-none');
    } finally {
        setButtonLoading(btn, false);
    }
}

async function deleteFaq(id) {
    const result = await showConfirm('Eliminar FAQ', '¿Deseas desactivar esta pregunta frecuente?', 'Sí, desactivar', 'Cancelar');
    if (!result.isConfirmed) return;

    try {
        await fetchJson(`/api/faqs/admin/${id}`, { method: 'DELETE' });
        await showSuccess('FAQ desactivada', 'La pregunta frecuente fue desactivada.');
        await loadAdminFaqs();
    } catch (err) {
        console.error(err);
        await showError('Error', err.message);
    }
}

function exportFaqCsv() {
    const headers = ['Pregunta', 'Respuesta', 'Categoría', 'Activo', 'Usos'];
    const rows = faqUsageList.map((faq) => [
        faq.pregunta || '',
        faq.respuesta || '',
        faq.categoria || '',
        faq.activo ? 'Sí' : 'No',
        faq.contador_usos || 0
    ]);

    const csvContent = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `faq_uso_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

document.addEventListener('DOMContentLoaded', () => {
    const rangeSelect = document.getElementById('rangeSelect');
    if (rangeSelect) {
        rangeSelect.addEventListener('change', () => loadAdminMetrics(rangeSelect.value));
    }

    const exportBtn = document.getElementById('exportFaqCsv');
    if (exportBtn) exportBtn.addEventListener('click', exportFaqCsv);

    loadAdminMetrics(rangeSelect ? rangeSelect.value : '30d');
});