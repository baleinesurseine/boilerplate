'use strict'

var nodemailer = require('nodemailer')
var transporter = nodemailer.createTransport({
  service: 'Mailgun',
  auth: {
    user: process.env.MAILGUN_USERNAME,
    pass: process.env.MAILGUN_PASSWORD
  }
})

/**
 * GET /contact
 */
exports.contactGet = function (req, res) {
  res.render('contact', {
    title: 'Contact',
    GA: process.env.GOOGLE_ANALYTICS
  })
}

/**
 * POST /contact
 */
exports.contactPost = function (req, res) {
  req.assert('name', 'Name cannot be blank').notEmpty()
  req.assert('email', 'Email is not valid').isEmail()
  req.assert('email', 'Email cannot be blank').notEmpty()
  req.assert('message', 'Message cannot be blank').notEmpty()
  req.sanitize('email').normalizeEmail({ remove_dots: false, remove_extension: false })

  var errors = req.validationErrors()

  if (errors) {
    req.flash('error', errors)
    return res.redirect('/contact')
  }

  var mailOptions = {
    from: req.body.name + ' ' + '<' + req.body.email + '>',
    to: process.env.CONTACT_MAIL,
    subject: '✔ Contact Form | Mega Boilerplate',
    text: req.body.message
  }

  transporter.sendMail(mailOptions, function (err) {
    if (err) {
      req.flash('error', {msg: 'Unexpected error with sendMail'})
      return res.redirect('/contact')
    }
    req.flash('success', {msg: 'Thank you! Your feedback has been submitted.'})
    res.redirect('/contact')
  })
}
