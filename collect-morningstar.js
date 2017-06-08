const http = require('http');
const htmlparser = require('htmlparser2');

const MORNINGSTAR_BASE_URL = 'http://financials.morningstar.com/ajax/ReportProcess4HtmlAjax.html?&t='
const NASDAQ_TICKERS_URL = 'http://www.nasdaq.com/screening/companies-by-name.aspx?letter=0&exchange=nasdaq&render=download'
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

function handleResponseEnd(tickers) {
	try {
		var parsedData = JSON.parse(this.rawData);
		if (parsedData.result !== undefined) {
			processResult(parsedData.result);
		} else {
			console.log(`No "result" property found in returned JSON for ticker ${nextTicker}. Cannot process data.`);
		}
	} catch (error) {
		console.log(`Error thrown when parsing JSON: ${error.message}.`);
	} 
	setTimeout(getNextTicker, THROTTLE_DELAY, tickers);
}

function handleResponseData(chunk) {
	this.rawData += chunk;
}

function handleMorningstarResponse(response, tickers) {
	if (response.statusCode !== 200) {
		console.log(`Error: Server reponded with status code ${response.statusCode}`);
		response.resume();
		setTimeout(getNextTicker, THROTTLE_DELAY, tickers);
	}

	this.rawData = '';
	response.on('data', handleResponseData.bind(this));
	response.on('end', handleResponseEnd.bind(this, tickers));
}

function getNextTicker(tickers) {
	var nextTicker = tickers.shift();
	if (typeof nextTicker === 'undefined') {
		console.log('Finished retrieiving morningstar data for all tickers.');
		return;
	}

	console.log(`Retrieving morningstar data for ticker ${nextTicker}.`);
	http.get(MORNINGSTAR_BASE_URL + nextTicker, (response) => handleMorningstarResponse(response, tickers));
}

function getTickerListFromNasdaq(callback) {
	http.get(NASDAQ_TICKERS_URL, (response) => {
		var rawData = '';
		var tickerList = [];

		if (response.statusCode !== 200) {
			console.log(`Error: Nasdaq server responded with status code ${response.statusCode}`);
			return;
		}

		response.on('data', (chunk) => {
			rawData += chunk;
		})

		response.on('end', () => {
			var lines = rawData.split('\n');
			for (var line of lines) {
				var cols = line.split(',');
				var ticker = cols[0].replace(/"/g, '').trim();
				if (ticker) {
					tickerList.push(ticker);
				}
			}
			callback(tickerList);
		});
	});
}

function main(args) {
	// var tickers = ['AAPL', 'GOOGL', 'MSFT', 'FB', 'AMZN', 'NFLX', 'TSLA', 'TWTR', 'BABA', 'BIDU', 'PYPL', 'SPLK', 'SQ', 'CRM', 'TWLO', 'BOX', 'CVNA'];
	// getNextTicker(tickers);
	getTickerListFromNasdaq((tickers) =>{
		for (var t of tickers) {
			console.log(t);
		}
	});
}

const args = process.argv;
main(args);
