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


exports.saveItem = function saveItem(s) {
  pool.getConnection(function(err, connection) {
    if (err) {
      console.error("Error connecting to database");
      console.log(err);
    } else {

      var activity = {
        happened_on : new Date(2014,01,01),
        github_organization : 'mozilla',
        github_repository : 'dummy.repo',
        github_username : 'awesomegal',
        github_public_email : 'meh@what.com',
        action_type : s,
        mozilla_team : 'webmaker',
        is_staff : true
      }

      // Using REPLACE INTO to save worrying about duplicate entries for activities
      // There is a unique key set across all the fields
      var query = connection.query('REPLACE INTO activities SET ?', activity, function(err, result) {
        if(err) {
          console.error("Error saving to database");
          console.log(err);
        } else {
          console.log("saved activity");
          console.log(s);
        }
      });

      connection.release();
    }
  });
};

