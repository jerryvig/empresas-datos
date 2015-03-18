// http://financials.morningstar.com/ajax/ReportProcess4HtmlAjax.html?&t=XNYS:GPS&region=usa&culture=en-US&cur=USD&reportType=is&period=12&dataType=A&order=asc&columnYear=5&rounding=3&view=raw&r=645954&callback=jsonp1404943419679
//'use strict';

var goog = require('closure').Closure(),
	fs = require('fs');
XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest

goog.require('goog.net.XhrIo');
goog.require('goog.Uri');

var RecogerMorningstar = function() {
	this.TICKER_LIST_FILE = 'NDX.csv';
	this.OUTPUT_FILE_NAME = 'revenueData.csv';
	this.MORNINGSTAR_BASE_URL = 'http://financials.morningstar.com/ajax/ReportProcess4HtmlAjax.html';
	this.TIME_INTERVAL = 1200;
};

RecogerMorningstar.prototype.init = function() {
	fs.readFile(this.TICKER_LIST_FILE, goog.bind(this.OnTickerListLoaded, this));
};

RecogerMorningstar.prototype.OnTickerListLoaded = function(err, data) {
	this.tickerList = (new String(data)).split('\n');
	console.log('output_file_name = ' + this.OUTPUT_FILE_NAME);
	fs.exists(this.OUTPUT_FILE_NAME, goog.bind(function(exists) {
		if (exists) {
			fs.unlink(this.OUTPUT_FILE_NAME, goog.bind(this.LoopTickerList, this));
		} else {
			this.LoopTickerList();
		}
	}, this));
};

RecogerMorningstar.prototype.LoopTickerList = function(err) {
	if (err) throw err;

	this.tickerList.forEach(goog.bind(function(ticker, idx) {
		setTimeout(goog.bind(this.SendRequest, this, ticker), this.TIME_INTERVAL*idx);
	}, this));
};

RecogerMorningstar.prototype.SendRequest = function(ticker) {
	var queryParams = {
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
	var uri = new goog.Uri(this.MORNINGSTAR_BASE_URL);
	for (var key in queryParams) {
		uri.setParameterValue(key, queryParams[key]);
	}

	goog.net.XhrIo.send(uri, goog.bind(this.HandleResponse, this, ticker));
};

RecogerMorningstar.prototype.HandleResponse = function(ticker, e) {
	console.log('TICKER = ' + ticker);
	var nextBlock = e.target.getResponseJson().result;
	var revIdx = 0;

	for (var i=0; i<6; i++) {
		var divIdx1 = nextBlock.indexOf('<div>');
		var block2 = nextBlock.substring(divIdx1+5);
		var endDivIdx = block2.indexOf('</div>');
		var revenue = block2.substring(0, endDivIdx);
		if (revenue != 'null') {
			fs.appendFile(this.OUTPUT_FILE_NAME, revIdx + ',' + ticker + ',' + revenue + '\n', function() {});
			revIdx++;
		}
		nextBlock = block2.substring(endDivIdx+6);
	}
};

var recogedor = new RecogerMorningstar();
recogedor.init();
