//  Copyright 2014 © Progress Software
//  Contributor: David Inglis
//  A node server that accesses OpenEdge data through the jsdo protocol
// 	Then exposes this data over a REST interface

var express = require('express');
var http = require('http');
var cors = require('cors');

var app = express();
app.use(cors());
app.set('port', process.env.PORT || 3000);


// the jsdo dependencies
XMLHttpRequest = require("./XMLHttpRequest.js").XMLHttpRequest;
require("./progress.js");
require("./progress.session.js");

serviceURI = 'http://oemobiledemo.progress.com/MobilityDemoService';
catalogURI = 'http://oemobiledemo.progress.com/MobilityDemoService/static/mobile/MobilityDemoService.json';

var server = http.createServer(app);

server.listen(app.get('port'), function()
{
	console.log('express server listening on port ' + app.get('port'));
});

// responds to requests by grabbing the data using jsdo
// then serving the data as a response
app.get('/test', function(req, res)
{
	session = new progress.data.Session();
	session.login(serviceURI, "", "");
	session.addCatalog(catalogURI);
	jsdo = new progress.data.JSDO({ name: 'dsCustomer' });
	jsdo.subscribe('AfterFill', onAfterFillCustomers, this);
	jsdo.fill(); // fills the locally initialized jsdo from the catalog
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
	}
	res.end();
});

