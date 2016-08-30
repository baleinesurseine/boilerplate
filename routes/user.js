var userController = require('../controllers/user')

module.exports = function (router) {
  router.get('/account', userController.ensureAuthenticated, userController.accountGet)
  router.put('/account', userController.ensureAuthenticated, userController.accountPut)
  router.delete('/account', userController.ensureAuthenticated, userController.accountDelete)
  router.get('/signup', userController.signupGet)
  router.post('/signup', userController.signupPost)
  router.get('/login', userController.loginGet)
  router.post('/login', userController.loginPost)
  router.get('/forgot', userController.forgotGet)
  router.post('/forgot', userController.forgotPost)
  router.get('/resend', userController.resendGet)
  router.post('/resend', userController.resendPost)
  router.get('/reset/:token', userController.resetGet)
  router.post('/reset/:token', userController.resetPost)
  router.get('/confirm/:token', userController.confirmGet)
  router.get('/logout', userController.logout)
  router.get('/unlink/:provider', userController.ensureAuthenticated, userController.unlink)
  router.get('/users/:page', userController.usersGet)
  // router.get('/createAdmin', userController.createAdmin)
}
