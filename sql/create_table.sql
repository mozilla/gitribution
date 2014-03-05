CREATE TABLE `activities` (
  `happened_on` datetime NOT NULL,
  `github_organization` varchar(255) DEFAULT NULL,
  `github_repository` varchar(255) DEFAULT NULL,
  `github_username` varchar(255) DEFAULT NULL,
  `github_public_email` varchar(255) DEFAULT NULL,
  `action_type` varchar(255) DEFAULT NULL,
  `mozilla_team` varchar(255) DEFAULT NULL,
  `is_staff` bit(1) NOT NULL DEFAULT b'0',
  UNIQUE KEY `happened_on` (`happened_on`,`github_organization`,`github_repository`,`github_username`,`action_type`,`mozilla_team`,`is_staff`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
