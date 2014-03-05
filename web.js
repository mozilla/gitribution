var express   = require("express");
var cronJob   = require('cron').CronJob;
var data      = require("./lib/data");
var fetchData = require("./fetch_data");

var app       = express();

// regularly ping github and get new activity
new cronJob('0 */20 * * * *', function() {
    // console.log('timing');
    fetchData.pingGithubUpdateDB();
}, null, true);



app.get('/', function(req, res) {
  res.send('Hello World! ');
});


app.get('/api', function(req, res) {
  res.send('API!');
});

var port = Number(process.env.PORT || 5000);
app.listen(port, function() {
  console.log("Listening on " + port);
});