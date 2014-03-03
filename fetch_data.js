var async       = require('async');
var toTrack     = require("./to_track");
var data        = require("./lib/data");
var githubLogic = require("./lib/github_logic");
var async       = require('async');


// Get our JSON config file
var orgs = toTrack.repos['github_organizations'];


// Just using this while testing things
data.resetDatabaseYesIreallyWantToDoThis(function resetAttempted () {
  console.log('Reset Complete');

  fetchAllTheData(orgs, function allDataFetched () {
    console.log('All data fetched');
  });
});


function fetchAllTheData (orgs, callback) {
  // Iterate through the list of repos we care about

  var orgNames = []
  var repos = []

  // Synchronously sort this for querying
  // Github Organisations
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
      };
    }
  }

  // two activities to save in parallel
  async.parallel([
      function(callback){
        // Members activity
        githubLogic.updateMembersLists(orgNames, function membersUpdated (err) {
          if (err) console.error(err);
          else console.log("All organization member lists updated");
          callback(null);
        })
      },
      function(callback){
        // Commit activity
        githubLogic.updateContributionActivityForList(repos, function contributionsUpdated (err, res) {
          if (err) console.error(err);
          else console.log("All contribution activity updated");
          callback(null);
        })
      }
  ],
  function(err, results){
    if (err) console.error(err);
    console.log('Finished fetching data. Yay.');
  });

}







