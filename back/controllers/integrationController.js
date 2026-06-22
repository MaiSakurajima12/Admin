const supabase = require('../config/db');
const fetch = global.fetch || require('node-fetch');

async function callGroqTranscriptionByUrl(audioUrl) {
    const groqUrl = process.env.GROQ_API_URL;
    const groqKey = process.env.GROQ_API_KEY;

    if (!groqUrl || !groqKey) return null;

    try {
        const res = await fetch(groqUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${groqKey}`
            },
            body: JSON.stringify({ audio_url: audioUrl })
        });

        if (!res.ok) {
            const text = await res.text();
            console.warn('Groq transcription failed:', res.status, text);
            return null;
        }

        const data = await res.json();
        return data?.transcript || data?.text || null;
    } catch (err) {
        console.warn('Error calling Groq:', err.message);
        return null;
    }
}

exports.transcribeFromUrl = async (req, res) => {
    try {
        const { url } = req.body || {};
        if (!url) return res.status(400).json({ error: 'Se requiere `url` en el body' });

        const transcript = await callGroqTranscriptionByUrl(url);
        if (!transcript) return res.status(502).json({ error: 'No se pudo transcribir (comprueba GROQ_API_URL/GROQ_API_KEY)' });

        res.json({ transcript });
    } catch (err) {
        console.error('transcribeFromUrl error:', err);
        res.status(500).json({ error: 'Error en transcripción' });
    }
};

exports.transcribeUpload = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
        const fileName = `transcribe_${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_')}`;
        const bucket = req.body?.bucket || process.env.GROQ_UPLOAD_BUCKET || 'anuncios';

        const { data: uploadData, error: uploadError } = await supabase.storage.from(bucket).upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
        if (uploadError) {
            console.warn('Supabase upload error (transcribe):', uploadError);


            if (uploadError?.status === 409 || uploadError?.message?.includes('already exists')) {
                const { error: retryError } = await supabase.storage.from(bucket).upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: true });
                if (retryError) {
                    console.warn('Supabase retry upload error (transcribe):', retryError);
                    return res.status(502).json({ error: `No se pudo subir archivo para transcribir: ${retryError.message || retryError}` });
                }
            } else {
                return res.status(502).json({ error: `No se pudo subir archivo para transcribir: ${uploadError.message || uploadError}` });
            }
        }

        const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
        const publicUrl = publicUrlData?.publicUrl || `${(process.env.SUPABASE_URL || '').replace(/\/$/, '')}/storage/v1/object/public/${bucket}/${fileName}`;

        if (!publicUrl) {
            console.warn('No se pudo obtener URL pública para transcribir');
            return res.status(502).json({ error: 'No se pudo generar la URL pública para transcribir el audio' });
        }

        const transcript = await callGroqTranscriptionByUrl(publicUrl);
        if (!transcript) return res.status(502).json({ error: 'No se pudo transcribir audio' });

        res.json({ transcript, url: publicUrl });
    } catch (err) {
        console.error('transcribeUpload error:', err);
        res.status(500).json({ error: 'Error interno' });
    }
};

exports.saplingAnalyze = async (req, res) => {
    try {
        const { text, fileUrl } = req.body || {};
        if ((!text || !text.trim()) && (!fileUrl || !fileUrl.trim())) {
            return res.status(400).json({ error: 'Se requiere `text` o `fileUrl` en body' });
        }

        let payloadText = (text || '').trim();
        if (!payloadText && fileUrl) {
            const supportedExtensions = /(\.txt|\.pdf|\.doc|\.docx|\.ppt|\.pptx)$/i;
            if (!supportedExtensions.test(fileUrl)) {
                return res.status(400).json({ error: 'Solo se pueden analizar archivos .txt, .pdf, .doc/.docx y .ppt/.pptx' });
            }
            payloadText = `Analiza este archivo adjunto para detectar contenido generado por IA: ${fileUrl}`;
        }
        if (payloadText.length > 5000) {
            return res.status(400).json({ error: 'Límite de 5000 caracteres excedido' });
        }

        const defaultSaplingUrl = 'https://api.sapling.ai/api/v1/aidetect';
        let saplingUrl = process.env.SAPLING_API_URL || defaultSaplingUrl;
        const saplingKey = process.env.SAPLING_API_KEY;

        if (!saplingKey) {
            const lenScore = Math.min(1, payloadText.length / 5000);
            const keywords = ['hecho', 'completo', 'terminado', 'finalizado', 'listo'];
            let kscore = 0;
            const lower = payloadText.toLowerCase();
            keywords.forEach(k => { if (lower.includes(k)) kscore += 0.2; });
            const percent = Math.round(Math.min(100, (lenScore * 70 + kscore * 100)));
            return res.json({ percent });
        }

        if (/\/v1\/annotate/i.test(saplingUrl)) {
            console.warn('Sapling API URL deprecado detectado, usando endpoint de detector en su lugar.');
            saplingUrl = defaultSaplingUrl;
        }

        try {
            const r = await fetch(saplingUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${saplingKey}`
                },
                body: JSON.stringify({ text: payloadText })
            });

            if (!r.ok) {
                const t = await r.text();
                console.warn('Sapling API error:', r.status, t);
                return res.status(502).json({ error: 'Error desde Sapling' });
            }

            const j = await r.json();
            const percent = j.percent || j.completion_percent || j.score || null;
            if (percent === null) return res.json({ percent: Math.round(Math.min(100, (text.length/5000)*100)) });
            return res.json({ percent });
        } catch (err) {
            console.warn('Sapling call failed:', err.message);
            return res.status(502).json({ error: 'No se pudo contactar Sapling' });
        }
    } catch (err) {
        console.error('saplingAnalyze error:', err);
        res.status(500).json({ error: 'Error interno' });
    }
};

module.exports = exports;
