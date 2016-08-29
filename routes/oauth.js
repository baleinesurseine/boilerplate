var passport = require('passport')

module.exports = function (router) {
  router.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email', 'user_location'] }))
  router.get('/auth/facebook/callback', passport.authenticate('facebook', { successRedirect: '/', failureRedirect: '/login' }))
  router.get('/auth/google', passport.authenticate('google', { scope: 'profile email' }))
  router.get('/auth/google/callback', passport.authenticate('google', { successRedirect: '/', failureRedirect: '/login' }))
  router.get('/auth/twitter', passport.authenticate('twitter'))
  router.get('/auth/twitter/callback', passport.authenticate('twitter', { successRedirect: '/', failureRedirect: '/login' }))
  router.get('/auth/github', passport.authenticate('github', { scope: [ 'user:email profile repo' ] }))
  router.get('/auth/github/callback', passport.authenticate('github', { successRedirect: '/', failureRedirect: '/login' }))
}
