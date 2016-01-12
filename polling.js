var Appbase = require('appbase-js');

var Firebase = require("firebase");

var appbase_credentials = require('./appbase_credentials.json');

var Quotes = require('./quotes.json');

var appbase = new Appbase(appbase_credentials);

var game_duration = 60;
var end_duration = 10;
var begin_duration = 10;
var post_finish = 10;

var fm_quote = "Hello, this is just fo testing purpose. After some time quotes will be fetched randomly";

var quote_gl = "";

function get_news(callback){
	var ref = new Firebase("https://hacker-news.firebaseio.com/v0/");
	var itemRef;
	var ids = [];
	var quote = "";
	ref.child('topstories').on('value', function(snapshot) {
	    if(itemRef) {
	        itemRef.off();
	    }
	    itemRef = ref.child('item').child(snapshot.val()[Math.floor((Math.random() * snapshot.val().length) + 1)]);
	    itemRef.on('value',function(s){
	    	var item = s.val();
	    	if(item.type == "story"){
       				quote += item.title;
    		}
    		else if(tem.type == "comment"){
    			quote += item.text;
    		}
    		//console.log(quote);
    		if(quote.length > 40)
    			callback(quote);
	    });
	});
}

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
					  		if(res.hits.hits[i] != undefined){
						  		appbase.delete({
							    	type: 'users',
							      	id : res.hits.hits[i]._id
							    }).on('data', function(res) {
							      	console.log("successfully deleted: ", res);
							    }).on('error', function(err) {
							      	console.log("deletion error: ", err);
							    });
							}
					  	}
					}).on('error', function(err) {
						console.log("search error: ", err);
					});
					// get_news(function(s){
					// 	quote_gl = s;
					// });
      			}
      			if(response._source.countdown != "0"){
      				if(response._source.countdown != "infinity"){
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
						appbase.search({
							type: "users",
							body: {
						    	query: {
						      		match_all: {}
					    		}
					    	}
						}).on('data',function(res){
							if(res.hits != undefined && res.hits.total >= 1){
								response._source.countdown = begin_duration;
								response._source.quote = Quotes[Math.floor(Math.random()*Quotes.length)];
								game_duration = response._source.quote.length;
								appbase.index({
									type: 'board',
									id: '1',
									body: response._source
								}).on('data',function(res){
									console.log(res);
								}).on('error',function(err){
									console.log(err);
								});
							}
						})
					}
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
      						obj.countdown = "infinity";
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


/* This is the extra part which handles the case when everybody finishes the game before countdown.*/
appbase.getStream({
	type : 'board',
	id : '1'
}).on('data',function(response){
	if(response._source.lstatus == "running"){
		var flag = 1;
		appbase.search({
			type : 'users',
			body: {
					query: {
						match_all: {}
					}
				}
		}).on('data',function(res){
			var i = 0;
			for(i=0;i<res.hits.total;i++){
				if(res.hits.hits[i]._source.finish != "true"){
					flag = 0;
					break;
				}
			}
			if(flag == 1 && i == res.hits.total){
				appbase.index({
					type : 'board',
					id: '1',
					body: {lstatus : 'end', countdown : end_duration,}
				}).on('data',function(res){
					console.log(res);
				}).on('error',function(err){
					console.log(err);
				});
			}
		})
	}
}).on('error',function(err){
	console.log(err);
});

appbase.getStream({
    	type: 'board',
    	id: '1'
}).on('data',function(res){
	if(res._source.lstatus == "running"){
		appbase.search({
			type: 'users',
		    body: {
		        query: {
		            match : {"finish" : "true"}
		        }
		    }
		}).on('data', function(response) {
		    console.log("search, new match: ", response);
		    if(response.hits != undefined && response.hits.total >= 1 && parseInt(res._source.countdown) >= post_finish + 2){
		    	res._source.countdown = post_finish;
	    		appbase.index({
	    			type: 'board',
	    			id: '1',
	    			body: res._source
	    		}).on('data',function(res){
	    			console.log(res);
	    		}).on('error',function(err){
	    			console.log(err);
	    		});
		    }
		    
		}).on('error', function(error) {
		    console.log("caught a search error: ", error)
		});
	}
});

/* If anybody completes game much before then it reduces the countdown */
appbase.searchStream({
    type: 'users',
    body: {
        query: {
            match : {"finish" : "true"}
        }
    }
}).on('data', function(response) {
    console.log("searchStream(), new match: ", response);
    
}).on('error', function(error) {
    console.log("caught a searchStream() error: ", error)
});