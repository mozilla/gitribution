var express   = require("express");
var cronJob   = require('cron').CronJob;
var data      = require("./lib/data");
var fetchData = require("./fetch_data");

var app       = express();

// regularly ping github and get new activity
new cronJob('0 */15 * * * *', function() {
    // console.log('timing');
    fetchData.pingGithubUpdateDB();
}, null, true);



app.get('/', function(req, res) {
  res.send("You're probably looking for /api or for more info about this app see https://github.com/adamlofting/gitribution");
});


app.get('/api', function(req, res) {
  var date = null;
  var team = null;

  if (req.query.date) {
    date = new Date(req.query.date);
    if ( Object.prototype.toString.call(date) === "[object Date]" ) {
      if ( isNaN( date.getTime() ) ) {
        date = null;// date is not valid
      }
    }
    else {
      date = null;
    }
  }

  if (!date) {
    res.end('Invalid parameter: "date". Please format as 2013-12-25.');
    return;
  }

  team = req.query.team;
  if (!team) {
    res.end('Missing parameter: "team". E.g. webmaker, openbadges, opennews, appmaker, sciencelab.');
    return;
  }

  data.getContributorCounts(date, team, function gotCounts (err, result) {
    res.json(result);
  })
});

var port = Number(process.env.PORT || 5000);
app.listen(port, function() {
  console.log("Listening on " + port);
});