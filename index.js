
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
const DB_PATH = 'mongodb+srv://temur:SuccessMoron17@bko.qbseyac.mongodb.net/bko'
// const DB_PATH = 'mongodb://localhost:27017/bko'
// const webAppUrl = 'https://127.0.0.1:5173/'
const webAppUrl = 'https://admirable-tartufo-919591.netlify.app'
const bot = new TelegramBot(token, {polling: true});

mongoose.connect(DB_PATH)
.then((res) => {
	console.log('connected to db')
}).catch((err) => {
	console.log(err)
})

// Create pdf file
const sendDocUrl = `https://api.telegram.org/bot5705800519:AAG2ckG_x3FQN8iLQpyAbcdhZUjy3hbQi_4/sendDocument`;

const data = [
	{
		"headers": [
			{ "label":"#", "property":"title", "width": 100 },
			{ "label":"Как сейчас", "property":"now", "width": 120 },
			{ "label":"Итоги", "property":"after", "width": 300 }
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
	const oneEmployeeCost = Math.floor(user.turnover / user.numberEmployees)
	const factPurchaseSum = (user.turnover * ((100 - user.markup) / 100))
	const factSalaryEmployees = user.companyProfit * 0.3
	// Закуп
	let purchaseSumResult = null
	if (+user.turnoverDeviation > 1000000) {
		purchaseSumResult = `Закуп должен быть на сумму ${splitNumber(Math.ceil(shouldBePurchaseSum), true)}, у Вас отклонение ${splitNumber(Math.ceil(user.purchaseSum  - factPurchaseSum), true)}`
	} else if (+user.turnoverDeviation < -1000000) {
		purchaseSumResult = 'У Вас на закуп тратиться меньше денег'
	} else if (+user.turnoverDeviation <= 1000000 && +user.turnoverDeviation >= -1000000) {
		purchaseSumResult = 'У Вас хорошо с закупом'
	}
	// Стоимость одного сотрудника
	let oneEmployeeCostResult = null
	if (oneEmployeeCost >= +user.shouldBeOneEmployeeCost) {
		oneEmployeeCostResult = 'Все хорошо'
	} else if (oneEmployeeCost >= 3000000) {
		oneEmployeeCostResult = 'Норма'
	} else {
		oneEmployeeCostResult = `У Вас стоимость одного сотрудника ${splitNumber(Math.ceil(oneEmployeeCost), true)}, должно быть 5 000 000 тг`
	}
	// Количество сотрудников
	let numberEmployeesResult = null
	if (oneEmployeeCost >= 3000000) {
		numberEmployeesResult = user.numberEmployees
	} else {
		numberEmployeesResult = `У Вас должны быть ${Math.ceil(user.turnover / user.shouldBeOneEmployeeCost)} сотрудников`
	}
	// ЗП сотрудников
	let salaryEmployeesResult = null
	if (user.salaryEmployees > factSalaryEmployees + factSalaryEmployees * 0.1) {
		salaryEmployeesResult = `Зарплата сотрудников должно быть ${Math.ceil(factSalaryEmployees)}, Вы в минусе ${splitNumber(Math.ceil(user.salaryEmployees - factSalaryEmployees), true)}`
	} else if (user.salaryEmployees < factSalaryEmployees + factSalaryEmployees * 0.1) {
		salaryEmployeesResult = `У Вас недомотивированные сотрудники`
	} else {
		salaryEmployeesResult = 'Все отлично'
	}
	
	
	
	const expenditureResult = user.margin * 0.2 < user.expenditure ? `У Вас отклонение ${splitNumber(Math.ceil(user.expenditure - user.margin * 0.2), true)}` : 'Расход норма'
	
	let shouldBeOwnerProfit = 0
	if (+user.turnoverDeviation > 0) {
		shouldBeOwnerProfit = shouldBeOwnerProfit + +user.turnoverDeviation
	}
	if (+user.expenditureDeviation > 0) {
		shouldBeOwnerProfit = shouldBeOwnerProfit + +user.expenditureDeviation
	}
	if (+user.salaryEmployeesDeviation > 0) {
		shouldBeOwnerProfit = shouldBeOwnerProfit + +user.salaryEmployeesDeviation
	}
	
	let ownerProfitResult = null
	if (+user.ownerProfit < shouldBeOwnerProfit + +user.ownerProfit) {
		ownerProfitResult = `Вы теряете ${splitNumber(Math.ceil(shouldBeOwnerProfit), true)} в месяц`
	} else {
		ownerProfitResult = 'Все отлично'
	}
	
 	data[0].rows.push(
		['Оборот', splitNumber(user.turnover, true), splitNumber(user.turnover, true)],
		['Закуп', splitNumber(user.purchaseSum, true), `${purchaseSumResult}`],
		['Маржа', splitNumber(user.margin, true), ''],
		['Расходы', splitNumber(user.expenditure, true), `${expenditureResult}`],
		['Приб. компании', splitNumber(user.companyProfit, true), ''],
		['Стоимость одного сотрудника', splitNumber(Math.ceil(oneEmployeeCost), true), `${oneEmployeeCostResult}`],
		['Кол. сотрд', user.numberEmployees, `${numberEmployeesResult}`],
		['ЗП сотрд', splitNumber(Math.ceil(user.salaryEmployees), true), `${salaryEmployeesResult}`],
		['Приб. владельца', splitNumber(Math.ceil(user.ownerProfit), true), `${ownerProfitResult}`]
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
		await bot.sendMessage(chatId,  `Привет!\nДанный бот представляет собой самую простую финансовую таблицу.\nПоехали! Попробуем вывести и увидеть, как может выглядеть в цифрах твоя компания!\n1. Финансовая таблица\n2. Позволит легко высчитать основные показатели\n3. Просто забьете основные цифры\n4. Увидите примерный финансовый результат возможности вашей компании\nНиже появится кнопка "Аналитика", заполните форму.\nУслуга стоит 20 000 тг`, { reply_markup: {
				keyboard: [
					[ { text: 'Аналитика', web_app: { url: webAppUrl }} ],
					[ { text: 'Договор оферты', web_app: { url: 'https://docs.google.com/document/d/16Qohr9PgbMjoravVdGpne3eCtq_w6wXr/edit?usp=share_link&ouid=114431697732675672393&rtpof=true&sd=true' }} ],
					[ { text: 'Политика конфиденциальности', web_app: { url: 'https://docs.google.com/document/d/1LXePS0S3vVcl9JQ3ByU-Twnnj4mpivX2/edit?usp=share_link&ouid=114431697732675672393&rtpof=true&sd=true' } } ]
				],
				resize_keyboard: true,
				selective: true
		}})
	}
	
	if(msg?.web_app_data?.data) {
		try {
			const data = JSON.parse(msg?.web_app_data?.data)
			
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
