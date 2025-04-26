const axios = require('axios');
const fs = require('fs');

const searchUrl = 'https://www.rightmove.co.uk/property-to-rent/find.html?houseFlatShare=false&keywords=&sortType=6&dontShow=houseShare%2Cretirement%2Cstudent&viewType=LIST&channel=RENT&index=0&maxPrice=1250&radius=0.0&retirement=false&locationIdentifier=USERDEFINEDAREA%5E%7B%22id%22%3A%228353222%22%7D';
const jsonFilePath = './properties.json';

const fetchProperties = async () => {
    try {
        const response = await axios.get(searchUrl);
        const data = response.data;
        const regex = /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/;
        const match = data.match(regex);

        if (match && match[1]) {
            const jsonData = JSON.parse(match[1]);
            const newProperties = jsonData.props.pageProps.searchResults.properties;

            // Check if the JSON file exists
            if (fs.existsSync(jsonFilePath)) {
                const storedData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8'));
                const storedPropertyIds = new Set(storedData.map((property) => property.id));

                // Find new properties
                const addedProperties = newProperties.filter(
                    (property) => !storedPropertyIds.has(property.id)
                );

                if (addedProperties.length > 0) {
                    console.log('New properties found:', addedProperties);
                } else {
                    console.log('No new properties found.');
                }
            } else {
                console.log('No existing data found. Saving current properties.');
            }

            // Save the latest properties to the JSON file
            fs.writeFileSync(jsonFilePath, JSON.stringify(newProperties, null, 2));
        } else {
            console.error('No match found in the HTML.');
        }
    } catch (error) {
        console.error('Error fetching properties:', error.message);
    }
};

// Run the function every 15 minutes
fetchProperties();
setInterval(fetchProperties, 15 * 60 * 1000);
