var MongoClient = require('mongodb').MongoClient;
const urlDB = 'mongodb://127.0.0.1:27017';//change IP in prod!
var nameDB;

exports.dbName = function(name) {
  nameDB = name;
};

exports.connectDB = function(cb) {
  if (this.mongoClient && this.mongoClient.isConnected(nameDB)) {
    var instance = this.mongoClient.db(nameDB);
    cb(instance);
  } else {
    MongoClient.connect(urlDB, function(err, client) {
      if (err) {
        console.log(err)
        return;
      }
      this.mongoClient = client;
      var instance = client.db(nameDB);
      cb(instance);
    });
  }
};
