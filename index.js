
import FormData from 'form-data'
import fetch from 'node-fetch'
import fs from 'fs'
import PDFDocument from 'pdfkit-table'
import TelegramBot from 'node-telegram-bot-api'
import mongoose from 'mongoose'
import { splitNumber } from './src/helpers.js'
import { getMainButtons, getProductButtons, getWebFormButton } from './src/keyboards.js'
import User from './src/models.js'
const localType = './src/font/Montserrat-Regular.ttf'


const token = '5705800519:AAG2ckG_x3FQN8iLQpyAbcdhZUjy3hbQi_4';
const DB_PATH = 'mongodb+srv://temur:SuccessMoron17@bko.qbseyac.mongodb.net/bko'
// const DB_PATH = 'mongodb://localhost:27017/bko'
const bot = new TelegramBot(token, {polling: true});

mongoose.connect(DB_PATH)
.then((res) => {
	console.log('connected to db')
}).catch((err) => {
	console.log(err)
})

// Create pdf file
const sendDocUrl = `https://api.telegram.org/bot5705800519:AAG2ckG_x3FQN8iLQpyAbcdhZUjy3hbQi_4/sendDocument`;
const doc = new PDFDocument({ margin: 30, size: 'A4' });
doc.pipe(fs.createWriteStream("./document.pdf")); 

if (process.env.NTBA_FIX_350) {
	contentType = contentType || 'application/octet-stream';
}

async function getWebAppButton (chatId, query) {
	await bot.sendMessage(chatId, 'Ниже появится кнопка, заполните форму', getWebFormButton(query))
}

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
	},
	{
		"headers": [
			{ "label":"Итоги:", "property":"title", "width": 100 },
			{ "label":"", "property":"now", "width": 300 },
		],
		"rows": [],
		"options": {
			"width": 300
		}
	}
];

async function sendDocument(chatId) {
	const formData = new FormData();
	formData.append('chat_id', chatId)
	formData.append('document', fs.createReadStream('./document.pdf'), 'Отчет.pdf')

	const response = await fetch(sendDocUrl, {
		method: 'post',
		body: formData,
		headers: { ...formData.getHeaders() }
	})
	const data = await response.json()
}  


async function sendResultTable (chatId) {
	const user = await User.findOne({ userId: chatId })
	const turnover = user.turnover // Оборот
	const expenditure = user.expenditure // Расход
	const salaryEmployees = user.salaryEmployees
	const markupTenge = (turnover * (user.markup / 100)) // Наценка в тенге
	const costPrice = turnover - markupTenge // Себестоимость
	const margin = turnover - costPrice // Маржа
	const companyProfit = margin - expenditure // Прибыль компании
	const teamSalary = companyProfit * 0.3 // ЗП команды
	const ownerProfit = companyProfit - teamSalary
	// Как должно быть
	let shouldBeMarkup = null
	if (user.markup > 30) {
		shouldBeMarkup = user.markup
	} else {
		shouldBeMarkup = user.businessType === 'product_retail' ? 30 : 15 // наценка
	}
	const shouldBeMarkUpTenge = (turnover * (shouldBeMarkup / 100)) // наценка в тенге
	const shouldBeCostPrice = turnover - shouldBeMarkUpTenge  // Себестоимость
	const shouldBeMargin = turnover - shouldBeCostPrice  // Маржа
	const shouldBeExpenditure = shouldBeMargin * 0.2  // Расход
	const shouldBeCompanyProfit = shouldBeMargin - shouldBeExpenditure  // Прибыль компании
	const shouldBeTeamSalary = shouldBeCompanyProfit * (shouldBeMarkup / 100)
	const shouldBeOwnerProfit = shouldBeCompanyProfit - shouldBeTeamSalary

	let step = 1

	if (user.businessType === 'service') {
		data[0].rows.push(
			['Оборот', splitNumber(turnover, true), splitNumber(turnover, true)],
			['Закуп', splitNumber(user.purchaseSum, true), splitNumber(costPrice, true)],
			['Себестоимость', splitNumber(costPrice, true), splitNumber(costPrice, true)],
			['Маржа', splitNumber(margin, true), splitNumber(margin, true)],
			['Расходы', splitNumber(expenditure, true), splitNumber(margin * 0.2, true)],
			['Кол. сотрд', user.numberEmployees, user.numberEmployees],
			['Приб. компании', splitNumber(companyProfit, true), splitNumber(shouldBeCompanyProfit, true)],
			['Приб. владельца', splitNumber(ownerProfit, true), splitNumber(shouldBeOwnerProfit, true)],
			['ЗП сотрд', splitNumber(salaryEmployees, true), splitNumber(shouldBeTeamSalary, true)]
		)
	} else {
		data[0].rows.push(
			['Оборот', splitNumber(turnover, true), splitNumber(turnover, true)],
			['Наценка', user.markup + '%', shouldBeMarkup + '%'],
			['Закуп', splitNumber(user.purchaseSum, true), splitNumber(costPrice, true)],
			['Себестоимость', splitNumber(costPrice, true), splitNumber(costPrice, true)],
			['Маржа', splitNumber(margin, true), splitNumber(margin, true)],
			['Расходы', splitNumber(expenditure, true), splitNumber(margin * 0.2, true)],
			['Кол. сотрд', user.numberEmployees, user.numberEmployees],
			['Приб. компании', splitNumber(companyProfit, true), splitNumber(shouldBeCompanyProfit, true)],
			['Приб. владельца', splitNumber(ownerProfit, true), splitNumber(shouldBeOwnerProfit, true)],
			['ЗП сотрд', splitNumber(salaryEmployees, true), splitNumber(shouldBeTeamSalary, true)]
		)
	}

	if (user.purchaseSum > costPrice) {
		data[1].rows.push([step, 'На закуп тратиться больше денег'])
		step++
	} else {
		data[1].rows.push([step, 'На закуп тратиться меньше денег'])
		step++
	}
	if (user.salaryEmployees > companyProfit * 0.3 && user.businessType !== 'service') {
		data[1].rows.push([step, 'Надо продажи повисить или  сотрд. уменьшить'])
		step++
	} else if (user.salaryEmployees > companyProfit * 0.4 && user.businessType === 'service') {
		data[1].rows.push([step, 'Надо продажи повисить или  сотрд. уменьшить'])
		step++
	}
	if (expenditure > turnover * 0.2) {
		data[1].rows.push([step, 'Уменьшить расходы'])
		step++
	}
	
	doc.table(data[0], {
		prepareHeader: () => doc.font(localType).fontSize(10),
		prepareRow: () => doc.font(localType).fontSize(10)
	});
	doc.table(data[1], {
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
		await bot.sendMessage(chatId, 'Выберите чем Вы занимаетесь', getMainButtons)
	}
	
	if (text === 'Товар') {
		await bot.sendMessage(chatId, 'Выберите тип продажи', getProductButtons)
	}
	
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
				await bot.sendMessage(chatId, 'Спасибо что доворяете нам!')
				await bot.sendMessage(chatId, 'Всю информацию вы получите в этом чате');
				await bot.sendMessage(chatId, 'Ожидайте...', getMainButtons)
				setTimeout(async () => {
					await sendResultTable(chatId)
				}, 2000)
			})
			
		} catch (e) {
			console.log(e);
		}
	}
});


// Кнопка Аренды
bot.onText(/\Аренда/, async (msg) => {
	const chatId = msg.chat.id
	await bot.sendMessage(chatId, 'По данной услуге аналитика невозможно, обратитесь в службу поддержки')
})

bot.onText(/\В розницу/, async (msg) => {
	const chatId = msg.chat.id
	const user = await User.findOne({ userId: chatId })
	if (!user) {
		const newUser = User({
			userId: chatId,
			businessType: 'product_retail'
		})
		newUser.save().then(async (res) => {
			await getWebAppButton(chatId)
		})
	} else {
		await User.findOneAndUpdate({ userId: chatId }, {
			businessType: 'product_retail'
		}).then(async (res) => {
			await getWebAppButton(chatId)
		})
	}
})

bot.onText(/\Оптом/, async (msg) => {
	const chatId = msg.chat.id
	const user = await User.findOne({ userId: chatId })
	if (!user) {
		const newUser = User({  
			userId: chatId,
			businessType: 'product_wholesale'
		})
		newUser.save().then(async (res) => {
			await getWebAppButton(chatId)
		})
	} else {
		await User.findOneAndUpdate({ userId: chatId }, {
			businessType: 'product_wholesale'
		}).then(async (res) => {
			await getWebAppButton(chatId)
		})
	}
})


bot.onText(/\Услуга/, async (msg) => {
	const chatId = msg.chat.id
	const user = await User.findOne({ userId: chatId })

	if (!user) {
		const newUser = User({
			userId: chatId,
			businessType: 'service'
		})
		newUser.save().then(async (res) => {
			await getWebAppButton(chatId, 'service')
		})
	} else {
		await User.findOneAndUpdate({ userId: chatId }, {
			businessType: 'service'
		}).then(async (res) => {
			await getWebAppButton(chatId, 'service')
		})
	}
})