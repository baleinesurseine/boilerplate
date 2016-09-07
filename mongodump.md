# Transfer mongo database

### goal
Transfer the content of running database `mongofrom` to running database `mongoto`
### run a third mongo image
```
run --name mongobridge --link mongofrom --link mongoto mongo sh
```
### backup database
```
mongodump --archive --host mongofrom | mongorestore --archive --host mongorestore
```
