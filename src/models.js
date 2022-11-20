import mongoose from 'mongoose'
const { Schema } = mongoose;



const userSchema = new Schema({
	userId: String,
	fromMonth: String,
	turnover: String,
	markup: String,
	purchaseSum: String,
	numberEmployees: String,
	salaryEmployees: String,
	expenditure: String,
	businessType: String,
	shouldBeMarkup: Number
}, { timestamps: true });


const User = mongoose.model('User', userSchema)


export default User