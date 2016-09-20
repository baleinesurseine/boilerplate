var xtermController = require('../controllers/xterm')
var userController = require('../controllers/user')

module.exports = function (router) {
  router.get('/xterm', userController.ensureAuthenticated, xtermController.xtermGet)
  router.get('/terminals', userController.ensureAuthenticated, xtermController.getTerminal)
  router.get('/terminals/:pid/size', userController.ensureAuthenticated, xtermController.getTerminalSize)
  router.ws('/terminals/:pid', userController.ensureAuthenticated, xtermController.wsTerminal)
}
