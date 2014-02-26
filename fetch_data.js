var mysql      = require('mysql');

var connectionOptions = {
      host     : process.env.DB_HOST,
      user     : process.env.DB_USER,
      password : process.env.DB_PASSWORD,
      port     : process.env.DB_PORT
  }

// SSL is used for Amazon RDS, but not necessarily for local dev
if (process.env.DB_SSL) {
  connectionOptions.ssl = process.env.DB_SSL;
}

var connection = mysql.createConnection(connectionOptions);

connection.connect(function(err) {
  if (err) {
    console.error("Error connecting to database");
    console.log(err);
    process.exit(1); // 1 = failure
  } else {
    console.info("Connected to database");
    process.exit(0);  // 0 = success
  }

});

