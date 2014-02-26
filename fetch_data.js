var async     = require('async');
var data      = require('./lib/data');
var GitHubApi = require("github");
var to_track = require("./to_track");


var github = new GitHubApi({
  version: "3.0.0",
  protocol: "https"
});

github.authenticate({
  type: "basic",
  username: process.env.GITHUB_USERNAME,
  password: process.env.GITHUB_PASSWORD
});



var orgs = to_track.repos["github_organizations"];

// Orgs
for(var i = 0; i < orgs.length; i++) {
  var org = orgs[i];
  var org_name = org.name;
  console.log(org_name);

  // Teams
  var org_teams = org.teams;
  for(var j = 0; j < org_teams.length; j++) {
    var team = org_teams[j];
    console.log("--" + team.name);

    // Repos
    var team_repos = team.repos;
    for (var k = 0; k < team_repos.length; k++) {
      var repo = team_repos[k];
      console.log("----" + repo);
    };
  }
}

console.log("------")

data.saveItem("magic");
data.saveItem("toast");
data.saveItem("pancakes");


// Need to learn node flow control
function done () {
  console.log("hacky exit until I learn node flow control");
  process.exit(0);
}
setTimeout(done, 5000);



