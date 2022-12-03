import mongoose from 'mongoose'
const { Schema } = mongoose;



const userSchema = new Schema({
	userId: String,
	turnover: String,
	markup: String,
	purchaseSum: String,
	numberEmployees: String,
	salaryEmployees: String,
	expenditure: String,
	oneEmployeeCost: String,
	shouldBeOneEmployeeCost: String,
	costPrice: String,
	margin: String,
	shouldBeExpenditure: String,
	companyProfit: String,
	shouldBeSalaryEmployees: String,
	ownerProfit: String,
	turnoverDeviation: String,
	expenditureDeviation: String,
	salaryEmployeesDeviation: String
}, { timestamps: true });


const User = mongoose.model('User', userSchema)


export default User