
import FormData from 'form-data'
import fetch from 'node-fetch'
import fs from 'fs'
import PDFDocument from 'pdfkit-table'
import TelegramBot from 'node-telegram-bot-api'
import mongoose from 'mongoose'
import { splitNumber } from './src/helpers.js'
import User from './src/models.js'
const localType = './src/font/Montserrat-Regular.ttf'


const token = '5705800519:AAG2ckG_x3FQN8iLQpyAbcdhZUjy3hbQi_4';
// const DB_PATH = 'mongodb+srv://temur:SuccessMoron17@bko.qbseyac.mongodb.net/bko'
const DB_PATH = 'mongodb://localhost:27017/bko'
const webAppUrl = 'https://127.0.0.1:5173/'
// const webAppUrl = 'https://admirable-tartufo-919591.netlify.app'
const bot = new TelegramBot(token, {polling: true});

mongoose.connect(DB_PATH)
.then((res) => {
	console.log('connected to db')
}).catch((err) => {
	console.log(err)
})

// Create pdf file
const sendDocUrl = `https://api.telegram.org/bot5705800519:AAG2ckG_x3FQN8iLQpyAbcdhZUjy3hbQi_4/sendDocument`;

// if (process.env.NTBA_FIX_350) {
// 	contentType = contentType || 'application/octet-stream';
// }

const data = [
	{
		"headers": [
			{ "label":"#", "property":"title", "width":100 },
			{ "label":"Как сейчас", "property":"now", "width":100 },
			{ "label":"Как должно быть", "property":"after", "width":100 }
		],
		"rows": [],
		"options": {
			"width": 300
		}
	}
];

async function sendDocument(chatId) {
	const localData = data
	const formData = new FormData();
	formData.append('chat_id', chatId)
	formData.append('document', fs.createReadStream('./document.pdf'), 'Отчет.pdf')

	const response = await fetch(sendDocUrl, {
		method: 'post',
		body: formData,
		headers: { ...formData.getHeaders() }
	})
	await response.json()
	setTimeout(() => {
		fs.unlink('./document.pdf', (err) => {
			if (err) {
					throw err;
			}
		});
		localData[0].rows = []
	}, 1000)
}


async function sendResultTable (chatId) {
	const doc = new PDFDocument({ margin: 30, size: 'A4' })
	doc.pipe(fs.createWriteStream("./document.pdf"));
	const user = await User.findOne({ userId: chatId })
	const shouldBePurchaseSum = user.turnover * ((100 - user.markup) / 100)
	const shouldBeCompanyProfit = (user.turnover - shouldBePurchaseSum ) - user.shouldBeExpenditure
	const shouldBeNumberEmployees = user.numberEmployees - user.turnover / user.shouldBeOneEmployeeCost > 0 ? String(Math.floor(user.numberEmployees - user.turnover / user.shouldBeOneEmployeeCost)) : user.numberEmployees
	console.log(shouldBeNumberEmployees)
	const oneEmployeeCost = String(Math.floor(user.turnover / user.numberEmployees))
	console.log(oneEmployeeCost)
	const shouldBeOwnerProfit = +user.turnoverDeviation + +user.expenditureDeviation + +user.salaryEmployeesDeviation + +user.margin - +user.expenditure
	data[0].rows.push(
		['Оборот', splitNumber(user.turnover, true), splitNumber(user.turnover, true)],
		['Наценка', splitNumber(user.markup, false), splitNumber(user.markup, false)],
		['Закуп', splitNumber(user.purchaseSum, true), splitNumber(shouldBePurchaseSum, true)],
		['Маржа', splitNumber(user.margin, true), splitNumber(user.turnover - shouldBePurchaseSum, true)],
		['Расходы', splitNumber(user.expenditure, true), splitNumber(user.shouldBeExpenditure, true)],
		['Приб. компании', splitNumber(user.companyProfit, true), splitNumber(shouldBeCompanyProfit, true)],
		// ['Кол. сотрд', splitNumber(user.numberEmployees, false), splitNumber(shouldBeNumberEmployees, false)],
		// ['Стоимость одного сотрудника', splitNumber(oneEmployeeCost, true), splitNumber(user.shouldBeOneEmployeeCost, true)]
		['ЗП сотрд', splitNumber(user.salaryEmployees, true), splitNumber(user.shouldBeSalaryEmployees, true)],
		['Приб. владельца', splitNumber(user.ownerProfit, true), splitNumber(shouldBeOwnerProfit, true)]
	)

	doc.table(data[0], {
		prepareHeader: () => doc.font(localType).fontSize(10),
		prepareRow: () => doc.font(localType).fontSize(10)
	});

  doc.end()

	setTimeout(async () => {
		await bot.sendMessage(chatId, 'Еще чуть-чуть :)')
	}, 1000)
	setTimeout(async () => {
		await sendDocument(chatId)
	}, 3000)
}


bot.on('message', async (msg) => {
	const chatId = msg.chat.id;
	const text = msg.text
	if (text === '/start') {
		await bot.sendMessage(chatId,  `Ниже появится кнопка "Аналитика", заполните форму.\nУслуга стоит 20 000 тг`, { reply_markup: {
				keyboard: [
					[ { text: 'Аналитика', web_app: { url: webAppUrl }} ],
					[ { text: 'Договор оферты', web_app: { url: 'https://drive.google.com/file/d/1FQLGqLqxYwuAZGBbg8vTzh1iwKF9arJN/view?usp=share_link' }} ],
					[ { text: 'Политика конфиденциальности', web_app: { url: 'https://drive.google.com/file/d/1P3nFJzK7whSRNAZ-TWSnSjyUGoMzgG0T/view?usp=share_link' } } ]
				],
				resize_keyboard: true,
				selective: true
		}})
	}
	
	if(msg?.web_app_data?.data) {
		try {
			const data = JSON.parse(msg?.web_app_data?.data)
			await bot.sendMessage(chatId, JSON.stringify(data))
			
			const user = await User.findOne({ userId: chatId })
			if (!user) {
				const newUser = User({
					userId: chatId,
					turnover: data.turnover,
					markup: data.markup,
					purchaseSum: data.purchaseSum,
					numberEmployees: data.numberEmployees,
					salaryEmployees: data.salaryEmployees,
					expenditure: data.expenditure,
					oneEmployeeCost: data.oneEmployeeCost,
					shouldBeOneEmployeeCost: data.shouldBeOneEmployeeCost,
					costPrice: data.costPrice,
					margin: data.margin,
					shouldBeExpenditure: data.shouldBeExpenditure,
					companyProfit: data.companyProfit,
					shouldBeSalaryEmployees: data.shouldBeSalaryEmployees,
					ownerProfit: data.ownerProfit,
					turnoverDeviation: data.turnoverDeviation,
					expenditureDeviation: data.expenditureDeviation,
					salaryEmployeesDeviation: data.salaryEmployeesDeviation
				})
				newUser.save().then(async () => {
					await bot.sendMessage(chatId, 'Спасибо что доворяете нам!')
					await bot.sendMessage(chatId, 'Файл с результатом вы получите в этом чате');
					setTimeout(async () => {
						await sendResultTable(chatId)
					}, 2000)
				})
			} else {
				await User.findOneAndUpdate({ userId: chatId }, {
					turnover: data.turnover,
					markup: data.markup,
					purchaseSum: data.purchaseSum,
					numberEmployees: data.numberEmployees,
					salaryEmployees: data.salaryEmployees,
					expenditure: data.expenditure,
					oneEmployeeCost: data.oneEmployeeCost,
					shouldBeOneEmployeeCost: data.shouldBeOneEmployeeCost,
					costPrice: data.costPrice,
					margin: data.margin,
					shouldBeExpenditure: data.shouldBeExpenditure,
					companyProfit: data.companyProfit,
					shouldBeSalaryEmployees: data.shouldBeSalaryEmployees,
					ownerProfit: data.ownerProfit,
					turnoverDeviation: data.turnoverDeviation,
					expenditureDeviation: data.expenditureDeviation,
					salaryEmployeesDeviation: data.salaryEmployeesDeviation
				}).then(async () => {
					await bot.sendMessage(chatId, 'Спасибо что доворяете нам!')
					await bot.sendMessage(chatId, 'Файл с результатом вы получите в этом чате');
					setTimeout(async () => {
						await sendResultTable(chatId)
					}, 2000)
				})
			}
		} catch (e) {
			console.log(e);
		}
	}
})


// Кнопка Аренды
// bot.onText(/\Аренда/, async (msg) => {
// 	const chatId = msg.chat.id
// 	await bot.sendMessage(chatId, 'По данной услуге аналитика невозможно, обратитесь в службу поддержки')
// })

// bot.onText(/\В розницу/, async (msg) => {
// 	const chatId = msg.chat.id
// 	const user = await User.findOne({ userId: chatId })
// 	if (!user) {
// 		const newUser = User({
// 			userId: chatId,
// 			businessType: 'product_retail'
// 		})
// 		newUser.save().then(async (res) => {
// 			await getWebAppButton(chatId)
// 		})
// 	} else {
// 		await User.findOneAndUpdate({ userId: chatId }, {
// 			businessType: 'product_retail'
// 		}).then(async (res) => {
// 			await getWebAppButton(chatId)
// 		})
// 	}
// })

//
// bot.onText(/\Оптом/, async (msg) => {
// 	const chatId = msg.chat.id
// 	const user = await User.findOne({ userId: chatId })
// 	if (!user) {
// 		const newUser = User({
// 			userId: chatId,
// 			businessType: 'product_wholesale'
// 		})
// 		newUser.save().then(async (res) => {
// 			await getWebAppButton(chatId)
// 		})
// 	} else {
// 		await User.findOneAndUpdate({ userId: chatId }, {
// 			businessType: 'product_wholesale'
// 		}).then(async (res) => {
// 			await getWebAppButton(chatId)
// 		})
// 	}
// })


// bot.onText(/\Услуга/, async (msg) => {
// 	const chatId = msg.chat.id
// 	const user = await User.findOne({ userId: chatId })
//
// 	if (!user) {
// 		const newUser = User({
// 			userId: chatId,
// 			businessType: 'service'
// 		})
// 		newUser.save().then(async (res) => {
// 			await getWebAppButton(chatId, 'service')
// 		})
// 	} else {
// 		await User.findOneAndUpdate({ userId: chatId }, {
// 			businessType: 'service'
// 		}).then(async (res) => {
// 			await getWebAppButton(chatId, 'service')
// 		})
// 	}
// })