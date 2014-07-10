// http://financials.morningstar.com/ajax/ReportProcess4HtmlAjax.html?&t=XNYS:GPS&region=usa&culture=en-US&cur=USD&reportType=is&period=12&dataType=A&order=asc&columnYear=5&rounding=3&view=raw&r=645954&callback=jsonp1404943419679
var $ = require('jQuery'),
	fs = require('fs'),
	jsdom = require('jsdom'),
	tickerList = [
		'AAPL',
		'ADBE',
		'ADI',
		'ADP',
		'ADSK',
		'AKAM',
		'ALTR',
		'ALXN',
		'AMAT',
		'AMGN',
		'AMZN',
		'ATVI',
		'AVGO',
		'BBBY',
		'BIDU',
		'BIIB',
		'BRCM',
		'CA',
		'CELG',
		'CERN',
		'CHKP',
		'CHRW',
		'CHTR',
		'CMCSA',
		'COST',
		'CSCO',
		'CTRX',
		'CTSH',
		'CTXS',
		'DISCA',
		'DISH',
		'DLTR',
		'DTV',
		'EBAY',
		'EQIX',
		'ESRX',
		'EXPD',
		'EXPE',
		'FAST',
		'FB',
		'FFIV',
		'FISV',
		'FOXA',
		'GILD',
		'GMCR',
		'GOOG',
		'GRMN',
		'HSIC',
		'ILMN'
	],
	outFileName = 'revenueData.csv';

fs.unlink(outFileName, function(err) {
	if (err) throw err;

	tickerList.forEach(function(ticker, idx) {
		setTimeout(function(){
			var params = {
				t: 'XNAS:' + ticker,
				region: 'usa',
				culture: 'en-US',
				cur: 'USD',
				reportType: 'is',
				period: '12',
				dataType: 'A',
				order: 'asc',
				columnYear: '5',
				rounding: '3',
				view: 'raw',
			};

			$.getJSON('http://financials.morningstar.com/ajax/ReportProcess4HtmlAjax.html', params, function(data) {
				//console.log( 'DATA.RESULT = ' + data.result );
				console.log('TICKER = ' + ticker);

				jsdom.env(data.result,
					['http://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js'],
					function(errors, window) {
						var revIdx = 0;
						window.jQuery('div').each(function(i) {
							if (i > 0 && i < 7 ) {
								var revenue = window.jQuery(this).text().trim();
								if (revenue !== 'null') {
									fs.appendFile(outFileName, revIdx + ',' + ticker + ',' + revenue + '\n', function(){
										//Callback for file append.
									});
									revIdx++;
								}
							}
						});
					}
				);
			});
		}, 1000*idx);
	});
});