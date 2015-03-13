// http://financials.morningstar.com/ajax/ReportProcess4HtmlAjax.html?&t=XNYS:GPS&region=usa&culture=en-US&cur=USD&reportType=is&period=12&dataType=A&order=asc&columnYear=5&rounding=3&view=raw&r=645954&callback=jsonp1404943419679
var $ = require('jQuery'),
	fs = require('fs'),
	jsdom = require('jsdom');

const TICKER_LIST_FILE = 'NDX.csv', 
	OUTPUT_FILE_NAME = 'revenueData.csv',
	MORNINGSTAR_BASE_URL = 'http://financials.morningstar.com/ajax/ReportProcess4HtmlAjax.html',
	TIME_INTERVAL = 1200;

fs.readFile(TICKER_LIST_FILE, function(err, data) {
	var tickerList = (new String(data)).split('\n');

	fs.unlink(OUTPUT_FILE_NAME, function(err) {
		if (err) throw err;

		tickerList.forEach(function(ticker, idx) {
			setTimeout(function(){
				var params = {
					t: 'XNAS:' + ticker,
					region: 'usa',
					culture: 'en-US',
					reportType: 'is',
					period: '12',
					dataType: 'A',
					order: 'asc',
					columnYear: '5',
					rounding: '3',
					view: 'raw',
				};

				$.getJSON(MORNINGSTAR_BASE_URL, params, function(data) {
					// console.log( 'DATA.RESULT = ' + data.result );
					console.log('TICKER = ' + ticker);

					jsdom.env(data.result,
						['http://ajax.googleapis.com/ajax/libs/jquery/1.11.2/jquery.min.js'],
						function(errors, window) {
							var revIdx = 0;
							window.jQuery('div').each(function(i) {
								if (i > 0 && i < 7 ) {
									var revenue = window.jQuery(this).text().trim();
									if (revenue !== 'null') {
										fs.appendFile(OUTPUT_FILE_NAME, revIdx + ',' + ticker + ',' + revenue + '\n', function(){
											//Callback for file append.
										});
										revIdx++;
									}
								}
							});
						}
					);
				});
			}, TIME_INTERVAL*idx);
		});
	});
});
