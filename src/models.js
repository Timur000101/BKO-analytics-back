const mongoose = require('mongoose');
const { Schema } = mongoose;



const userSchema = new Schema({
	userId: String,
	fromMonth: String,
	turnover: String,
	markup: String,
	purchaseSum: String,
	numberEmployees: String,
	salaryEmployees: String,
	expenditure: String
}, { timestamps: true });


const User = mongoose.model('User', userSchema)
module.exports = User