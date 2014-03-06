gitribution
===========

Extracts data from the Github API and allows it to be queried for particular contribution activities

Looks at the people (github logins) involved in:
* commits
* issues

This app uses membership of the github organisations to flag staff. This is not 100% accurate, but a pretty good measure.

## Prerequisites:

* node
* heroku toolbelt
* mysql db

## Setup an activities table in mysql
See script in sql/create_table.sql

## Config 

For local dev, copy sample.env to .env and add credentials
Set equivilent environment variables on Heroku

## Running the app:

```
foreman start web
```

## Clear and rebuild the database

Run this script to clear and rebuild the database (useful if we change repo names or move around org accounts etc...)

```
heroku run bash
$ node reset.js
$ exit
```