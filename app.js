var express = require('express');
var http = require('http');
var cors = require('cors');

var app = express();

app.use(cors());
app.set('port', process.env.PORT || 3000);

XMLHttpRequest = require("./XMLHttpRequest.js").XMLHttpRequest;
require("./progress.js");
require("./progress.session.js");
var serviceURI = "http://oemobiledemo.progress.com/MobilityDemoService";
var catalogURI = "http://oemobiledemo.progress.com/MobilityDemoService/static/mobile/MobilityDemoService.json";


var server = http.createServer(app);
/*
app.all('*', function(req, res)
{
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
 });
*/

server.listen(app.get('port'), function()
{
	console.log('express server listening on port ' + app.get('port'));
});

app.get('/home', function(req, res)
{
	res.sendfile('public/index.html');
});

app.get('/test', function(req, res)
{
	console.log('hello');
	session = new progress.data.Session();
	session.login(serviceURI, "", "");
	session.addCatalog(catalogURI);

	jsdo = new progress.data.JSDO({ name: 'dsCustomer' });
	jsdo.subscribe('AfterFill', onAfterFillCustomers, this);
	jsdo.fill();
	var arr = [];

	function onAfterFillCustomers(jsdo, success, request)
	{
		jsdo.eCustomer.foreach(function(customer)
		{
			arr.push({name: jsdo.eCustomer.Name, address: jsdo.eCustomer.Address,
						city: jsdo.eCustomer.City, state: jsdo.eCustomer.State});
		});
		console.log(arr);
		res.write(JSON.stringify(arr));
		res.end();
	}
});

app.get('/test2', function(req, res)
{
	console.log('test2');
	res.write('test2');
	res.end();
});
