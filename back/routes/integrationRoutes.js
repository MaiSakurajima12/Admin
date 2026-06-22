const express = require('express');
const router = express.Router();
const upload = require('../config/multer');
const integrationController = require('../controllers/integrationController');


router.post('/transcribe-url', integrationController.transcribeFromUrl);

router.post('/transcribe-upload', upload.single('file'), integrationController.transcribeUpload);

router.route('/sapling')
    .get((req, res) => res.status(405).json({ error: 'Usa POST /api/integrations/sapling' }))
    .post(integrationController.saplingAnalyze);

module.exports = router;
