var GitHubApi = require('github');
var data      = require('./data.js');
var async     = require('async');
var ADDITIONAL_STAFF_ACCOUNTS = require("../to_track").additional_staff_logins;


/* =================
 MEMBERS
================= */

var getMembersLists = function (orgNames, callback) {

  var membersList = ADDITIONAL_STAFF_ACCOUNTS;

  async.each(orgNames, getMembersList, function gotAllMembers (err){
      if (err) console.log(err);
      callback(null, membersList);
  });

  function getMembersList (orgName, callback) {

    getMembersListForOrg(orgName, function membersListUpdated (err, res) {
      if (err) console.error(err);

      membersList = membersList.concat(res);
      console.log('Fetched members list for ' + orgName);
      callback(null);
    })
  }
}


var getMembersListForOrg = function (githubOrgName, callback) {

  var githubClient = new GitHubApi({ version: '3.0.0', protocol: 'https' });
  githubClient.authenticate({ type: 'basic', username: process.env.GITHUB_USERNAME, password: process.env.GITHUB_PASSWORD });

  var msg = { org: githubOrgName, per_page: 100 };

  // idea for non blocking version

  // create an empty queue
  // then waterfall
  // 1) while next page, get members and add to queue
  // 2) once queue is empty call back

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



var updateContributionActivityForList = function (repos, membersLists, since, callback) {

  async.each(repos, updateRepoActivity, function allUpdated (err){
      if (err) console.log(err);
      callback(null);
  });

  function updateRepoActivity (r, callback) {

    async.parallel([
        function(callback){

          // Commit activity
          updateCommitActivity(r.githubOrgName, r.mozTeamName, r.githubRepoName, membersLists, since, function commitListUpdated (err, res) {
            callback(null);
          })

        },
        function(callback){

          // Issues activity
          updateIssueActivity(r.githubOrgName, r.mozTeamName, r.githubRepoName, membersLists, since, function issueListUpdated (err, res) {
            callback(null);
          })

        }
    ],
    function(err, results){
      if (err) console.error(err);
      callback(null);
    });

  }
}


/* =================
 COMMITS
================= */

var updateCommitActivity = function (githubOrgName, mozTeamName, githubRepoName, allMembersList, since, callback) {

  var githubClient = new GitHubApi({ version: '3.0.0', protocol: 'https' });
  githubClient.authenticate({ type: 'basic', username: process.env.GITHUB_USERNAME, password: process.env.GITHUB_PASSWORD });

  var msg = { user: githubOrgName, repo: githubRepoName, per_page: 100 };
  if (since) msg.since = since.toISOString(); // otherwise fetch ALL the things

  githubClient.repos.getCommits(msg, function (err, res) {

    if (err) console.error(err);

    processBatchOfCommits(err, res, githubOrgName, mozTeamName, githubRepoName, allMembersList, githubClient, function processedCommits (err, res) {
      console.log('== All commits stored for ' + githubOrgName + ' ' + mozTeamName + ' ' + githubRepoName);
      callback(null);
    });

  });
}

function processBatchOfCommits (err, res, githubOrgName, mozTeamName, githubRepoName, allMembersList, githubClient, callback) {

  var activities = res;
  saveCommits(githubOrgName, mozTeamName, githubRepoName, allMembersList, activities, function commitsSaved (err) {

    if (err) console.error(err);

    // Recursively check if there is a next page
    if(githubClient.hasNextPage(res)) {
      githubClient.getNextPage(res, function gotNextPage (err, res) {

        if (err) console.error(err);
        else processBatchOfCommits(err, res, githubOrgName, mozTeamName, githubRepoName, allMembersList, githubClient, callback);

      });
    } else {
      callback(null); // we've been through them all
    }
  })
}

var saveCommits = function (githubOrgName, mozTeamName, githubRepoName, allMembersList, activities, callback) {

  var keys = [];
  if (typeof activities === 'object') keys = Object.keys(activities); // get the keys to determine length of JSON
  else console.warn('ERROR getting COMMITS for: ', githubOrgName, '/', githubRepoName);

  async.each(keys, saveActivity, function allSaved (err){
    if (err) console.log(err);
    // console.log('Saved batch for', mozTeamName, githubOrgName, githubRepoName);
    callback(null);
  });

  function saveActivity (key, callback) {

    // Basic checking that fields exist
    var a = null;
    // 1) The commit author
    var authorLogin = 'NOT_RECORDED';
    var authorDate = null;
    var authorEmail = null;
    var authorIsStaff = 0; // false
    // 2) The commit committer
    var committerLogin = 'NOT_RECORDED';;
    var committerDate = null;
    var committerEmail = null;
    var committerIsStaff = 0; // false

    if (activities[key]) {
      a = activities[key];

      // Author
      if (a.author && a.author.login) {
        authorLogin = a.author.login;
      }

      if (allMembersList.indexOf(authorLogin) >= 0) {
        authorIsStaff = 1;
      }

      if (a.commit && a.commit.author && a.commit.author.date){
        authorDate = a.commit.author.date;
      }

      if (a.commit && a.commit.author && a.commit.author.email){
        authorEmail = a.commit.author.email;
      }

      // Committer
      if (a.committer && a.committer.login){
        committerLogin = a.committer.login;
      }

      if (allMembersList.indexOf(committerLogin) >= 0) {
        committerIsStaff = 1;
      }

      if (a.commit && a.commit.committer && a.commit.committer.date) {
        committerDate = a.commit.committer.date;
      }

      if (a.commit && a.commit.committer && a.commit.committer.email) {
        committerEmail = a.commit.committer.email;
      }
    }

    if (authorDate && committerDate) {
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
      function(err, results){
        if (err) console.error(err);
        callback(null);
      });
    } else {
      callback(null); // for meta items in the JSON
    }
  }
}



/* =================
 ISSUES
================= */

var updateIssueActivity = function (githubOrgName, mozTeamName, githubRepoName, allMembersList, since, callback) {

  var githubClient = new GitHubApi({ version: '3.0.0', protocol: 'https' });
  githubClient.authenticate({ type: 'basic', username: process.env.GITHUB_USERNAME, password: process.env.GITHUB_PASSWORD });

  var msg = { user: githubOrgName, repo: githubRepoName, per_page: 100 };
  if (since) msg.since = since.toISOString(); // otherwise fetch ALL the things

  githubClient.issues.repoIssues(msg, function (err, res) {

    if (err) console.error(err);

    processBatchOfIssues(err, res, githubOrgName, mozTeamName, githubRepoName, allMembersList, githubClient, function processedIssues (err, res) {
      console.log('== All issues stored for ' + githubOrgName + ' ' + mozTeamName + ' ' + githubRepoName);
      callback(null);
    });

  });
}

function processBatchOfIssues (err, res, githubOrgName, mozTeamName, githubRepoName, allMembersList, githubClient, callback) {

  var issues = res;

  saveIssues(githubOrgName, mozTeamName, githubRepoName, allMembersList,issues, function issuesSaved (err) {

    if (err) console.error(err);

    // Recursively check if there is a next page
    if(githubClient.hasNextPage(res)) {
      githubClient.getNextPage(res, function gotNextPage (err, res) {

        if (err) console.error(err);
        else processBatchOfIssues(err, res, githubOrgName, mozTeamName, githubRepoName, allMembersList, githubClient, callback);

      });
    } else {
      callback(null); // we've been through them all
    }
  })
}

var saveIssues = function (githubOrgName, mozTeamName, githubRepoName, allMembersList, issues, callback) {

  var keys = [];
  if (typeof issues === 'object') keys = Object.keys(issues); // get the keys to determine length of JSON
  else console.warn('ERROR getting ISSUES for: ' + githubOrgName + '/' + githubRepoName);

  async.each(keys, saveActivity, function allSaved (err){
    if (err) console.log(err);
    // console.log('Saved issue batch for', mozTeamName, githubOrgName, githubRepoName);
    callback(null);
  });

  function saveActivity (key, callback) {
    var issue = null;
    var issueLogin = 'NOT_RECORDED';;
    var issueDate = null;
    var issueEmail = null; // could later use API to get public email linked to an account
    var isStaff = 0; //false

    if (issues[key]) {
      issue = issues[key];

      if (issue.created_at) {
        issueDate = issue.created_at;
      }

      if (issue.user && issue.user.login) {
          issueLogin = issue.user.login;
      }

      if (allMembersList.indexOf(issueLogin) >= 0) {
        isStaff = 1;
      }
    }

    if (issueDate) {
      data.saveItem(issueDate, githubOrgName, githubRepoName, issueLogin, issueEmail, 'open-an-issue', mozTeamName, isStaff,
        function itemSaved (err, res) {
          callback(null);
        }
      );
    } else {
      callback(null);
    }
  }
}

module.exports = {
  getMembersLists: getMembersLists,
  updateCommitActivity: updateCommitActivity,
  updateContributionActivityForList: updateContributionActivityForList
}

