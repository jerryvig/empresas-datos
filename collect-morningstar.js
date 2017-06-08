const http = require('http');
const htmlparser = require('htmlparser2');
const sqlite3 = require('sqlite3').verbose();

const MORNINGSTAR_BASE_URL = 'http://financials.morningstar.com/ajax/ReportProcess4HtmlAjax.html?&t='
const NASDAQ_TICKERS_URL = 'http://www.nasdaq.com/screening/companies-by-name.aspx?letter=0&render=download&exchange='
const THROTTLE_DELAY = 1500;
const YEARS = ['Y_1', 'Y_2', 'Y_3', 'Y_4', 'Y_5', 'Y_6'];
const EXCHANGES = ['nasdaq', 'nyse', 'amex'];
const DB_FILE_NAME = 'morningstar_data.sqlite3';

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

	var db = new sqlite3.Database(DB_FILE_NAME);
	db.all('SELECT * FROM names ORDER BY name', (err, rows) => {
		rows.forEach((row) => {
			console.log(`name = ${row.name}`);
		});
		db.close();
	});
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
	if (nextTicker === undefined) {
		console.log('Finished retrieiving morningstar data for all tickers.');
		return;
	}

	console.log(`Retrieving morningstar data for ticker ${nextTicker}.`);
	http.get(MORNINGSTAR_BASE_URL + nextTicker, (response) => handleMorningstarResponse(response, tickers));
}

function TickerListLoader(exchanges, callback) {
	this.tickerList = [];
	this.exchanges = exchanges;
	this.callback = callback;
	this.count = 0;
	this.rawData = '';
}

TickerListLoader.prototype.handleResponseEnd = function(rawData) {
	var lines = this.rawData.split('\n');
	for (var line of lines) {
		var cols = line.split(',');
		var ticker = cols[0].replace(/"/g, '').trim();
		if (ticker.length > 0) {
			this.tickerList.push(ticker);
		}
	}
	setTimeout(this.getNextExchange.bind(this), THROTTLE_DELAY);
};

TickerListLoader.prototype.getNextExchange = function() {
	if (this.count === 0) {
		console.log(`Loading ticker lists from exchanges ${this.exchanges.join(', ')}.`);
	}
	this.count++;

	var nextExchange = this.exchanges.shift();
	if (nextExchange === undefined) {
		console.log('Finished loading ticker lists from all exchanges.');
		console.log(`Final tickerList =  ${JSON.stringify(this.tickerList)}`);
		this.callback(this.tickerList);
		return;
	}

	http.get(NASDAQ_TICKERS_URL + nextExchange, (response) => {
		if (response.statusCode !== 200) {
			console.log(`Error: Nasdaq server responded with status code ${response.statusCode}`);
			response.resume();
			return;
		}

		response.on('data', (chunk) => {
			this.rawData += chunk;
		});

		response.on('end', this.handleResponseEnd.bind(this));
	});
};

function main(args) {
	var tickerLoader = new TickerListLoader(['amex', 'nyse'], getNextTicker);
	tickerLoader.getNextExchange();
}

const args = process.argv;
main(args);
