var homeController = require('./controllers/home')

module.exports = function (router) {
  router.get('/', homeController.index)
}
