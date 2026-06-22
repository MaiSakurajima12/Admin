const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const upload = require('../config/multer');
const { isSupport } = require('../middleware/checkSupport');

router.post('/', upload.single('evidencia'), supportController.createReport);
router.get('/my', supportController.listUserReports);


router.get('/', isSupport, supportController.listAllReports);
router.get('/technicians', isSupport, supportController.listTechnicians);
router.patch('/:id', isSupport, supportController.updateReport);
router.get('/:id', isSupport, supportController.getReport);

module.exports = router;
