const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const upload = require('../config/multer');

router.post('/create', classController.createClass);
router.post('/join', classController.joinClass);
router.delete('/:classId', classController.deleteClass);
router.delete('/:classId/students/:studentId', classController.removeStudent);
router.post('/:classId/banner', upload.single('banner'), classController.uploadBanner);

module.exports = router;