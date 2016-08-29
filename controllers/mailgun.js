'use strict'
var nodemailer = require('nodemailer')
var EmailTemplate = require('email-templates').EmailTemplate
var path = require('path')

/**
* mail templates
*/

function mailgunHeader (token) {
  return {'X-Mailgun-Variables': '{"message-token": "' + token + '"}'}
}

function sender (templateName, from) {
  return transporter.templateSender(
    new EmailTemplate(path.join(directory, templateName)), {from: from}
  )
}

var username
var password
var directory
var transporter
var templatesDir

exports.configure = function (config) {
  if (config.username) {
    username = config.username
  }
  if (config.password) {
    password = config.password
  }
  if (config.directory) {
    directory = config.directory
    templatesDir = path.resolve(__dirname, '..', directory)
  }
  transporter = nodemailer.createTransport({
    service: 'Mailgun',
    auth: {
      user: username,
      pass: password
    }
  })
}

exports.sendMail = function (to, from, data, token, template, cb) {
  var mailSender = sender(template, from)
  return mailSender({to: to, headers: mailgunHeader(token)}, data, cb)
}
