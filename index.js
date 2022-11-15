const TelegramBot = require('node-telegram-bot-api');
const mongoose = require('mongoose');
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

bot.on('message', async (msg) => {
	const chatId = msg.chat.id;
	const text = msg.text
	if (text === '/start') {
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
	
	if(msg?.web_app_data?.data) {
		try {
			const data = JSON.parse(msg?.web_app_data?.data)
			const markupTenge = (data.turnover * (data.markup / 100))
			const costPrise = data.turnover - markupTenge
			const netProfit = markupTenge - data.expenditure
			const user = User({
				userId: chatId,
				fromMonth: data.fromMonth,
				turnover: data.turnover,
				markup: data.markup,
				purchaseSum: data.purchaseSum,
				numberEmployees: data.numberEmployees,
				salaryEmployees: data.salaryEmployees,
				expenditure: data.expenditure
			})
			user.save().then(async (res) => {
				console.log('Success Send Data to Db', res)
				await bot.sendMessage(chatId, 'Спасибо что доворяете нам!')
				await bot.sendMessage(chatId, 'Всю информацию вы получите в этом чате');
				await bot.sendMessage(chatId, 'Ожидайте...')
				setTimeout(async () => {
					if (data.purchaseSum > costPrise) {
						await bot.sendMessage(chatId, 'Итог: На закуп тратиться больше денег');
					} else {
						await bot.sendMessage(chatId, 'Итог: На закуп тратиться меньше денег');
					}
					if (data.salaryEmployees > netProfit * 0.3) {
						await bot.sendMessage(chatId, 'Итог:  Надо продажи повисить или  сотрд. уменьшить');
					}
					if (data.expenditure > data.turnover * 0.2) {
						await bot.sendMessage(chatId, 'Итог:  Уменьшить расходы');
					}
				}, 2000)
			}).catch((err) => {
				console.log(err)
			})
			
		} catch (e) {
			console.log(e);
		}
	}
});