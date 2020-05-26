const newman = require('newman')
const core = require('@actions/core')

launch()

async function launch() {
	
	console.log('-- postboy :: launch')
	const environmentId = 'b2e74924-ef42-473c-ae4e-596f06bbac77'
	const collectionId = '5c8d077f-8b9b-479e-8d96-ce552e8a9b23'
	const apiKey = 'PMAK-5ebab930d8a01900377e7383-3bc36e182c3cb75a7ff70530d824cdf536'
	const apiUrl = 'https://api.getpostman.com'
	
	const environment = `${apiUrl}/environments/${environmentId}?apikey=${apiKey}`
	const collection = `${apiUrl}/collections/${collectionId}?apikey=${apiKey}`
	
	const options = {
		apiKey: `?apikey=${apiKey}`,
		collection: collection,
		environment: environment,
		reporters: 'cli',
	}
	
	console.log('-- postboy :: options : ' + JSON.stringify(options));
	
	try {
		newman.run(options).on('done', (e, summary) => {
			if (e || summary.run.failures.length) {
			  core.setFailed('Newman run failed!' + (e || ''))
			}
		})
	}
	catch(e) {
		console.log('-- postboy :: fatal error : ' + e.message)
		core.setFailed(e.message)
	}
}