gitribution
===========

Extracts data from the Github API and allows it to be queried for particular contribution activities

Looks at the people (github logins) involved in:
* commits
* issues
* pull-requests

Uses membership of the github organisations to flag staff. Not 100% accurate, but pretty good coverage.

Prerequisites:

* node
* heroku toolbelt
* mysql db

Setup an activities table in mysql
* script TBC

Running the app:

To start the site:
foreman start web

To run the script to fetch the latest data
foreman start fetch