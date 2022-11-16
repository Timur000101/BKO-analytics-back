const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
const { table } = require('table')
const { splitNumber } = require('./src/helpers')
const User = require('./src/models')


const token = '5705800519:AAG2ckG_x3FQN8iLQpyAbcdhZUjy3hbQi_4';
// const webAppUrl = 'https://127.0.0.1:5173/'
const DB_PATH = `mongodb+srv://temur:SuccessMoron17@bko.qbseyac.mongodb.net/bko`
const webAppUrl = 'https://admirable-tartufo-919591.netlify.app'
// const DB_PATH = 'mongodb://localhost:27017/bko'
const bot = new TelegramBot(token, {polling: true});

mongoose.connect(DB_PATH)
	.then((res) => {
		console.log('connected to db')
	}).catch((err) => {
		console.log(err)
	})

bot.onText(/\/echo (.+)/, (msg, match) => {

	const chatId = msg.chat.id;
	const resp = match[1];

	bot.sendMessage(chatId, resp);
});

const data = [
	['#', 'Как сейчас', 'Как должно быть'],
];

const config = {
	// columns: [
	// 	{ alignment: 'left', width: 12 },
	// 	{ alignment: 'left', width: 12 },
	// 	{ alignment: 'left', width: 12 },
	// ],
	// border: {
	// 	topBody: `─`,
	// 	topJoin: `┬`,
	// 	topLeft: `┌`,
	// 	topRight: `┐`,
	//
	// 	bottomBody: `─`,
	// 	bottomJoin: `┴`,
	// 	bottomLeft: `└`,
	// 	bottomRight: `┘`,
	//
	// 	bodyLeft: `│`,
	// 	bodyRight: `│`,
	// 	bodyJoin: ``,
	//
	// 	joinBody: `─`,
	// 	joinLeft: `├`,
	// 	joinRight: `┤`,
	// 	joinJoin: `┼`
	// }
};

async function getWebAppButton (chatId) {
	await bot.sendMessage(chatId, 'Ниже появится кнопка, заполните форму', {
		reply_markup: {
			keyboard: [
				[{ text: 'Заполнить форму', web_app: { url: webAppUrl }}]
			],
			resize_keyboard: true,
			selective: true
		}
	})
}

async function sendResultTable (chatId) {
	const user = await User.findOne({ userId: chatId })
	const markupTenge = (user.turnover * (user.markup / 100))
	const costPrice = user.turnover - markupTenge
	const netProfit = markupTenge - user.expenditure
	if (user.businessType === 'service') {
		data.push(
			['Оборот', splitNumber(user.turnover, true), splitNumber(user.turnover, true)],
			['Закуп', splitNumber(user.purchaseSum, true), splitNumber(costPrice, true)],
			['Расходы', splitNumber(user.expenditure, true), splitNumber(costPrice * 0.2, true)],
			['Кол. сотрд', user.numberEmployees, user.numberEmployees],
			['ЗП сотрд', splitNumber(user.salaryEmployees, true), splitNumber(netProfit * 0.4, true)]
		)
	} else {
		data.push(
			['Оборот', splitNumber(user.turnover, true), splitNumber(user.turnover, true)],
			['Наценка', user.markup + '%', `${user.markup > 30 ? user.markup + '%' : (user.businessType === 'product_wholesale') ? '15%' : '30%'}`],
			['Закуп', splitNumber(user.purchaseSum, true), splitNumber(costPrice, true)],
			['Расходы', splitNumber(user.expenditure, true), splitNumber(costPrice * 0.2, true)],
			['Кол. сотрд', user.numberEmployees, user.numberEmployees],
			['ЗП сотрд', splitNumber(user.salaryEmployees, true), splitNumber(netProfit * 0.3, true)]
		)
	}
	
	await bot.sendMessage(chatId, table(data, config))
	await bot.sendMessage(chatId, 'Итог:')
	let step = 1
	if (user.purchaseSum > costPrice) {
		await bot.sendMessage(chatId, `${step}) На закуп тратиться больше денег`).then(() => step++)
	} else {
		await bot.sendMessage(chatId, `${step}) На закуп тратиться меньше денег`).then(() => step++)
	}
	if (user.salaryEmployees > netProfit * 0.3 && user.businessType !== 'service') {
		await bot.sendMessage(chatId, `${step}) Надо продажи повисить или  сотрд. уменьшить`).then(() => step++)
	} else if (user.salaryEmployees > netProfit * 0.4 && user.businessType === 'service') {
		await bot.sendMessage(chatId, `${step}) Надо продажи повисить или  сотрд. уменьшить`).then(() => step++)
	}
	if (user.expenditure > user.turnover * 0.2) {
		await bot.sendMessage(chatId, `${step}) Уменьшить расходы`).then(() => step++)
	}
}


bot.on('message', async (msg) => {
	const chatId = msg.chat.id;
	const text = msg.text
	if (text === '/start') {
		await bot.sendMessage(chatId, 'Выберите чем Вы занимаетесь', {
			reply_markup: {
				keyboard: [
					[{ text: 'Товар' }, { text: 'Услуга' }, { text: 'Аренда' }]
				],
				resize_keyboard: true,
				selective: true
			}
		})
	}
	
	if (text === 'Товар') {
		await bot.sendMessage(chatId, 'Выберите тип продажи', {
			reply_markup: {
				keyboard: [
					[{ text: 'Оптом' }, { text: 'В розницу' }]
				],
				resize_keyboard: true,
				selective: true
			}
		})
	} else if (text === 'Услуга') {
		const user = User({
			userId: chatId,
			businessType: 'service'
		})
		user.save().then(async (res) => {
			await getWebAppButton(chatId)
		})
	} else if (text === 'Аренда') {
		await bot.sendMessage(chatId, 'По данной услуге аналитика невозможно, обратитесь в службу поддержки')
	} else if (text === 'Оптом') {
		const user = User({
			userId: chatId,
			businessType: 'product_wholesale'
		})
		user.save().then(async (res) => {
			await getWebAppButton(chatId)
		})
	} else if (text === 'В розницу') {
		const user = User({
			userId: chatId,
			businessType: 'product_retail'
		})
		user.save().then(async (res) => {
			await getWebAppButton(chatId)
		})
	}
	
	// TODO: если сущесв userId обновить иначе создать
	if(msg?.web_app_data?.data) {
		try {
			const data = JSON.parse(msg?.web_app_data?.data)
			await User.findOneAndUpdate({ userId: chatId }, {
				fromMonth: data.fromMonth,
				turnover: data.turnover,
				markup: data.markup,
				purchaseSum: data.purchaseSum,
				numberEmployees: data.numberEmployees,
				salaryEmployees: data.salaryEmployees,
				expenditure: data.expenditure
			}).then(async (res) => {
				console.log('Success Send Data to Db', res)
				await bot.sendMessage(chatId, 'Спасибо что доворяете нам!')
				await bot.sendMessage(chatId, 'Всю информацию вы получите в этом чате');
				await bot.sendMessage(chatId, 'Ожидайте...')
				setTimeout(async () => {
					await sendResultTable(chatId)
				}, 2000)
			}).catch((err) => {
				console.log(err)
			})
			
		} catch (e) {
			console.log(e);
		}
	}
});