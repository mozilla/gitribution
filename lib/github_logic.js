var GitHubApi = require('github');
var data      = require('./data.js');
var async     = require('async');


/* =================
 MEMBERS
================= */

var getMembersLists = function (orgNames, callback) {

  var membersList = {};

  (function iterator (i) {

    if (i == orgNames.length) {
      callback(null, membersList);
      return;
    }

    var orgName = orgNames[i];
    getMembersListForOrg(orgName, function membersListUpdated (err, res) {

      if (err) console.error(err);

      membersList[orgName] = res;
      console.log('Fetched members list for ' + orgName);

      iterator(i + 1);
    })

  })(0);
}

var getMembersListForOrg = function (githubOrgName, callback) {

  var githubClient = new GitHubApi({ version: '3.0.0', protocol: 'https' });
  githubClient.authenticate({ type: 'basic', username: process.env.GITHUB_USERNAME, password: process.env.GITHUB_PASSWORD });

  var msg = { org: githubOrgName, per_page: 100 };

  githubClient.orgs.getMembers(msg, function (err, res) {

    if (err) console.error(err);

    var members = [];
    getBatchOfMembers(res, githubClient, members, function gotBatch (err, res) {
      callback(null, res);
    });
  });
}

function getBatchOfMembers (res, githubClient, members, callback) {

  extractMembersFromBatch(res, members, function membersSaved (err, res_gh, members) {

    if (err) console.error(err);

    // Recursively check if there is a next page
    if(githubClient.hasNextPage(res_gh)) {

      githubClient.getNextPage(res, function (err, res) {

        if (err) console.error(err);
        else getBatchOfMembers(res, githubClient, members, callback);

      });
    } else {
      // we've been through them all
      callback(null, members);
    }
  })
}


var extractMembersFromBatch = function (res, members, callback) {

  var keys = [];
  if (typeof res === 'object') keys = Object.keys(res); // get the keys to determine length of JSON
  else console.warn('ERROR getting MEMBERS.');

  (function iterator (i) {

    if (i == keys.length) {
      callback(null, res, members);
      return;
    }

    // Basic checking that fields exist
    var login = null;
    if(res[i]) {
      if (res[i].login) {
        members.push(res[i].login);
      }
    }

    iterator(i + 1);

  })(0);
}


/* =================
 ALL CONTRIBUTION
================= */

var updateContributionActivityForList = function (repos, membersLists, callback) {

  (function iterator (i) {

    if (i == repos.length) {
      callback(null);
      return;
    }

    var r = repos[i];
    var orgMembersList = membersLists[r.githubOrgName];

    // two activities to save in parallel
    async.parallel([
        function(callback){

          // Commit activity
          updateCommitActivity(r.githubOrgName, r.mozTeamName, r.githubRepoName, orgMembersList, function commitListUpdated (err, res) {
            callback(null);
          })

        },
        function(callback){

          // Issues activity
          updateIssueActivity(r.githubOrgName, r.mozTeamName, r.githubRepoName, orgMembersList, function issueListUpdated (err, res) {
            callback(null);
          })

        }
    ],
    function(err, results){
      if (err) console.error(err);
      iterator(i + 1);
    });
  })(0);
}


/* =================
 COMMITS
================= */

var updateCommitActivity = function (githubOrgName, mozTeamName, githubRepoName, orgMembersList, callback) {

  var githubClient = new GitHubApi({ version: '3.0.0', protocol: 'https' });
  githubClient.authenticate({ type: 'basic', username: process.env.GITHUB_USERNAME, password: process.env.GITHUB_PASSWORD });

  var msg = { user: githubOrgName, repo: githubRepoName, per_page: 100 };
  githubClient.repos.getCommits(msg, function (err, res) {

    if (err) console.error(err);

    processBatchOfCommits(err, res, githubOrgName, mozTeamName, githubRepoName, orgMembersList, githubClient, function processedCommits (err, res) {
      console.log('== All commits stored for ' + githubOrgName + ' ' + mozTeamName + ' ' + githubRepoName);
      callback(null);
    });

  });
}

function processBatchOfCommits (err, res, githubOrgName, mozTeamName, githubRepoName, orgMembersList, githubClient, callback) {

  var activities = res;
  saveCommits(githubOrgName, mozTeamName, githubRepoName, orgMembersList, activities, function commitsSaved (err) {

    if (err) console.error(err);

    // Recursively check if there is a next page
    if(githubClient.hasNextPage(res)) {
      githubClient.getNextPage(res, function gotNextPage (err, res) {

        if (err) console.error(err);
        else processBatchOfCommits(err, res, githubOrgName, mozTeamName, githubRepoName, orgMembersList, githubClient, callback);

      });
    } else {
      callback(null); // we've been through them all
    }
  })
}

var saveCommits = function (githubOrgName, mozTeamName, githubRepoName, orgMembersList, activities, callback) {

  var keys = [];
  if (typeof activities === 'object') keys = Object.keys(activities); // get the keys to determine length of JSON
  else console.warn('ERROR getting COMMITS for: ' + githubOrgName + '/' + githubRepoName);

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
    var authorIsStaff = false;
    // 2) The commit committer
    var committerLogin = null;
    var committerDate = null;
    var committerEmail = null;
    var committerIsStaff = false;

    if (activities[i]) {
      a = activities[i];

      // Author
      if (a.author)
        if (a.author.login)
          authorLogin = a.author.login;

      if (orgMembersList.indexOf(authorLogin) >= 0) {
        authorIsStaff = true;
      }

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

      if (orgMembersList.indexOf(committerLogin) >= 0) {
        committerIsStaff = true;
      }

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

              data.saveItem(authorDate, githubOrgName, githubRepoName, authorLogin, authorEmail, 'commit-author', mozTeamName, authorIsStaff,
                function itemSaved (err, res) {
                  // console.log('saved author: ' + authorDate + ' ' + authorLogin);
                  callback(null);
                }
              );

          },
          function(callback){

              data.saveItem(committerDate, githubOrgName, githubRepoName, committerLogin, committerEmail, 'commit-commiter', mozTeamName, committerIsStaff,
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



/* =================
 ISSUES
================= */

var updateIssueActivity = function (githubOrgName, mozTeamName, githubRepoName, orgMembersList, callback) {

  var githubClient = new GitHubApi({ version: '3.0.0', protocol: 'https' });
  githubClient.authenticate({ type: 'basic', username: process.env.GITHUB_USERNAME, password: process.env.GITHUB_PASSWORD });

  var msg = { user: githubOrgName, repo: githubRepoName, per_page: 100 };
  githubClient.issues.repoIssues(msg, function (err, res) {

    if (err) console.error(err);

    processBatchOfIssues(err, res, githubOrgName, mozTeamName, githubRepoName, orgMembersList, githubClient, function processedIssues (err, res) {
      console.log('== All issues stored for ' + githubOrgName + ' ' + mozTeamName + ' ' + githubRepoName);
      callback(null);
    });

  });
}

function processBatchOfIssues (err, res, githubOrgName, mozTeamName, githubRepoName, orgMembersList, githubClient, callback) {

  var issues = res;

  saveIssues(githubOrgName, mozTeamName, githubRepoName, orgMembersList,issues, function issuesSaved (err) {

    if (err) console.error(err);

    // Recursively check if there is a next page
    if(githubClient.hasNextPage(res)) {
      githubClient.getNextPage(res, function gotNextPage (err, res) {

        if (err) console.error(err);
        else processBatchOfIssues(err, res, githubOrgName, mozTeamName, githubRepoName, orgMembersList, githubClient, callback);

      });
    } else {
      callback(null); // we've been through them all
    }
  })
}

var saveIssues = function (githubOrgName, mozTeamName, githubRepoName, orgMembersList, issues, callback) {

  var keys = [];
  if (typeof issues === 'object') keys = Object.keys(issues); // get the keys to determine length of JSON
  else console.warn('ERROR getting ISSUES for: ' + githubOrgName + '/' + githubRepoName);

  (function iterator (i) {

    if (i == keys.length) {
      callback(null);
      return;
    }

    var issue = null;
    var issueLogin = null;
    var issueDate = null;
    var issueEmail = null; // could later use API to get public email linked to an account
    var isStaff = false;

    if (issues[i]) {
      issue = issues[i];

      if (issue.created_at)
        issueDate = issue.created_at;

      if (issue.user)
        if (issue.user.login)
          issueLogin = issue.user.login;

      if (orgMembersList.indexOf(issueLogin) >= 0) {
        isStaff = true;
      }
    }

    if (issue) {

      data.saveItem(issueDate, githubOrgName, githubRepoName, issueLogin, issueEmail, 'open-an-issue', mozTeamName, isStaff,
        function itemSaved (err, res) {
          // console.log('saved issue: ' + issueDate + ' ' + issueLogin);
          iterator(i + 1);
        }
      );

    } else {
      iterator(i + 1); // iterate anyway (expecting irrelevant fields in the JSON)
    }
  })(0);
}

module.exports = {
  getMembersLists: getMembersLists,
  updateCommitActivity: updateCommitActivity,
  updateContributionActivityForList: updateContributionActivityForList
}

