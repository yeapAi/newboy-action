const newman = require('newman')
const core = require('@actions/core')
const axios = require('axios').default
const { argv } = require('yargs')
const { isGuid } = require('check-guid')

log = message => {
	console.log(`-- newboy-action :: ${message}`)
}

isPostmanUid = (uid) => /^[0-9a-f]{1,10}\-[0-9a-f]{8}(\-[0-9a-f]{4}){3}\-[0-9a-f]{12}$/.test(uid);

getCollections = async (apiUrl, apiKey) => {
	const response = await axios.get(`${apiUrl}/collections?apikey=${apiKey}`)
	return response && response.data && response.data.collections || []
}	

getEnvironments = async (apiUrl, apiKey) => {
	const response = await axios.get(`${apiUrl}/environments?apikey=${apiKey}`)
	return response && response.data && response.data.environments || []
}	

getCollectionUid = async (apiUrl, apiKey, collectionName, forkLabel, forkLabelFailback) => {

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
		return collection.uid;
	}
	core.warning(`Unable to find the collection of name '${collectionName}' and fork '${forkLabel} -> Failback to the fork '${forkLabelFailback}'`)
	const collectionFailback = getCollectionByForkLabel(collections, forkLabelFailback);
	if (collectionFailback) {
		log(`Found the collection of name '${collectionName}' and fork '${forkLabelFailback}'`)
		return collectionFailback.uid
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
		const forkLabel = core.getInput('fork_label') || argv.forkLabel || ''
		const forkLabelsIgnored = core.getInput('fork_labels_ignored') || argv.forkLabelsIgnored || ''
		const forkLabelFailback = core.getInput('fork_label_failback') || argv.forkLabelFailback || ''
		const fork_label_remove_refs_heads = core.getInput('fork_label_remove_refs_heads') || argv.forkLabelRemoveRefsHeads || '1'
		const apiKey = core.getInput('apiKey') || argv.apiKey
		
		const forkLabelFiltered = fork_label_remove_refs_heads == '1' ? forkLabel.replace('refs/heads/', '') : forkLabel
		const fork = (forkLabelsIgnored || "").split(",").includes(forkLabelFiltered) ? "" : forkLabelFiltered
		
		const collectionUid = isPostmanUid(collection) ? collection : await getCollectionUid(postmanApiUrl, apiKey, collection, fork, forkLabelFailback)
		const environmentId = isGuid(environment) ? environment : await getEnvironmentId(postmanApiUrl, apiKey, environment)
		
		log(`Collection uid : ${collectionUid}`)
		log(`Environment id : ${environmentId}`)

		callbackDefaultGenerator = (eventName) => ((e, summary) => {
			var errorMessage = (e && e.message || '')
			if (errorMessage) {
				core.setFailed(`Newman run failed ${eventName} : ${errorMessage}`)
				log(`Event ${eventName} - FAIL - ${errorMessage}`)
				log(`Newman run failed ${eventName} : ${errorMessage}`)
				return;
			}
		})
		
		callbackItemGenerator = (eventName) => ((e, item) => {
			if (e) {
				defaultCallback(e);
				return;
			}
			var itemS = JSON.stringify(item)
			log(`Event ${eventName} - ${itemS}`)
		})

		const options = {
			apiKey: `?apikey=${apiKey}`,
			collection: `${postmanApiUrl}/collections/${collectionUid}?apikey=${apiKey}`,
			environment: `${postmanApiUrl}/environments/${environmentId}?apikey=${apiKey}`,
			verbose: true,
			reporters: 'cli',
		}

		newman.run(options, callbackDefaultGenerator('main'))
			.on('done', callbackDefaultGenerator('done'))
			.on('beforePrerequest', callbackDefaultGenerator('beforePrerequest'))
			.on('prerequest', callbackDefaultGenerator('prerequest'))
			.on('beforeRequest', callbackDefaultGenerator('beforeRequest'))
			.on('request', callbackDefaultGenerator('request'))
			.on('beforeTest', callbackDefaultGenerator('beforeTest'))
			.on('test', callbackDefaultGenerator('test'))
			.on('done', callbackDefaultGenerator('done'))
			.on('beforeItem', callbackDefaultGenerator('beforeItem'))
			.on('item', callbackDefaultGenerator('item'))
			.on('exception', callbackDefaultGenerator('exception'))
	}
	catch(e) {
		log(`Exception : ${e.message}`)
		core.setFailed(e.message)
	}
})();
