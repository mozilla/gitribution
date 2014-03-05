// a module to wrap up functions for saving to the DB
var mysql      = require('mysql');

var connectionOptions = {
  host     : process.env.DB_HOST,
  user     : process.env.DB_USER,
  password : process.env.DB_PASSWORD,
  database : process.env.DB_NAME,
  port     : process.env.DB_PORT
}

if (process.env.DB_SSL) {
  // SSL is used for Amazon RDS, but not necessarily for local dev
  connectionOptions.ssl = process.env.DB_SSL;
}

var pool = mysql.createPool(connectionOptions);


/*
* RESET THE DATABASE
* Allows the DB to be rebuilt from scratch if we move around our repos to other github Org names, for example
*/
exports.resetDatabaseYesIreallyWantToDoThis = function resetDatabaseYesIreallyWantToDoThis(callback) {

  pool.getConnection(function connectionAttempted (err, connection) {

    if (err) console.log(err);
    else {
      connection.query('TRUNCATE activities', function queryComplete (err, result) {

        if(err) console.log(err);

        connection.release();
        callback(err);

      });
    }
  });
}


/*
* CONTRIBUTION ACTION
*/
exports.saveItem = function saveItem(happenedOn, githubOrgName, githubRepo, githubLogin, githubPublicEmail, actionType, mozTeamName, isStaff, callback) {

  pool.getConnection(function(err, connection) {

    if (err) {
      console.error(err);
      callback(err);

    } else {

      var activity = {
        happened_on : new Date(happenedOn),
        github_organization : githubOrgName,
        github_repository : githubRepo,
        github_username : githubLogin,
        github_public_email : githubPublicEmail,
        action_type : actionType,
        mozilla_team : mozTeamName,
        is_staff : isStaff
      }

      // Using REPLACE INTO to avoid worrying about duplicate entries for activities
      // There is a unique key set across all the fields
      connection.query('REPLACE INTO activities SET ?', activity, function(err, result) {
        if(err) {
          console.error(err);
          callback(err);
        } else {
          // console.log('saved activity');
          // console.log(activity);
        }
        connection.release();
        callback(null);
      });
    }
  });
};
