var express = require('express');
var app = express();
var Parse = require('parse/node').Parse;
var fs = require('fs');

if (typeof process.env.PORT === 'undefined' || typeof process.env.PARSE_APPID === 'undefined' ||
  typeof process.env.PARSE_JSKEY === 'undefined') {
  console.error("Please set the env variables PORT, PARSE_APPID, PARSE_JSKEY");
}

// respond with "hello world" when a GET request is made to the homepage
app.get('/', function (req, res) {
  res.send('Parse image upload');
});

var port = process.env.PORT;
app.listen(port, function () {
  console.log("ParseExportImport listening on " + port);
});

app.get('/testFile', function (req, res) {
  var appId = process.env.PARSE_APPID;
  var jsKey = process.env.PARSE_JSKEY;
  Parse.initialize(appId, jsKey);

  var path = process.env.FILE_PATH
  var img = fs.readFileSync(path);
  var data = {
    base64: new Buffer(img).toString('base64')
  };
  var file = new Parse.File("img001.jpg", data);
  file.save().then(function (fl) {
    console.log("File saved: " + JSON.stringify(file));
    res.send("Successful read");
  }, function (err) {
    res.statusCode(500).send("Error in reading file: " + err);
  });
});