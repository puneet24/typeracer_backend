var Appbase = require('appbase-js');

var appbase_credentials = require('./appbase_credentials.json');

var appbase = new Appbase(appbase_credentials);

appbase.index({
					    type: 'board',
					    id: '1',
					    body: {quote : 'this is awesome', countdown : '4', lstatus : 'begin'}
					}).on('data', function(response) {
					    console.log(response);
					}).on('error', function(error) {
					    console.log(error);
					});