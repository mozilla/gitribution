var GitHubApi = require('github');
var data      = require('./data.js');
var async     = require('async');


/* -------------------------
 MEMBERS
------------------------- */

// Update multiple organizations list of members
var updateMembersLists = function (orgNames, callback) {
  (function iterator (i) {
    if (i == orgNames.length) {
      callback(null);
      return;
    }

    updateMembersList(orgNames[i], function membersListUpdated (err, res) {
      if (err) console.error(err);

      console.log('Updated members list for ' + orgNames[i]);
      iterator(i + 1);
    })

  })(0);
}


// Update a single organizations list of members
var updateMembersList = function (githubOrgName, callback) {

  // Connect to Github API
  var githubClient = new GitHubApi({ version: '3.0.0', protocol: 'https' });
  githubClient.authenticate({ type: 'basic', username: process.env.GITHUB_USERNAME, password: process.env.GITHUB_PASSWORD });

  var msg = { org: githubOrgName, per_page: 100 };

  githubClient.orgs.getMembers(msg, function (err, res) {
    if (err) console.error(err);

    processBatchOfMembers(res, githubOrgName, githubClient, function processedBatch (err) {
      //console.log('== Processed all batches for ' + githubOrgName);
      if (callback) callback(null);
    });
  });
}


// Process a batch of members returned from an API query
// the recursively paginate the rest of the data
function processBatchOfMembers (res, githubOrgName, githubClient, callback) {
  var members = res;
  saveMembers(githubOrgName, members, function membersSaved (err) {
    if (err) console.error(err);
    // console.log('Batch saved for ' + githubOrgName);

    // Recursively check if there is a next page
    if(githubClient.hasNextPage(res)) {
      githubClient.getNextPage(res, function (err, res) {
        if (err) console.error(err);
        else {
          processBatchOfMembers(res, githubOrgName, githubClient, callback);
        }
      });
    } else {
      // we've been through them all, so callback
      if (callback) callback(null);
    }
  })

}

var saveMembers = function (githubOrgName, members, callback) {
  // get the keys to determine length of JSON
  var keys = Object.keys(members);
  (function iterator (i) {
    if (i == keys.length) {
      callback(null);
      return;
    }

    // Basic checking that fields exist
    var login = null;
    if(members[i]) {
      if (members[i].login) {
        login = members[i].login;
      }
    }

    if (login) {
      data.saveMember(githubOrgName, members[i].login, function memberSaved (err, res) {
        if (err) console.error(err);
        // console.log('Saved member ' + members[i].login);
        iterator(i + 1);
      });
    } else {
      // iterate anyway
      iterator(i + 1);
    }
  })(0);
}






/* -------------------------
 COMMITS
------------------------- */


// Update multiple organizations list of members
var updateContributionActivityForList = function (repos, callback) {
  (function iterator (i) {
    if (i == repos.length) {
      callback(null);
      return;
    }

    var r = repos[i];

    // two activities to save in parallel
    async.parallel([
        function(callback){
          // Commit activity
          updateCommitActivity(r.githubOrgName, r.mozTeamName, r.githubRepoName, function activityListUpdated (err, res) {
            callback(null);
          })
        },
        function(callback){
          // Issues activity
          // updateCommitActivity(r.githubOrgName, r.mozTeamName, r.githubRepoName, function activityListUpdated (err, res) {
          //   callback(null);
          // })

          callback(null);
        }
    ],
    function(err, results){
      if (err) console.error(err);
      iterator(i + 1);
    });
  })(0);
}


// Process a batch of members returned from an API query
// the recursively paginate the rest of the data
function processBatchOfCommits (err, res, githubOrgName, mozTeamName, githubRepoName, githubClient, callback) {
  var activities = res;
  saveActivities(githubOrgName, mozTeamName, githubRepoName, activities, function activitiesSaved (err) {
    if (err) console.error(err);

    // Recursively check if there is a next page
    if(githubClient.hasNextPage(res)) {
      githubClient.getNextPage(res, function (err, res) {
        if (err) console.error(err);
        else {
          processBatchOfCommits(err, res, githubOrgName, mozTeamName, githubRepoName, githubClient, callback);
        }
      });
    } else {
      // we've been through them all, so callback
      if (callback) callback(null);
    }
  })
}


var saveActivities = function (githubOrgName, mozTeamName, githubRepoName, activities, callback) {
  // get the keys to determine length of JSON
  var keys = Object.keys(activities);
  (function iterator (i) {
    if (i == keys.length) {
      callback(null);
      return;
    }

    // Basic checking that fields exist
    var a = null;
    // 1) The commit author
    var authorLogin = null;
    var authorDate = null;
    var authorEmail = null;
    // 2) The commit committer
    var committerLogin = null;
    var committerDate = null;
    var committerEmail = null;

    if (activities[i]) {
      a = activities[i];

      // Author
      if (a.author)
        if (a.author.login)
          authorLogin = a.author.login;

      if (a.commit)
        if (a.commit.author)
          if (a.commit.author.date)
            authorDate = a.commit.author.date;

      if (a.commit)
        if (a.commit.author)
          if (a.commit.author.email)
            authorEmail = a.commit.author.email;

      // Committer
      if (a.committer)
        if (a.committer.login)
          committerLogin = a.committer.login;

      if (a.commit)
        if (a.commit.committer)
          if (a.commit.committer.date)
            committerDate = a.commit.committer.date;

      if (a.commit)
        if (a.commit.committer)
          if (a.commit.committer.email)
            committerEmail = a.commit.committer.email;
    }

    if (a) {
      // two activities to save in parallel
      async.parallel([
          function(callback){
              data.saveItem(authorDate, githubOrgName, githubRepoName, authorLogin, authorEmail, 'commit-author', mozTeamName,
                function itemSaved (err, res) {
                  // console.log('saved author: ' + authorDate + ' ' + authorLogin);
                  callback(null);
                }
              );
          },
          function(callback){
              data.saveItem(committerDate, githubOrgName, githubRepoName, committerLogin, committerEmail, 'commit-commiter', mozTeamName,
                function itemSaved (err, res) {
                  // console.log('saved commiter: ' + committerDate + ' ' + committerLogin);
                  callback(null);
                }
              );
          }
      ],
      // optional callback
      function(err, results){
        if (err) console.error(err);
        // iterate next
        iterator(i + 1);
      });


    } else {
      // iterate anyway (might be an irrelevant field in the JSON)
      iterator(i + 1);
    }
  })(0);
}


// log 'members' of the github organization
var updateCommitActivity = function (githubOrgName, mozTeamName, githubRepoName, callback) {
  // Connect to Github API
  var githubClient = new GitHubApi({ version: '3.0.0', protocol: 'https' });
  githubClient.authenticate({ type: 'basic', username: process.env.GITHUB_USERNAME, password: process.env.GITHUB_PASSWORD });

  var msg = { user: githubOrgName, repo: githubRepoName, per_page: 100 };
  githubClient.repos.getCommits(msg, function (err, res) {
    if (err) console.error(err);
    processBatchOfCommits(err, res, githubOrgName, mozTeamName, githubRepoName, githubClient, function processedCommits (err, res) {
      console.log('== All commits stored for ' + githubOrgName + ' ' + mozTeamName + ' ' + githubRepoName);
      callback(null);
    });
  });
}



module.exports = {
  updateMembersList: updateMembersList,
  updateMembersLists: updateMembersLists,
  updateCommitActivity: updateCommitActivity,
  updateContributionActivityForList: updateContributionActivityForList
}

