var express = require('express');
var app = express();
var Parse = require('parse/node').Parse;
var fs = require('fs');

if (typeof process.env.PORT === 'undefined' || typeof process.env.PARSE_APPID_DEV === 'undefined' ||
  typeof process.env.PARSE_JSKEY_DEV === 'undefined') {
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

app.get('/relationOfDevProd', function (req, res) {
  var appId = process.env.PARSE_APPID_PROD;
  var jsKey = process.env.PARSE_JSKEY_PROD;
  Parse.initialize(appId, jsKey);

  var result = {};
  var eventQuery = new Parse.Query("Event");
  eventQuery.each(function (event) {
    result[event.get("oldEventId")] = event.id;
  }).then(function () {
    res.send(result);
  }, function (err) {
    res.statusCode(500).send("Error in retrieving event values: " + err.message);
  });
});

app.post('/postToParseDev', function (req, res) {
  var appId = process.env.PARSE_APPID_DEV;
  var jsKey = process.env.PARSE_JSKEY_DEV;
  Parse.initialize(appId, jsKey);

  var imgUrlRel = require(process.env.IMG_URL_REL);
  var promises = [];
  for (var key in imgUrlRel) {
    if (imgUrlRel.hasOwnProperty(key)) {
      var Event = new Parse.Object.extend("Event");
      var event = new Event();
      event.id = key;
      event.set("imageUrl", imgUrlRel[key]);
      promises.push(event.save());
    }
  }

  Parse.Promise.when(promises).then(function () {
    res.send(promises.length + " Objects imgUrl saved!");
  }, function (err) {
    res.statusCode(500).send("Error in saving objects: " + err.message);
  });
});


app.post('/postToParseProd', function (req, res) {
  var appId = process.env.PARSE_APPID_PROD;
  var jsKey = process.env.PARSE_JSKEY_PROD;
  Parse.initialize(appId, jsKey);

  var imgUrlRel = require(process.env.IMG_URL_REL);
  var devProdRel = require(process.env.DEV_PROD_REL).results;
  var promises = [];
  for (var key in imgUrlRel) {
    if (imgUrlRel.hasOwnProperty(key) && devProdRel.hasOwnProperty(key)) {
      var Event = new Parse.Object.extend("Event");
      var event = new Event();
      event.id = devProdRel[key];
      event.set("imageUrl", imgUrlRel[key]);
      promises.push(event.save());
    }
  }

  Parse.Promise.when(promises).then(function () {
    res.send(promises.length + " Objects imgUrl saved!");
  }, function (err) {
    res.statusCode(500).send("Error in saving objects: " + err.message);
  });
});

app.post('/populateFileUrl', function (req, res) {
  var appId = process.env.PARSE_APPID_DEV;
  var jsKey = process.env.PARSE_JSKEY_DEV;
  Parse.initialize(appId, jsKey);


  var imageRel = require(process.env.OBJ_IMG_REL).results;
  var objIds = [];
  for (var key in imageRel) {
    if (imageRel.hasOwnProperty(key)) {
      objIds.push(key);
    }
  }
  var resObj = {};
  processUrl(imageRel, objIds, 0, resObj, function (result) {
    console.log("Res: " + JSON.stringify(result));
    res.send(result);
  });
});

app.post('/populateImageList', function (req, res) {
  var imageRel2 = require(process.env.IMG_REL2).results;
  getImages(imageRel2, function (err, results) {
    if (err) {
      res.statusCode(500).send("Error in finding file list: " + err);
    } else {
      console.log("Result: " + JSON.stringify(results));
      res.send(results);
    }
  });
});

function processUrl(imageRel, objIds, idx, resObj, callback) {
  var imgArr = imageRel[objIds[idx]];
  var urls = [];
  processImage(imgArr, 0, urls, function (results) {
    resObj[objIds[idx]] = results;
    if (idx % 10 == 0) {
      console.log((idx + 1) + " images uploaded: " + JSON.stringify(resObj));
    }
    if (idx + 1 < objIds.length) {
      processUrl(imageRel, objIds, idx + 1, resObj, callback);
    } else {
      callback(resObj);
    }
  });
}

function processImage(imgArr, idx, urls, callback) {
  var path = process.env.DIR_PATH + "/" + imgArr[idx];
  var img = fs.readFileSync(path);
  var data = {
    base64: new Buffer(img).toString('base64')
  };
  var file = new Parse.File((new Date()).getTime().toString() + ".png", data);
  file.save().then(function (fl) {
    urls.push(fl.url());
    if (idx + 1 < imgArr.length) {
      processImage(imgArr, idx + 1, urls, callback)
    } else {
      callback(urls)
    }
  }, function (err) {
    console.log("Error in uploading images: " + err.message);
  });
}

function getImages(imageRel, callback) {
  fs.readdir(process.env.DIR_PATH, function (err, list) {
    console.log("JSON: " + JSON.stringify(imageRel));
    var dict = {};
    for (var key in imageRel) {
      if (imageRel.hasOwnProperty(key)) {
        var name = imageRel[key];
        var fileName;
        if (name.toString().length === 1) {
          fileName = "000" + name.toString();
        } else {
          fileName = "00" + name.toString();
        }
        dict[key] = getFiles(fileName, list);
      }
    }
    callback(err, dict);
  })
}

function getFiles(file, list) {
  var names = [];
  for (var i = 0; i < list.length; i++) {
    var subStr = list[i].substr(0, file.length);
    if (subStr === file) {
      names.push(list[i]);
    }
  }
  return names;
}