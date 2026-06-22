const express = require('express');
const router = express.Router();
const rubricController = require('../controllers/rubricController');


router.get('/', rubricController.getAllRubrics);
router.get('/class/:claseId', rubricController.getRubricsByClass);
router.post('/', rubricController.createGlobalRubric);
router.put('/:id', rubricController.updateRubric);
router.delete('/:id', rubricController.deleteRubric);

router.get('/:rubricaId/levels', rubricController.getRubricLevels);
router.post('/:rubricaId/levels', rubricController.createRubricLevel);
router.put('/levels/:levelId', rubricController.updateRubricLevel);
router.delete('/levels/:levelId', rubricController.deleteRubricLevel);

router.get('/task/:tareaId', rubricController.getRubricsByTask);

// Calificaciones por rúbrica
router.get('/submission/:entregaId', rubricController.getSubmissionGrades);
router.post('/submission/:entregaId/grades', rubricController.gradeSubmissionRubrics);

module.exports = router;
