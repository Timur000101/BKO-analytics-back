// const webAppUrl = 'https://127.0.0.1:5173/'
const webAppUrl = 'https://admirable-tartufo-919591.netlify.app'

const getMainButtons = {
	reply_markup: {
		keyboard: [
			[{ text: 'Товар' }, { text: 'Услуга' }, { text: 'Аренда' }]
		],
		resize_keyboard: true,
		selective: true
	}
}

const getProductButtons = {
	reply_markup: {
		keyboard: [
			[{ text: 'Оптом' }, { text: 'В розницу' }]
		],
		resize_keyboard: true,
		selective: true
	}
}

const getWebFormButton  = function (query) {
	return {
		reply_markup: {
			keyboard: [
				[{ text: 'Заполнить форму', web_app: { url: webAppUrl + `?business_type=${query}` }}]
			],
			resize_keyboard: true,
			selective: true
		}
	} 
}


module.exports = {
	getMainButtons,
	getProductButtons,
	getWebFormButton
}