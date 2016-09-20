var messageController = require('../controllers/message')
var userController = require('../controllers/user')

module.exports = function (router) {
  router.get('/list/:page', userController.ensureAuthenticated, messageController.messageGet)
  router.post('/webhooks', messageController.hookPost)
}
