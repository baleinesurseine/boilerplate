var User = require('./models/User')

User.findOne({name: 'admin'}, function (err, user) {
  if (err) {
    return console.log('database error')
  }
  if (user) {
    return console.log('admin user already exists')
  }
  User.collection.insert({ // bypass .pre middleware
    name: 'admin',
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWD, // hashed password
    admin: true,
    emailConfirmed: true
  }, function (err, users) {
    if (err) {
      return console.log('database error')
    }
    return console.log('created admin user')
  })
})
