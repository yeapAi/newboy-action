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
	return response && response.data && response.data.collections || []
}	

getEnvironments = async (apiUrl, apiKey) => {
	const response = await axios.get(`${apiUrl}/environments?apikey=${apiKey}`)
	return response && response.data && response.data.environments || []
}	

getCollectionId = async (apiUrl, apiKey, collectionName, forkLabel, forkLabelFailback) => {

	const getCollectionByForkLabel = (collections, label) => 
		label 
		? collections.filter(c => c.fork && c.fork.label == label)[0]
		: collections.filter(c => !c.fork)[0]

	const collections = (await getCollections(apiUrl, apiKey)).filter(c => c.name == collectionName);
	if (collections.length == 0) 
		throw new Error(`Unable to find any collection of name '${collectionName}'`)

	const collection = getCollectionByForkLabel(collections, forkLabel);
	if (collection) {
		log(`Found the collection of name '${collectionName}' and fork '${forkLabel}'`)
		return collection.id;
	}

	log(`Unable to find the collection of name '${collectionName}' and fork '${forkLabel} -> Failback to the fork '${forkLabelFailback}'`)
	const collectionFailback = getCollectionByForkLabel(collections, forkLabelFailback);
	if (collectionFailback) {
		log(`Found the collection of name '${collectionName}' and fork '${forkLabelFailback}'`)
		return collectionFailback.id
	}
	throw new Error(`Unable to find the collection of name '${collectionName}' and fork '${forkLabelFailback}'`)	
}

getEnvironmentId = async (apiUrl, apiKey, name) => {
	
	const environment = (await getEnvironments(apiUrl, apiKey)).filter(c => c.name == name)[0]
	if (environment) {
		return environment.id
	}
	throw new Error(`Unable to find the environment identified by ${name}`)
}

(async () => {

	try {
		log("Starting newboy action")
		
		const postmanApiUrl = 'https://api.getpostman.com'
		const environment = core.getInput('environment') || argv.environment
		const collection = core.getInput('collection') || argv.collection
		const forkLabel = core.getInput('fork_label') || argv.forkLabel
		const forkLabelsIgnored = core.getInput('fork_labels_ignored') || argv.forkLabelsIgnored
		const forkLabelFailback = core.getInput('fork_label_failback') || argv.forkLabelFailback
		const apiKey = core.getInput('apiKey') || argv.apiKey
	
		const fork = (forkLabelsIgnored || "").split(",").includes(forkLabel) ? "" : forkLabel;
		const collectionId = isGuid(collection) ? collection : await getCollectionId(postmanApiUrl, apiKey, collection, fork, forkLabelFailback)
		const environmentId = isGuid(environment) ? environment : await getEnvironmentId(postmanApiUrl, apiKey, environment)
		
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
