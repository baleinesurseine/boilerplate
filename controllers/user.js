'use strict'
var async = require('async')
var crypto = require('crypto')
var passport = require('passport')

var User = require('../models/User')
var Message = require('../models/Message')

var mailer = require('../controllers/mailgun')
mailer.configure(
  {
    username: process.env.MAILGUN_USERNAME,
    password: process.env.MAILGUN_PASSWORD,
    directory: 'templates'
  }
)

exports.usersGet = function (req, res) {
  if (req.user) {
    if (!req.user.admin) {
      req.flash('error', {msg: 'Only allowed to admins'})
      return res.redirect('/')
    }
    var page = req.params.page
    User.paginate({}, {page: page, limit: 10}, function (err, users) {
      if (err) {
        req.flash('error', {msg: 'Unexpected database error'})
        return res.redirect('/')
      }
      if (!users) {
        req.flash('error', { msg: 'Could not retrieve users.' })
        return res.redirect('/')
      }
      res.render('users/list', {
        title: 'Admin',
        uss: users.docs,
        page: page,
        pages: users.pages,
        func: 'Users'
      })
    })
  } else {
    return res.redirect('/login')
  }
}

/**
* Login required middleware
*/
exports.ensureAuthenticated = function (req, res, next) {
  if (req.isAuthenticated()) {
    next()
  } else {
    res.redirect('/login')
  }
}

/**
* GET /login
*/
exports.loginGet = function (req, res) {
  if (req.user) {
    return res.redirect('/')
  }
  res.render('account/login', {
    title: 'Log in'
  })
}

/**
* POST /login
*/
exports.loginPost = function (req, res, next) {
  req.assert('email', 'Email is not valid').isEmail()
  req.assert('email', 'Email cannot be blank').notEmpty()
  req.assert('password', 'Password cannot be blank').notEmpty()

  req.sanitize('email').normalizeEmail({remove_dots: false, remove_extension: false})

  var errors = req.validationErrors()

  if (errors) {
    req.flash('error', errors)
    return res.redirect('/login')
  }

  passport.authenticate('local', function (err, user, info) {
    if (err) {
      req.flash('error', {msg: 'Unexpected error during authentication'})
      return res.redirect('/login')
    }
    if (!user) {
      req.flash('error', info)
      return res.redirect('/login')
    }
    req.logIn(user, function (err) {
      if (err) {
        req.flash('error', {msg: 'Unexpected error during login'})
        return res.redirect('/login')
      }
      res.redirect('/')
    })
  })(req, res, next)
}

/**
* GET /logout
*/
exports.logout = function (req, res) {
  req.logout()
  res.redirect('/')
}

/**
* GET /signup
*/
exports.signupGet = function (req, res) {
  if (req.user) {
    return res.redirect('/')
  }
  res.render('account/signup', {
    title: 'Sign up'
  })
}

/**
* POST /signup
*/
exports.signupPost = function (req, res, next) {
  req.assert('name', 'Name cannot be blank').notEmpty()
  req.assert('email', 'Email is not valid').isEmail()
  req.assert('email', 'Email cannot be blank').notEmpty()
  req.assert('password', 'Password must be at least 8 characters long').len(8)
  req.sanitize('email').normalizeEmail({ remove_dots: false, remove_extension: false })

  if (req.body.name === 'admin') {
    req.flash('error', {msg: 'Name cannot be admin.'})
    return res.redirect('/signup')
  }

  var errors = req.validationErrors()

  if (errors) {
    req.flash('error', errors)
    return res.redirect('/signup')
  }

  User.findOne({ email: req.body.email }, function (err, user) {
    if (err) {
      req.flash('error', {err: 'Unexpected error during signup'})
      return res.redirect('/signup')
    }
    if (user) {
      req.flash('error', {msg: 'The email address you have entered is already associated with another account.'})
      return res.redirect('/signup')
    }
    user = new User({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password,
      emailConfirmed: false
    })
    user.save(function (err) {
      if (err) {
        req.flash('error', {msg: 'Unexpected error during saving'})
        return res.redirect('/')
      }
      async.waterfall([
        function (done) {
          crypto.randomBytes(16, function (err, buf) {
            var token = buf.toString('hex')
            done(err, token)
          })
        },
        function (token, done) {
          user.emailConfirmToken = token
          user.emailConfirmExpires = Date.now() + 1000 * 60 * 60 // expire in 1 hour
          user.save(function (err) {
            done(err, token, user)
          })
        },
        function (token, user, done) {
          crypto.randomBytes(8, function (err, buff) {
            if (err) {
              req.flash('error', {msg: 'Unexpected crypto error'})
              return res.redirect('/signup')
            }
            var messageToken = buff.toString('hex')

            mailer.sendMail(
              user.email,
              process.env.SENDER_MAIL,
              {host: req.headers.host, token: token},
              messageToken,
              'resend-email',
              function (err, info) {
                if (err) {
                  req.flash('error', {msg: 'Unexpected mail error'})
                  return res.redirect('/signup')
                }
                req.flash('info', { msg: 'An email has been sent to ' + user.email + ' with further instructions.' })

                var message = new Message({
                  sentInfo: info,
                  email: user.email,
                  token: messageToken,
                  processId: 'account confirmation token sent',
                  serverStatus: 'sent'
                })

                message.save(function (err) {
                  if (err) {
                    req.flash('error', {msg: 'Unexpected database error'})
                    return res.redirect('/signup')
                  }
                  res.redirect('/signup')
                })
              }
            )
          })
        }
      ])
    })
  })
}

exports.createAdmin = function (req, res, next) {
  User.findOne({name: 'admin'}, function (err, user) {
    if (err) {
      req.flash('error', {msg: 'Unexpected error during admin creation'})
      return res.redirect('/')
    }
    if (user && user.name === 'admin') {
      req.flash('error', {msg: 'The admin user already exists.'})
      return res.redirect('/')
    }
    User.collection.insert({ // bypass .pre middleware
      name: 'admin',
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWD, // hashed password
      admin: true,
      emailConfirmed: true
    }, function (err, users) {
      if (err) {
        req.flash('error', {msg: 'Unexpected error during saving'})
      }
      res.redirect('/login')
    })
  })
}

/**
* GET /account
*/
exports.accountGet = function (req, res) {
  res.render('account/profile', {
    title: 'My Account'
  })
}

/**
* PUT /account
* Update profile information OR change password.
*/
exports.accountPut = function (req, res, next) {
  if ('password' in req.body) {
    req.assert('password', 'Password must be at least 8 characters long').len(8)
    req.assert('confirm', 'Passwords must match').equals(req.body.password)
  } else {
    req.assert('email', 'Email is not valid').isEmail()
    req.assert('email', 'Email cannot be blank').notEmpty()
    req.sanitize('email').normalizeEmail({ remove_dots: false, remove_extension: false })
  }

  var errors = req.validationErrors()

  if (errors) {
    req.flash('error', errors)
    return res.redirect('/account')
  }

  User.findById(req.user.id, function (err, user) {
    if (err) {
      req.flash('err', {msg: 'Unexpected error during account update'})
      return res.redirect('/account')
    }
    if (user.admin && user.name !== req.body.name) {
      req.flash('error', {msg: 'You cannot change the name of admins.'})
      return res.redirect('/account')
    }

    if (!user.admin && req.body.name === 'admin') {
      req.flash('error', {msg: 'You cannot change the name to admin.'})
      return res.redirect('/account')
    }

    if ('password' in req.body) {
      user.password = req.body.password
    } else {
      user.email = req.body.email
      user.name = req.body.name
      user.gender = req.body.gender
      user.location = req.body.location
      user.website = req.body.website
    }

    user.save(function (err) {
      if ('password' in req.body) {
        req.flash('success', {msg: 'Your password has been changed.'})
      } else if (err && err.code === 11000) {
        req.flash('error', {msg: 'The email address you have entered is already associated with another account.'})
      } else {
        req.flash('success', {msg: 'Your profile information has been updated.'})
      }
      res.redirect('/account')
    })
  })
}

/**
* DELETE /account
*/
exports.accountDelete = function (req, res, next) {
  User.remove({ _id: req.user.id }, function (err) {
    if (err) {
      req.flash('err', {msg: 'Unexpected error during deletion'})
      return res.redirect('/account')
    }
    req.logout()
    req.flash('info', {msg: 'Your account has been permanently deleted.'})
    res.redirect('/')
  })
}

/**
* GET /unlink/:provider
*/
exports.unlink = function (req, res, next) {
  User.findById(req.user.id, function (err, user) {
    if (err) {
      req.flash('error', {msg: 'Unexpected error during unlinking'})
      return res.redirect('/account')
    }
    switch (req.params.provider) {
      case 'facebook':
        user.facebook = undefined
        break
      case 'google':
        user.google = undefined
        break
      case 'twitter':
        user.twitter = undefined
        break
      case 'vk':
        user.vk = undefined
        break
      case 'github':
        user.github = undefined
        break
      default:
        req.flash('error', {msg: 'Invalid OAuth Provider'})
        return res.redirect('/account')
    }
    user.save(function (err) {
      if (err) {
        req.flash('error', {msg: 'Unexpected error during unlinking'})
        return res.redirect('/account')
      }
      req.flash('success', {msg: 'Your account has been unlinked.'})
      res.redirect('/account')
    })
  })
}

/**
* GET /confirm
*/
exports.confirmGet = function (req, res) {
  if (req.isAuthenticated()) {
    return res.redirect('/')
  }
  User.findOne({ emailConfirmToken: req.params.token })
  .where('emailConfirmExpires').gt(Date.now())
  .exec(function (err, user) {
    if (err) {
      req.flash('error', {msg: 'Unexpected database error'})
      return res.redirect('/login')
    }
    if (!user) {
      req.flash('error', {msg: 'Account validation token is invalid or has expired.'})
      return res.redirect('/login')
    }
    user.emailConfirmed = true
    user.emailConfirmExpires = undefined
    user.emailConfirmToken = undefined
    user.save(function (err) {
      if (err) {
        req.flash('error', {msg: 'Unexpected database error'})
        return res.redirect('/login')
      }
    })
    req.flash('info', {msg: 'Your account is confirmed. You can login.'})
    return res.redirect('/login')
  })
}

/**
* GET /resend
*/
exports.resendGet = function (req, res) {
  if (req.isAuthenticated()) {
    return res.redirect('/')
  }
  res.render('account/resend', {
    title: 'Resend confirmation email'
  })
}

/**
* POST /resend
*/
exports.resendPost = function (req, res, next) {
  req.assert('email', 'Email is not valid').isEmail()
  req.assert('email', 'Email cannot be blank').notEmpty()
  req.sanitize('email').normalizeEmail({ remove_dots: false, remove_extension: false })
  var errors = req.validationErrors()
  if (errors) {
    req.flash('error', errors)
    return res.redirect('/resend')
  }
  async.waterfall([
    function (done) {
      crypto.randomBytes(16, function (err, buf) {
        var token = buf.toString('hex')
        done(err, token)
      })
    },
    function (token, done) {
      User.findOne({ email: req.body.email }, function (err, user) {
        if (err) {
          req.flash('error', {msg: 'Unexpected database error'})
          return res.redirect('/resend')
        }
        if (!user) {
          req.flash('error', {msg: 'The email address ' + req.body.email + ' is not associated with any account.'})
          return res.redirect('/resend')
        }
        if (user.emailConfirmed) {
          req.flash('error', {msg: 'The email address ' + req.body.email + ' is already associated with a confirmed account.'})
          return res.redirect('/resend')
        }
        user.emailConfirmToken = token
        user.emailConfirmExpires = Date.now() + 1000 * 60 * 60 // expire in 1 hour
        user.save(function (err) {
          done(err, token, user)
        })
      })
    },
    function (token, user, done) {
      crypto.randomBytes(8, function (err, buff) {
        if (err) {
          req.flash('error', {msg: 'Unexpected crypto error'})
          return res.redirect('/resend')
        }
        var messageToken = buff.toString('hex')

        mailer.sendMail(
          user.email,
          process.env.SENDER_MAIL,
          {host: req.headers.host, token: token},
          messageToken,
          'resend-email',
          function (err, info) {
            if (err) {
              req.flash('error', {msg: 'Unexpected mail error'})
              return res.redirect('/resend')
            }
            req.flash('info', { msg: 'An email has been sent to ' + user.email + ' with further instructions.' })

            var message = new Message({
              sentInfo: info,
              email: user.email,
              token: messageToken,
              processId: 'account confirmation token sent',
              serverStatus: 'sent'
            })

            message.save(function (err) {
              if (err) {
                req.flash('error', {msg: 'Unexpected database error'})
                return res.redirect('/resend')
              }
              res.redirect('/resend')
            })
          }
        )
      })
    }
  ])
}
/**
* GET /forgot
*/
exports.forgotGet = function (req, res) {
  if (req.isAuthenticated()) {
    return res.redirect('/')
  }
  res.render('account/forgot', {
    title: 'Forgot Password'
  })
}

/**
* POST /forgot
*/
exports.forgotPost = function (req, res, next) {
  req.assert('email', 'Email is not valid').isEmail()
  req.assert('email', 'Email cannot be blank').notEmpty()
  req.sanitize('email').normalizeEmail({ remove_dots: false, remove_extension: false })
  var errors = req.validationErrors()
  if (errors) {
    req.flash('error', errors)
    return res.redirect('/forgot')
  }
  async.waterfall([
    function (done) {
      crypto.randomBytes(16, function (err, buf) {
        var token = buf.toString('hex')
        done(err, token)
      })
    },
    function (token, done) {
      User.findOne({ email: req.body.email }, function (err, user) {
        if (err) {
          req.flash('error', {msg: 'Unexpected database error'})
          return res.redirect('/forgot')
        }
        if (!user) {
          req.flash('error', {msg: 'The email address ' + req.body.email + ' is not associated with any account.'})
          return res.redirect('/forgot')
        }
        if (!user.emailConfirmed) {
          req.flash('error', {msg: 'The email address ' + req.body.email + ' is associated to an unconfirmed account.'})
          return res.redirect('/forgot')
        }
        user.passwordResetToken = token
        user.passwordResetExpires = Date.now() + 1000 * 60 * 60 // expire in 1 hour
        user.save(function (err) {
          done(err, token, user)
        })
      })
    },
    function (token, user, done) {
      crypto.randomBytes(8, function (err, buff) {
        if (err) {
          req.flash('error', {msg: 'Unexpected crypto error'})
          return res.redirect('/forgot')
        }
        var messageToken = buff.toString('hex')

        mailer.sendMail(
          user.email,
          process.env.SENDER_MAIL,
          {host: req.headers.host, token: token},
          messageToken,
          'reset-email',
          function (err, info) {
            if (err) {
              req.flash('error', {msg: 'Unexpected mail error'})
              return res.redirect('/forgot')
            }
            req.flash('info', { msg: 'An email has been sent to ' + user.email + ' with further instructions.' })

            var message = new Message({
              sentInfo: info,
              email: user.email,
              token: messageToken,
              processId: 'password reset token sent',
              serverStatus: 'sent'
            })

            message.save(function (err) {
              if (err) {
                req.flash('error', {msg: 'Unexpected database error'})
                return res.redirect('/forgot')
              }
              res.redirect('/forgot')
            })
          }
        )
      })
    }
  ])
}

/**
* GET /reset
*/
exports.resetGet = function (req, res) {
  if (req.isAuthenticated()) {
    return res.redirect('/')
  }
  User.findOne({ passwordResetToken: req.params.token })
  .where('passwordResetExpires').gt(Date.now())
  .exec(function (err, user) {
    if (err) {
      req.flash('error', {msg: 'Unexpected database error'})
      return res.redirect('/forgot')
    }
    if (!user) {
      req.flash('error', {msg: 'Password reset token is invalid or has expired.'})
      return res.redirect('/forgot')
    }
    res.render('account/reset', {
      title: 'Password Reset'
    })
  })
}

/**
* POST /reset
*/
exports.resetPost = function (req, res, next) {
  req.assert('password', 'Password must be at least 8 characters long').len(8)
  req.assert('confirm', 'Passwords must match').equals(req.body.password)

  var errors = req.validationErrors()

  if (errors) {
    req.flash('error', errors)
    return res.redirect('back')
  }

  async.waterfall([
    function (done) {
      User.findOne({ passwordResetToken: req.params.token })
      .where('passwordResetExpires').gt(Date.now())
      .exec(function (err, user) {
        if (err) {
          req.flash('error', {msg: 'Unexpected database error'})
          return res.redirect('back')
        }
        if (!user) {
          req.flash('error', { msg: 'Password reset token is invalid or has expired.' })
          return res.redirect('/forgot')
        }
        user.password = req.body.password
        user.passwordResetToken = undefined
        user.passwordResetExpires = undefined
        user.save(function (err) {
          if (err) {
            req.flash('error', {msg: 'Unexpected database error'})
            return res.redirect('back')
          }
          req.logIn(user, function (err) {
            done(err, user)
          })
        })
      })
    },
    function (user, done) {
      crypto.randomBytes(8, function (err, buff) {
        if (err) {
          req.flash('error', {msg: 'Unexpected crypto error'})
          return res.redirect('/')
        }

        var messageToken = buff.toString('hex')

        mailer.sendMail(
          user.email,
          process.env.SENDER_MAIL,
          {email: user.email},
          messageToken,
          'confirm-change',
          function (err, info) {
            if (err) {
              req.flash('error', {msg: 'Unexpected mail error'})
              return res.redirect('/')
            }
            req.logout() // added
            req.flash('success', {msg: 'Your password has been changed successfully.'})

            var message = new Message({
              sentInfo: info,
              email: user.email,
              token: messageToken,
              processId: 'password changed',
              serverStatus: 'sent'
            })

            message.save(function (err) {
              if (err) {
                req.flash('error', {msg: 'Unexpected database error'})
                return res.redirect('/')
              }
              res.redirect('/')
            })
          })
      })
    }
  ])
}
