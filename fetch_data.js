var async       = require('async');
var toTrack     = require("./to_track");
var data        = require("./lib/data");
var githubLogic = require("./lib/github_logic");


// Get our JSON config file
var orgs = toTrack.repos.github_organizations;

exports.pingGithubUpdateDB = function pingGithubUpdateDB () {
  var since = new Date();
  // commit activity by date may get added to github later
  // so this allows some overlap to catch new contributions
  since.setDate(since.getDate() - 5);

  fetchAllTheData(orgs, since, function allDataFetched () {
    console.log('== ## == Fetched Latest Numbers');
    process.exit(0);
  });
};

exports.clearAndRebuildDB = function clearAndRebuildDB () {
  console.time('reset');
  data.resetDatabaseYesIreallyWantToDoThis(function resetAttempted () {
    console.log('Database Reset Complete');

    fetchAllTheData(orgs, null, function allDataFetched () {
      console.timeEnd('reset');
      process.exit(0);
    });
  });
};


function fetchAllTheData (orgs, since, callback) {

  // Iterate through the list of repos we care about
  var orgNames = [];
  var repos = [];

  for(var i = 0; i < orgs.length; i++) {

    var org = orgs[i];
    var githubOrgName = org.name;
    orgNames.push(githubOrgName);

    // Mozilla Team Names
    var orgTeams = org.teams;
    for(var j = 0; j < orgTeams.length; j++) {

      var team = orgTeams[j];
      var mozTeamName = team.name;

      // Repos within each team
      var teamRepos = team.repos;
      for (var k = 0; k < teamRepos.length; k++) {

        var githubRepoName = teamRepos[k];

        repos.push({
          githubOrgName: githubOrgName,
          mozTeamName: mozTeamName,
          githubRepoName: githubRepoName
        });
      }
    }
  }

  async.waterfall([
      function(callback){

        // Members activity
        githubLogic.getMembersLists(orgNames, function membersUpdated (err, res) {
          if (err) console.error(err);
          else console.log("Membership lists fetched for all organizations.");
          callback(null, res);
        });

      },
      function(res, callback){

        var membersList = res;
        console.log(membersList.length);

        // Commit activity
        githubLogic.updateContributionActivityForList(repos, membersList, since, function contributionsUpdated (err, res) {
          if (err) console.error(err);
          else console.log("All contribution activity updated");
          callback(null);
        });

      }
  ],
  function(err, results){
    if (err) console.error(err);
    console.log('Finished fetching data. Yay.');
    callback();
  });

}







