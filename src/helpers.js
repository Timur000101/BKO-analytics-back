function splitNumber(value, postfix) {
	const val = Number(value).toString()
	return (
		val.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') +
		` ${postfix ? ' ₸' : ''}`
	)
}


module.exports = {
	splitNumber
}