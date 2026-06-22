const express = require('express');
const router = express.Router();
const faqController = require('../controllers/faqController');
const { isAdmin } = require('../middleware/checkAdmin');

router.get('/', faqController.listPublicFaqs);
router.post('/:id/usar', faqController.registerFaqUsage);

router.get('/admin', isAdmin, faqController.listAdminFaqs);
router.post('/admin', isAdmin, faqController.createFaq);
router.put('/admin/:id', isAdmin, faqController.updateFaq);
router.delete('/admin/:id', isAdmin, faqController.deleteFaq);

module.exports = router;