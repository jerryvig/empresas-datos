const http = require('http');
const htmlparser = require('htmlparser2');

const BASE_URL = 'http://financials.morningstar.com/ajax/ReportProcess4HtmlAjax.html?&t='
const THROTTLE_DELAY = 1500;
const YEARS = ['Y_1', 'Y_2', 'Y_3', 'Y_4', 'Y_5', 'Y_6'];

function ResultParser() {
	this.currentYear = null;
	this.years = {};
	this.revenueByYear = {};
	this.yearIndex = 0;
	this.parser = new htmlparser.Parser({
		onopentag: this.onopentag.bind(this),
		ontext: this.ontext.bind(this),
		onclosetag: this.onclosetag.bind(this)
	}, {decodeEntities: true});
}

ResultParser.prototype.onopentag = function(name, attrs) {
	if (name === 'div') {
		if (attrs.class === 'year' && YEARS.indexOf(attrs.id) !== -1) {
			this.currentYear = attrs.id;
		}
		if (attrs.class === 'pos' && YEARS.indexOf(attrs.id) !== -1 && attrs.rawvalue !== undefined &&
			attrs.style === 'overflow:hidden;white-space: nowrap;') {
			if (this.yearIndex < 6) {
				this.revenueByYear[attrs.id] = attrs.rawvalue;
			}
			this.yearIndex++;
		}
	}
};

ResultParser.prototype.ontext = function(text) {
	if (this.currentYear !== null) {
		this.years[this.currentYear] = text.trim();
	}
};

ResultParser.prototype.onclosetag = function(name) {
	if (name === 'div') {
		this.currentYear = null;
	}
};

function processResult(result) {
	var p = new ResultParser();
	p.parser.write(result);
	p.parser.end();
	console.log(JSON.stringify(p.years));
	console.log(JSON.stringify(p.revenueByYear));
}

function getNextTicker(tickers) {
	var nextTicker = tickers.pop();
	if (typeof nextTicker === 'undefined') {
		console.log('Finished retrieiving morningstar data for all tickers.');
		return;
	}

	console.log(`Retrieving morningstar data for ticker ${nextTicker}.`);
	http.get(BASE_URL + nextTicker, (res) => {
		if (res.statusCode !== 200) {
			console.log(`Error: Server reponded with status code ${res.statusCode}`);
			res.resume();
			setTimeout(getNextTicker, THROTTLE_DELAY, tickers);
		}

		var rawData = '';
		res.on('data', (chunk) => {
			rawData += chunk;
		});

		res.on('end', () => {
			try {
				var parsedData = JSON.parse(rawData);
				if (parsedData.result !== undefined) {
					processResult(parsedData.result);
				} else {
					console.log(`No "result" property found in returned JSON for ticker ${nextTicker}. Cannot process data.`);
				}
			} catch (error) {
				console.log(`Error thrown when parsing JSON: ${error.message}.`);
			} 
			setTimeout(getNextTicker, THROTTLE_DELAY, tickers);
		});
	});
}

function main(args) {
	var tickers = ['AAPL', 'GOOGL', 'MSFT', 'FB', 'AMZN', 'NFLX', 'TSLA', 'TWTR', 'BABA', 'BIDU', 'PYPL', 'SPLK', 'SQ', 'CRM', 'TWLO', 'BOX', 'CVNA'];
	getNextTicker(tickers);
}

const args = process.argv;
main(args);
