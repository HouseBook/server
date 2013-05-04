var _ = require('underscore'),
		restify = require('restify'),
		server = restify.createServer(),
		couch = require('nano')(process.env.COUCHDB);

setup(function(err) {
	if (err) {
		return console.log('ERROR: %s', err);
	}

	start();
});

/**
 * start
 */
function start() {
	/**
	 * plugins
	 */
	server.use(restify.bodyParser());

	/**
	 * create a new audio entry
	 */
	server.post('/audio', function(req, res, next) {
		var mlsid = req.params.mlsid,
				user = req.params.user,
				name = req.params.name,
				audio_raw = req.params.audio_raw,
				audio_text = req.params.audio_text;

		if (!mlsid) {
			return next(new restify.MissingParameterError('mlsid'));
		}

		if (!user) {
			return next(new restify.MissingParameterError('user'));
		}

		if (!name) {
			return next(new restify.MissingParameterError('name'));
		}

		if (!audio_raw) {
			return next(new restify.MissingParameterError('audio_raw'));
		}

		if (!audio_text) {
			return next(new restify.MissingParameterError('audio_text'));
		}

		var houses = couch.db.use('houses');

		houses.view('houses', 'by_user', { keys: [[mlsid, user]], include_docs: true }, function(err, body) {
			if (err) {
				return next(err);
			}

			var doc;
			if (body.rows.length > 0) {
				doc = body.rows[0].doc;
			}	else {
				doc = {
					mlsid: mlsid,
					user: user,
					rooms: []
				};
			}

			function findIndex(rooms, predicate) {
				for (var i=0; i<rooms.length; i++) {
					console.log(rooms[i].name.toUpperCase());
					console.log(name.toUpperCase());
					if (rooms[i].name.toUpperCase() === name.toUpperCase()) {
						return i;
					}
				}

				return -1;
			};

			var roomIdx = findIndex(doc.rooms);

			if (roomIdx < 0) {
				doc.rooms.push({
					name: name,
					audio: [{
						raw: audio_raw,
						text: audio_text
					}]
				});
			} else {
				doc.rooms[roomIdx].audio.push({
					raw: audio_raw,
					text: audio_text
				});
			}

			houses.insert(doc, function(err, body) {
				if (err) {
					return next(err);
				}

				res.send(201);
			});
		});
	});

	server.listen(8080, function() {
		console.log('READY!');
	});
};

/**
 * setup
 */
function setup(callback) {
	couch.db.list(function(err, body) {
		if (err) {
			return callback(err);
		}

		if (body.indexOf('houses') < 0) {
			return couch.db.create('houses', function(err, body) {
				if (err) {
					return callback(err);
				}

				var houses = couch.db.use('houses');

				houses.insert({
					views: {
						by_user: {
							map: function(doc) {
								emit([doc.mlsid, doc.user], doc._id);
							}
						}
					}
				}, '_design/houses', callback);
			});
		} else {
			return callback();
		}
	});
};