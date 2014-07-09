// http://financials.morningstar.com/ajax/ReportProcess4HtmlAjax.html?&t=XNYS:GPS&region=usa&culture=en-US&cur=USD&reportType=is&period=12&dataType=A&order=asc&columnYear=5&rounding=3&view=raw&r=645954&callback=jsonp1404943419679
var $ = require('jQuery'),
	jsdom = require('jsdom'),
	tickerList = [
		'GOOG',
		'AAPL',
		'MSFT',
		'INTC',
		'FB',
		'COST',
		'AMZN'
	];

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

			jsdom.env(data.result,
				['http://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js'],
				function(errors, window) {
					var revIdx = 0;
					window.jQuery('div').each(function(i) {
						if (i > 0 && i < 7 ) {
							var revenue = window.jQuery(this).text().trim();
							if (revenue !== 'null') {
								console.log(revIdx + ',' + ticker + ',' + revenue);
								revIdx++;
							}
						}
					});
				}
			);
		});
	}, 1000*idx);
});