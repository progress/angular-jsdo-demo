/*
var http = require('http');
var express = require('express');
*/

XMLHttpRequest = require("./XMLHttpRequest.js").XMLHttpRequest;
require("./progress.js");
require("./progress.session.js");
var express = require('express');
var http = require('http');

var serviceURI = "http://oemobiledemo.progress.com/MobilityDemoService";
var catalogURI = "http://oemobiledemo.progress.com/MobilityDemoService/static/mobile/MobilityDemoService.json";

session = new progress.data.Session();
session.login(serviceURI, "", "");
session.addCatalog(catalogURI);

jsdo = new progress.data.JSDO({ name: 'dsCustomer' });
jsdo.subscribe('AfterFill', onAfterFillCustomers, this);
jsdo.fill();

function onAfterFillCustomers(jsdo, success, request)
{
	jsdo.eCustomer.foreach(function(customer)
	{
		console.log(jsdo.eCustomer.Name);
	});
}


var app = express();

app.set('port', process.env.PORT || 3000);

var server = http.createServer(app);
server.listen(app.get('port'), function()
{
	console.log('listening on port' + app.get('port'));
});

app.get('/test', function(req, res)
{
	res.write('hello world');
	res.end();
});
