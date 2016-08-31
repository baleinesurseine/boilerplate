var express = require('express')
var path = require('path')
var logger = require('morgan')
var compression = require('compression')
var methodOverride = require('method-override')
var session = require('express-session')
var MongoStore = require('connect-mongo')(session) // to store session data in a persistent way
var flash = require('express-flash')
var bodyParser = require('body-parser')
var expressValidator = require('express-validator')
var dotenv = require('dotenv') // to set process.env values from a .env file
var nunjucks = require('nunjucks') // templating engine
var mongoose = require('mongoose')
var passport = require('passport') // authentication middleware
var helmet = require('helmet')

// Load environment variables from .env file
dotenv.config({path: './env/.env'})

// Passport OAuth strategies
require('./config/passport')

var app = express()
app.use(helmet())

var client = require('redis').createClient({host: 'redis'})
var limiter = require('express-limiter')(app, client)

limiter({
  path: '/login',
  method: 'post',
  lookup: ['connection.remoteAddress'],
  total: 150,
  expire: 1000 * 60 * 60
})

var router = express.Router()

mongoose.connect('mongodb://mongo:27017/')
mongoose.connection.on('connected', function () {
  console.log('Mongoose connection open on ' + mongoose.connection.host + ':' + mongoose.connection.port)
})

mongoose.connection.on('disconnected', function () {
  console.log('Mongoose connection disconnected')
})

mongoose.connection.on('error', function (err) {
  console.log('Mongoose connection error: ' + err)
})

process.on('SIGINT', function () {
  mongoose.connection.close(function () {
    console.log('Mongoose connection disconnected through app termination')
    process.exit(0)
  })
})

require('./createAdmin')

// view engine setup
nunjucks.configure('views', {
  autoescape: true,
  express: app
})

app.set('view engine', 'html')
app.set('port', process.env.PORT || process.argv[2] || 3000)
app.use(compression())
app.use(logger('dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(expressValidator())
app.use(methodOverride('_method'))
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  cookie: { maxAge: 1000 * 60 * 60 }, // 1 hour
  saveUninitialized: true,
  store: new MongoStore({mongooseConnection: mongoose.connection})
}))
app.use(flash())
app.use(passport.initialize())
app.use(passport.session())
app.use(function (req, res, next) {
  res.locals.user = req.user
  next()
})
app.use(express.static(path.join(__dirname, 'public')))

app.use(function (req, res, next) {
  res.locals.GA = process.env.GOOGLE_ANALYTICS
  res.locals.GV = process.env.GOOGLE_VERIF
  next()
})

require('./routes/home')(router)
require('./routes/user')(router)
require('./routes/contact')(router)
require('./routes/oauth')(router)
require('./routes/message')(router)

app.use(router)

app.get('/track', function (req, res, next) {
  process.nextTick(function (req) {
    // tracking operations
  })
  return res.status(204).send()
})

app.get('*', function (req, res, next) {
  var err = new Error()
  err.status = 404
  next(err)
})
app.use(function (err, req, res, next) {
  if (err.status !== 404) {
    return next()
  }
  res.render('404', {
    title: 'Ressource not found',
    url: req.url
  })
})

app.listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'))
})

module.exports = app
