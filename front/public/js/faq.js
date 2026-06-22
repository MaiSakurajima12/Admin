async function loadSupportFaqs() {
    const faqList = document.getElementById('faqList');
    const faqSearch = document.getElementById('faqSearch');

    if (!faqList) return;
    faqList.innerHTML = '<div class="text-center py-3"><div class="spinner-border text-primary" role="status"></div></div>';

    try {
        const response = await fetch('/api/faqs', { credentials: 'include' });
        if (!response.ok) {
            throw new Error('No se pudieron cargar las preguntas frecuentes');
        }
        const faqs = await response.json();
        window.loadedFaqs = faqs || [];
        renderFaqList(window.loadedFaqs);
        if (faqSearch) faqSearch.value = '';
    } catch (err) {
        faqList.innerHTML = `<div class="alert alert-danger">${escapeHtml(err.message)}</div>`;
    }
}

function renderFaqList(faqs) {
    const faqList = document.getElementById('faqList');
    if (!faqList) return;

    if (!faqs || faqs.length === 0) {
        faqList.innerHTML = '<p class="text-muted">No hay preguntas frecuentes activas. Si no encuentras tu duda, envía un reporte.</p>';
        return;
    }

    faqList.innerHTML = faqs.map((faq, index) => `
        <div class="accordion-item">
            <h2 class="accordion-header" id="faqHeading${index}">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faqCollapse${index}" aria-expanded="false" aria-controls="faqCollapse${index}">
                    ${escapeHtml(faq.pregunta)}
                </button>
            </h2>
            <div id="faqCollapse${index}" class="accordion-collapse collapse" aria-labelledby="faqHeading${index}" data-bs-parent="#faqList" data-faq-id="${faq.id}">
                <div class="accordion-body">
                    <p>${escapeHtml(faq.respuesta)}</p>
                    <button type="button" class="btn btn-sm btn-outline-primary" onclick="markFaqResolved('${faq.id}')">Esto resolvió mi duda</button>
                </div>
            </div>
        </div>
    `).join('');

    attachFaqOpenHandlers();
}

function attachFaqOpenHandlers() {
    const faqList = document.getElementById('faqList');
    if (!faqList) return;

    const collapseItems = faqList.querySelectorAll('.accordion-collapse');
    collapseItems.forEach((collapse) => {
        const faqId = collapse.dataset.faqId;
        if (!faqId) return;

        collapse.addEventListener('shown.bs.collapse', () => {
            useFaq(faqId, 'expand');
        }, { once: true });
    });
}

function filterFaqs() {
    const query = document.getElementById('faqSearch')?.value.toLowerCase() || '';
    const faqs = window.loadedFaqs || [];
    const filtered = faqs.filter((faq) => {
        return faq.pregunta.toLowerCase().includes(query) || faq.respuesta.toLowerCase().includes(query) || (faq.categoria || '').toLowerCase().includes(query);
    });
    renderFaqList(filtered);
}

async function useFaq(id, tipo_uso = 'expand') {
    try {
        await fetch(`/api/faqs/${id}/usar`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo_uso })
        });
    } catch (err) {
        console.warn('No se pudo registrar uso FAQ:', err);
    }
}

function markFaqResolved(id) {
    useFaq(id, 'resuelto');
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
    const supportModal = document.getElementById('supportModal');
    if (supportModal) {
        supportModal.addEventListener('shown.bs.modal', () => {
            loadSupportFaqs();
        });
    }
});