const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
const upload = require('../config/multer');
const { authenticateToken } = require('../middleware/authMiddleware');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/update-avatar', authenticateToken, upload.single('avatar'), userController.updateAvatar);
router.delete('/delete-avatar', authenticateToken, userController.deleteAvatar);
router.put('/update-profile', authenticateToken, userController.updateProfile);
router.delete('/delete-account', authenticateToken, userController.deleteAccount);
router.get('/logout', authController.logout);
module.exports = router;