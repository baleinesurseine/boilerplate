var contactController = require('../controllers/contact')

module.exports = function (router) {
  router.get('/contact', contactController.contactGet)
  router.post('/contact', contactController.contactPost)
}
