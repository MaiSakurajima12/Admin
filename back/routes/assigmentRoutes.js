const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assigmentController');
const upload = require('../config/multer'); 

router.get('/pending/my-assignments', assignmentController.getPendingAssignments);

router.get('/submissions/my-history', assignmentController.getStudentSubmissions);

router.get('/class/:claseId', assignmentController.getAssignmentsByClass);

router.delete('/submission/:id', assignmentController.cancelSubmission);

router.delete('/:id', assignmentController.deleteAssignment);

router.post('/', upload.single('archivo_guia'), assignmentController.createAssignment);

router.post('/submit', upload.single('archivo_entrega'), assignmentController.submitSubmission);

router.get('/submit', (req, res) => {
    res.status(405).json({ error: 'Método GET no permitido. Usa POST /api/assignments/submit.' });
});

router.put('/grade/:id', assignmentController.gradeSubmission);

router.put('/:id', assignmentController.updateAssignment);

module.exports = router;