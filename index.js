const newman = require('newman')
const core = require('@actions/core')
const axios = require('axios').default
const { argv } = require('yargs')
const { isGuid } = require('check-guid')

log = message => {
	console.log(`-- postboy :: ${message}`)
}

getCollections = async (apiUrl, apiKey) => {
	const response = await axios.get(`${apiUrl}/collections?apikey=${apiKey}`)
	return response && response.data && response.data.collections
}	

getEnvironments = async (apiUrl, apiKey) => {
	const response = await axios.get(`${apiUrl}/environments?apikey=${apiKey}`)
	return response && response.data && response.data.environments
}	

getCollectionId = async (apiUrl, apiKey, criteria) => {
	if (isGuid(criteria))
		return Promise.resolve(criteria)

	const collection = (await getCollections(apiUrl, apiKey)).filter(c => c.name == criteria)[0]
	if (collection) {
		return collection.id
	}
	throw new Error(`Unable to find the collection identified by ${criteria}`)
}

getEnvironmentId = async (apiUrl, apiKey, criteria) => {
	if (isGuid(criteria))
		return Promise.resolve(criteria)

	const environment = (await getEnvironments(apiUrl, apiKey)).filter(c => c.name == criteria)[0]
	if (environment) {
		return environment.id
	}
	throw new Error(`Unable to find the environment identified by ${criteria}`)
}


(async () => {

	try {
		log("Starting newboy action")
		
		const postmanApiUrl = 'https://api.getpostman.com'
		const environment = core.getInput('environment') || argv.environment
		const collection = core.getInput('collection') || argv.collection
		const apiKey = core.getInput('apiKey') || argv.apiKey
		
		const collectionId = await getCollectionId(postmanApiUrl, apiKey, collection)
		const environmentId = await getEnvironmentId(postmanApiUrl, apiKey, environment)
		
		log(`Collection id : ${collectionId}`)
		log(`Environment id : ${environmentId}`)

		const options = {
			apiKey: `?apikey=${apiKey}`,
			collection: `${postmanApiUrl}/collections/${collectionId}?apikey=${apiKey}`,
			environment: `${postmanApiUrl}/environments/${environmentId}?apikey=${apiKey}`,
			reporters: 'cli',
		}
		
		newman.run(options).on('done', (e, summary) => {
			if (e || summary.run.failures.length) {
				core.setFailed('Newman run failed!' + (e || ''))
			}
		})
	}
	catch(e) {
		log(`Exception : ${e.message}`)
		core.setFailed(e.message)
	}
})();
