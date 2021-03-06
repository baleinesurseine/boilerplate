'use strict'

var crypto = require('crypto')
var bcrypt = require('bcrypt-nodejs')
var mongoose = require('mongoose')
var mongoosePaginate = require('mongoose-paginate')

var schemaOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true
  }
}

var userSchema = new mongoose.Schema({
  name: String,
  email: {type: String, unique: true},
  emailConfirmToken: String,
  emailConfirmExpires: Date,
  emailConfirmed: {type: Boolean, default: false},
  password: String,
  admin: Boolean,
  passwordResetToken: String,
  passwordResetExpires: Date,
  gender: String,
  location: String,
  website: String,
  picture: String,
  facebook: String,
  twitter: String,
  google: String,
  github: String,
  vk: String
}, schemaOptions)

userSchema.pre('save', function (next) {
  var user = this
  if (!user.isModified('password')) { return next() }
  bcrypt.genSalt(10, function (err, salt) {
    if (err) {
      return next()
    }
    bcrypt.hash(user.password, salt, null, function (err, hash) {
      if (err) {
        return next()
      }
      user.password = hash
      next()
    })
  })
})

userSchema.methods.comparePassword = function (password, cb) {
  bcrypt.compare(password, this.password, function (err, isMatch) {
    cb(err, isMatch)
  })
}

userSchema.virtual('gravatar').get(function () {
  if (!this.get('email')) {
    return 'https://gravatar.com/avatar/?s=200&d=retro'
  }
  var md5 = crypto.createHash('md5').update(this.get('email')).digest('hex')
  return 'https://gravatar.com/avatar/' + md5 + '?s=200&d=retro'
})

userSchema.options.toJSON = {
  transform: function (doc, ret, options) {
    delete ret.password
    delete ret.passwordResetToken
    delete ret.passwordResetExpires
  }
}

userSchema.plugin(mongoosePaginate)

var User = mongoose.model('User', userSchema)

module.exports = User
