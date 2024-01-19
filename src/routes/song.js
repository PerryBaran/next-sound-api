const express = require('express');
const songController = require('../controllers/song');
const auth = require('../middleware/auth');

const router = express.Router();

router
  .route('/')
  .post(auth.authenticateToken, songController.create)
  .get(songController.readAll);

router
  .route('/:songId')
  .get(songController.readById)
  .patch(auth.authenticateToken, songController.patch)
  .delete(auth.authenticateToken, songController.delete);

module.exports = router;
