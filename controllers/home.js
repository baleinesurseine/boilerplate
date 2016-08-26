'use strict'
/**
 * GET /
 */
exports.index = function (req, res) {
  res.render('home', {
    title: 'Home',
    GA: process.env.GOOGLE_ANALYTICS
  })
}
