const express = require('express');
const albumController = require('../controllers/album');
const auth = require('../middleware/auth');

const router = express.Router();

router
  .route('/')
  .post(auth.authenticateToken, albumController.create)
  .get(albumController.readAll);

router
  .route('/:albumId')
  .get(albumController.readById)
  .patch(auth.authenticateToken, albumController.patch)
  .delete(auth.authenticateToken, albumController.delete);

module.exports = router;
