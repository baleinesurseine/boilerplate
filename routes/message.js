var messageController = require('../controllers/message')

module.exports = function (router) {
  router.get('/list/:page', messageController.messageGet)
  router.post('/webhooks', messageController.hookPost)
}
