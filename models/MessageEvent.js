'use strict'

var mongoose = require('mongoose')

var schemaOptions = {
  timestamps: true
}

var messageEventSchema = new mongoose.Schema({
  messageToken: String,
  time: Date,
  event: String
}, schemaOptions)

var MessageEvent = mongoose.model('MessageEvent', messageEventSchema)

module.exports = MessageEvent
