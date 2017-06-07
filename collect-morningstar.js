const http = require('http');
const htmlparser = require('htmlparser2');
const BASE_URL = 'http://financials.morningstar.com/ajax/ReportProcess4HtmlAjax.html?&t='
const THROTTLE_DELAY = 1500;
const YEARS = ['Y_1', 'Y_2', 'Y_3', 'Y_4', 'Y_5', 'Y_6'];

function getNewHtmlParser() {
	var currentYear = null;
	var years = {};
	var parser = new htmlparser.Parser({
		onopentag: function(name, attrs) {
			if (name === 'div') {
				if (attrs.class === 'year' && YEARS.indexOf(attrs.id) !== -1) {
					currentYear = attrs.id;
				}
				if (attrs.class === 'pos' && YEARS.indexOf(attrs.id) !== -1 && attrs.rawvalue !== undefined) {
					console.log(attrs.rawvalue);
				}
			}
		},
		ontext: function(text) {
			if (currentYear !== null) {
				//console.log(currentYear + ' = ' + text);
				years[currentYear] = text.trim();
			}
		},
		onclosetag: function(name) {
			if (name === 'div') {
				currentYear = null;
			}
		}
	}, {decodeEntities: true});
	return {
		'parser': parser,
		'years': years
	};
}

function processResult(result) {
	var p = getNewHtmlParser();
	p.parser.write(result);
	p.parser.end();
	console.log(JSON.stringify(p.years));
}

function getNextTicker(tickers) {
	var nextTicker = tickers.pop();
	if (typeof nextTicker === 'undefined') {
		console.log('Finished retrieiving data for all tickers.');
		return;
	}

	console.log(`Retrieving data for ticker ${nextTicker}.`);
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
			//console.log(rawData);
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
	var tickers = ['AAPL', 'GOOGL', 'MSFT', 'FB', 'AMZN', 'NFLX', 'TSLA', 'TWTR', 'BABA', 'BIDU', 'PYPL', 'SPLK', 'SQ', 'CRM', 'TWLO', 'BOX'];
	getNextTicker(tickers);
}

const args = process.argv;
main(args);
