'use strict'

var mongoose = require('mongoose')
var mongoosePaginate = require('mongoose-paginate')

var schemaOptions = {
  timestamps: true
}

var messageSchema = new mongoose.Schema({
  processId: String,
  token: String,
  email: String,
  sentInfo: {},
  serverStatus: String,
  clientStatus: String
}, schemaOptions)

messageSchema.plugin(mongoosePaginate)

var Message = mongoose.model('Message', messageSchema)

module.exports = Message
