const TelegramBot = require('node-telegram-bot-api');
const express = require('express')
const cors = require('cors')

const token = '5705800519:AAG2ckG_x3FQN8iLQpyAbcdhZUjy3hbQi_4';


const bot = new TelegramBot(token, {polling: true});
const webAppUrl = 'https://wonderful-pithivier-8f4107.netlify.app/'
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
});

app.post('/web-data', async (req, res) => {
	const { queryId, fromMonth } = req.body
	try {
		await bot.answerWebAppQuery(queryId, {
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