var Appbase = require('appbase-js');

var appbase_credentials = require('./appbase_credentials.json');

var appbase = new Appbase(appbase_credentials);

var game_duration = 60;
var end_duration = 10;
var begin_duration = 10;

function start_polling(){
	function poll() {
	    setTimeout(function() {
	      	appbase.get({
      			type: 'board',
      			id: '1'
			}).on('data', function(response) {
      			console.log(response);
      			if(response._source.lstatus == "end" && parseInt(response._source.countdown) <= 2){
      				appbase.search({
						type: "users",
					  	body: {
					    	query: {
					      		match_all: {}
					    	}
					 	}
					}).on('data', function(res) {
						console.log("query result: ", res);
					  	for(var i=0;i<res.hits.total;i++){
					  		appbase.delete({
						    	type: 'users',
						      	id : res.hits.hits[i]._id
						    }).on('data', function(res) {
						      	console.log("successfully deleted: ", res);
						    }).on('error', function(err) {
						      	console.log("deletion error: ", err);
						    });
					  	}
					}).on('error', function(err) {
						console.log("search error: ", err);
					});
      			}
      			if(response._source.countdown != "0"){
      				var obj = response._source;
      				obj.countdown = parseInt(obj.countdown)-1;
      				appbase.index({
					    type: 'board',
					    id: '1',
					    body: obj
					}).on('data', function(response) {
					    console.log(response);
					}).on('error', function(error) {
					    console.log(error);
					});
      			}
      			else{
      				var obj = response._source;
      				switch(obj.lstatus){
      					case "begin" : 
      						obj.lstatus = "running";
      						obj.countdown = game_duration;
      						break; 
      					case "running" :
      						obj.lstatus = "end";
      						obj.countdown = end_duration;
      						break;
      					case "end" : 
      						obj.lstatus = "begin";
      						obj.countdown = begin_duration;
      						break;
      				}
      				appbase.index({
					    type: 'board',
					    id: '1',
					    body: obj
					}).on('data', function(response) {
					    console.log(response);
					}).on('error', function(error) {
					    console.log(error);
					});
      			}
			}).on('error', function(error) {
      			console.log(error)
			})
	      	poll();
	    }, 1000);
	 };
	 poll(); 
}

start_polling();