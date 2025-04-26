const dotenv = require('dotenv')
const { App } = require('@slack/bolt')
const axios = require('axios')
const fs = require('fs')

const searchUrl = 'https://www.rightmove.co.uk/property-to-rent/find.html?houseFlatShare=false&keywords=&sortType=6&dontShow=houseShare%2Cretirement%2Cstudent&viewType=LIST&channel=RENT&index=0&maxPrice=1250&radius=0.0&retirement=false&locationIdentifier=USERDEFINEDAREA%5E%7B%22id%22%3A%228353222%22%7D'
const jsonFilePath = './properties.json'
const slackChannelId = 'U57AXTH36'

dotenv.config()

const slack = new App({
	token: process.env.SLACK_BOT_TOKEN,
	signingSecret: process.env.SLACK_SIGNING_SECRET,
})

const fetchProperties = async () => {
	try {
		const response = await axios.get(searchUrl)
		const data = response.data
		const regex = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/
		const match = data.match(regex)

		if (match && match[1]) {
			const jsonData = JSON.parse(match[1])
			const newProperties = jsonData.props.pageProps.searchResults.properties

			// filter out properties that have property.featuredProperty === true
			const filteredProperties = newProperties.filter((property) => !property.featuredProperty)

			// Check if the JSON file exists
			if (fs.existsSync(jsonFilePath)) {
				const storedData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'))
				const storedPropertyIds = new Set(storedData.map((property) => property.id))

				// Find new properties
				const addedProperties = filteredProperties.filter(
					(property) => !storedPropertyIds.has(property.id)
				)

				if (addedProperties.length > 0) {
					const message = `New properties found:\n\n${addedProperties
						.map((property) => {
							const date = new Date(property.letAvailableDate)
							const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`
							return `${property.displayAddress} (${property.price.displayPrices[0].displayPrice})\nAvailable: ${formattedDate}\nhttps://rightmove.co.uk${property.propertyUrl}`
						})
						.join('\n')}`
					
					await publishMessage(slack, slackChannelId, message)
				} else {
					console.log('No new properties found.')
				}
			} else {
				console.log('No existing data found. Saving current properties.')
			}

			// Save the latest properties to the JSON file
			fs.writeFileSync(jsonFilePath, JSON.stringify(filteredProperties, null, 2))
		} else {
			console.error('No match found in the HTML.')
		}
	} catch (error) {
		console.error('Error fetching properties:', error.message)
	}
}

// Post a message to a channel your app is in using ID and message text
async function publishMessage(app, id, text) {
	try {
		const result = await app.client.chat.postMessage({
			token: process.env.SLACK_BOT_TOKEN,
			channel: id,
			text: text
			// You could also use a blocks[] array to send richer content
		})
	} catch (error) {
		console.error(error)
	}
}

(async () => {
	// Start slack app
	await slack.start(process.env.PORT || 3000)

	console.log('⚡️ App is running!')

	// Run the function every 15 minutes
	fetchProperties()
	setInterval(fetchProperties, 15 * 60 * 1000)
})()