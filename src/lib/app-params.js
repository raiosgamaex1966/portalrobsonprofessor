const isNode = typeof window === 'undefined';

const getAppParams = () => {
	return {
		appId: 'local-app',
		token: null,
		fromUrl: isNode ? '' : window.location.href,
		functionsVersion: 'v1',
		appBaseUrl: 'http://localhost:5175',
	}
}

export const appParams = {
	...getAppParams()
}
