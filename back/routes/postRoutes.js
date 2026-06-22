const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');
const upload = require('../config/multer');

router.post('/', upload.single('archivo'), postController.createPost);
router.delete('/:id', postController.deletePost);

module.exports = router;