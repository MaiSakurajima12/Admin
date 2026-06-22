const FaqModel = require('../model/faqModel');

exports.listPublicFaqs = async (req, res) => {
    try {
        const { data, error } = await FaqModel.getPublicFaqs();
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error('Error listando FAQs públicas:', err);
        res.status(500).json({ error: 'No se pudieron obtener las preguntas frecuentes' });
    }
};

exports.registerFaqUsage = async (req, res) => {
    try {
        const faqId = req.params.id;
        const usuario = req.user || req.session?.user;
        if (!usuario) {
            return res.status(401).json({ error: 'No autorizado' });
        }

        const tipoUso = req.body.tipo_uso || 'expand';
        const { data: updateData, error: updateError } = await FaqModel.incrementUsage(faqId);
        if (updateError) throw updateError;

        const { data: recordData, error: recordError } = await FaqModel.recordUsage(faqId, usuario.id, tipoUso);
        if (recordError) throw recordError;

        res.json({ message: 'Uso registrado', faq: updateData?.[0] || null, registro: recordData?.[0] || null });
    } catch (err) {
        console.error('Error registrando uso de FAQ:', err);
        res.status(500).json({ error: 'No se pudo registrar el uso de la pregunta frecuente' });
    }
};

exports.listAdminFaqs = async (req, res) => {
    try {
        const { data, error } = await FaqModel.getAllFaqs();
        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error('Error listando FAQs de admin:', err);
        res.status(500).json({ error: 'No se pudieron obtener las FAQs del administrador' });
    }
};

exports.createFaq = async (req, res) => {
    try {
        const { pregunta, respuesta, categoria, orden, activo } = req.body;
        if (!pregunta || !respuesta) {
            return res.status(400).json({ error: 'Pregunta y respuesta son obligatorios' });
        }
        const { data, error } = await FaqModel.create({ pregunta, respuesta, categoria, orden, activo });
        if (error) throw error;
        res.status(201).json({ message: 'FAQ creada', faq: data?.[0] || null });
    } catch (err) {
        console.error('Error creando FAQ:', err);
        res.status(500).json({ error: 'No se pudo crear la FAQ' });
    }
};

exports.updateFaq = async (req, res) => {
    try {
        const faqId = req.params.id;
        const { pregunta, respuesta, categoria, orden, activo } = req.body;
        if (!pregunta || !respuesta) {
            return res.status(400).json({ error: 'Pregunta y respuesta son obligatorios' });
        }
        const { data, error } = await FaqModel.update(faqId, { pregunta, respuesta, categoria, orden, activo });
        if (error) throw error;
        res.json({ message: 'FAQ actualizada', faq: data?.[0] || null });
    } catch (err) {
        console.error('Error actualizando FAQ:', err);
        res.status(500).json({ error: 'No se pudo actualizar la FAQ' });
    }
};

exports.deleteFaq = async (req, res) => {
    try {
        const faqId = req.params.id;
        const { data, error } = await FaqModel.delete(faqId);
        if (error) throw error;
        res.json({ message: 'FAQ desactivada', faq: data?.[0] || null });
    } catch (err) {
        console.error('Error eliminando FAQ:', err);
        res.status(500).json({ error: 'No se pudo eliminar la FAQ' });
    }
};