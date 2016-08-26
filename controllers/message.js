'use strict'

var Message = require('../models/Message')
var crypto = require('crypto')

exports.messageGet = function (req, res) {
  if (req.user) {
    if (!req.user.admin) {
      req.flash('error', {msg: 'Only allowed to admins'})
      return res.redirect('/')
    }
    var page = req.params.page
    Message.paginate({}, {page: page, limit: 10, sort: {_id: -1}}, function (err, messages) {
      if (err) {
        req.flash('error', {msg: 'Unexpected database error'})
        return res.redirect('/')
      }
      if (!messages) {
        req.flash('error', { msg: 'Could not retrieve messages.' })
        return res.redirect('/')
      }
      res.render('messages/list', {
        title: 'Admin',
        mess: messages.docs,
        page: page,
        pages: messages.pages,
        func: 'Messages',
        GA: process.env.GOOGLE_ANALYTICS
      })
    })
  } else {
    return res.redirect('/login')
  }
}

exports.hookPost = function (req, res, next) {
  var hmac = crypto.createHmac('sha256', process.env.MAILGUN_APIKEY)

  var token = req.body.token
  var timestamp = req.body.timestamp + ''
  var signature = req.body.signature + ''

  var load = timestamp + token
  var hm = hmac.update(load).digest('hex')
  if (signature !== hm) {
    return res.status(403).end()
  }

  var messageToken = req.body['message-token']
  var messageEvent = req.body.event
  // var messageId = req.body['Message-Id']

  Message.findOne({token: messageToken}, function (err, message) {
    if (err) {
      return next(err)
    }
    if (message) {
      if (messageEvent === 'delivered') {
        message.serverStatus = 'delivered'
      }
      if (messageEvent === 'opened') {
        message.clientStatus = 'opened'
      }
      if (messageEvent === 'bounced') {
        message.clientStatus = 'bounced'
      }
      if (messageEvent === 'complained') {
        message.clientStatus = 'spam complained'
      }
      message.save(function (err) {
        if (err) {
          return next(err)
        }
        console.log(message)
      })
    }
  })

  res.status(200).end()
}
