const TelegramBot = require('node-telegram-bot-api');
const express = require('express')
const cors = require('cors')

const token = '5705800519:AAG2ckG_x3FQN8iLQpyAbcdhZUjy3hbQi_4';


const bot = new TelegramBot(token, {polling: true});
const webAppUrl = 'https://127.0.0.1:5173'
const app = express()


app.use(express.json())
app.use(cors())

bot.onText(/\/echo (.+)/, (msg, match) => {

	const chatId = msg.chat.id;
	const resp = match[1]; // the captured "whatever"

	bot.sendMessage(chatId, resp);
});

bot.on('message', async (msg) => {
	const chatId = msg.chat.id;
	const text = msg.text
	if (text === '/start') {
		await bot.sendMessage(chatId, 'Ниже появится кнопка, заполните форму', {
			reply_markup: {
				inline_keyboard: [
					[{ text: 'Заполнить форму', web_app: { url: webAppUrl }}]
				]
			}
		})
	}
	
	if(msg?.web_app_data?.data) {
		console.log(31)
		try {
			const data = JSON.parse(msg?.web_app_data?.data)
			console.log(data)
			await bot.sendMessage(chatId, 'Спасибо за обратную связь!')
			await bot.sendMessage(chatId, 'Данные: ' + data);
			// await bot.sendMessage(chatId, 'Ваша улица: ' + data?.street);
			//
			// setTimeout(async () => {
			// 	await bot.sendMessage(chatId, 'Всю информацию вы получите в этом чате');
			// }, 3000)
		} catch (e) {
			console.log(e);
		}
	}
});

app.post('/web-data', async (req, res) => {
	const { queryId, fromMonth } = req.body
	try {
		bot.answerWebAppQuery(queryId, {
			type: 'article',
			id: queryId,
			title: 'Успешно',
			input_message_content: {message_text: 'Hello епта'}
		})
		return res.status(200).json({})
	} catch (e) {
		console.log(e)
		return  res.status(500).json({})
	}
})

const PORT = 8000
app.listen(PORT, () => console.log('Server started' + PORT))