var restify = require('restify');

var server = restify.createServer();

server.post('/', function(req, res, next) {
	
});

	server.listen(8080, function() {
		console.log('READY!');
	});