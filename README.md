gitribution
===========

Extracts data from the Github API and allows it to be queried for particular contribution activities

Looks at the people (github logins) involved in:
* commits
* issues

This app uses membership of the github organisations to flag staff, plus a list of extra github logins in to_track.js. This is not 100% accurate, but a pretty good indicator of who is staff.

## Prerequisites:

* node
* heroku toolbelt
* mysql db

## Setup an activities table in mysql
See script in sql/create_table.sql

## Environment Config

For local dev, copy sample.env to .env and add credentials
Set equivilent environment variables on Heroku

## Tracking Config
```
to_track.js
```

## Running the app:

```
foreman start
```

## Clear and rebuild the database

Run this script to clear and rebuild the database (useful if we change repo names or move around org accounts etc...)

```
foreman run node reset
```