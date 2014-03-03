exports.repos = {
	"github_organizations": [
		{
			"name" : "mozilla", // as appears in github url
				"teams" : [
					{
						"name" : "webmaker", // internal reference for reporting
						"repos" : [ // alphabetical keeps this easier to read
							'login.webmaker.org',
							'webmaker.org'
						]
					},
					{
						"name" : "openbadges",
						"repos" : [
							'badgekit-issue'
						]
					}
				]
		},
		{
			"name" : "openNews",
				"teams" : [
					{
						"name" : "OpenNews",
						"repos" : [
							'dataset',
							'NewsYourOwnAdventure'
						]
					}
			]
		}
	]
}