var http = require('http');
var fs = require('fs');
var qs = require('querystring');
var files = {};
var myArray = [];

function read(ParamsWithValue,response,wait){
		//see if there is anything to read
		//plenty of options to expand the logic on this
		var line = "";
		if (!files[ParamsWithValue.FILENAME]){files[ParamsWithValue.FILENAME] = [];}
		if (files[ParamsWithValue.FILENAME].length == 0){
			//console.log("empty");
			if (wait == 0){
				var output = "{\"status\" : \"ko\", \"value\": \"timeout\"}";
				response.end(output);
			}
			else{
				//break;
				setTimeout(read, 1000, ParamsWithValue,response,wait - 1000);
			}			
		}
		else{
			var output = "";
			if (ParamsWithValue.READ_MODE == "FIRST"){
				//keep the value or not?
				if (ParamsWithValue.KEEP == "TRUE"){line = files[ParamsWithValue.FILENAME][0];}
				else{line = files[ParamsWithValue.FILENAME].shift();}
				output = "{\"status\" : \"ok\", \"value\": \"" + line + "\"}";
			}
			else if (ParamsWithValue.READ_MODE == "RANDOM"){
				var randomValue = Math.floor(Math.random() * files[ParamsWithValue.FILENAME].length)
				//keep the value or not?
				line = files[ParamsWithValue.FILENAME][randomValue];
				if (ParamsWithValue.KEEP == "FALSE"){files[ParamsWithValue.FILENAME].splice(randomValue,1);}
				output = "{\"status\" : \"ok\", \"value\": \"" + line + "\"}";
			}
			else if (ParamsWithValue.READ_MODE == "LAST"){
				//must be last
				//keep the value or not?
				if (ParamsWithValue.KEEP == "TRUE"){line = files[ParamsWithValue.FILENAME][files[ParamsWithValue.FILENAME].length -1];}
				else{line = files[ParamsWithValue.FILENAME].pop();}
				output = "{\"status\" : \"ok\", \"value\": \"" + line + "\"}";
			}
			else if (ParamsWithValue.READ_MODE == "ITEM"){
				try{
					line = files[ParamsWithValue.FILENAME][ParamsWithValue.ITEM_NUMBER];
					if (ParamsWithValue.KEEP == "FALSE"){files[ParamsWithValue.FILENAME].splice(ParamsWithValue.ITEM_NUMBER,1);}
					output = "{\"status\" : \"ok\", \"value\": \"" + line + "\"}";
				}
				catch (err){output = "{\"status\" : \"ok\", \"value\": \"" + err.message + "\"}";}
			}
			else{
				output = "{\"status\" : \"ko\", \"value\": \"issue reading parameter READ_MODE - " + ParamsWithValue.READ_MODE + "\"}";	
			}
			
			response.end(output);
		}
}

http.createServer(function (request, response) {
	var ParamsWithValue = qs.parse(require('url').parse(request.url).query);
	var pathName = require('url').parse(request.url).pathname;
	var fileName = ParamsWithValue.FILENAME;
	response.writeHead(200, {"Content-type": "application/json"});
    switch(pathName) {
    case "/fts/ADD":
		if (ParamsWithValue.ADD_MODE == "FIRST"){
			if (!files[fileName]) { files[fileName] = []; }
			files[fileName].unshift(ParamsWithValue.LINE);
		}
		else{
			if (!files[fileName]) { files[fileName] = []; }
			files[fileName].push(ParamsWithValue.LINE);
		}
		var output = "{\"status\" : \"ok\", \"" + fileName + "\": \"" + files[fileName].length + "\"}";
		response.end(output);
        break;
    case "/fts/READ":
		//read from the list waiting up to the the timeout
		read(ParamsWithValue,response,ParamsWithValue.WAIT_MS);
        break;
    case "/fts/INITFILE":
		//load data from a file
		fs.readFile(fileName, function(err, data) {
			if(err){
				response.end("{\"status\" : \"ko\", \"value\": \"" + fileName + "\"}");
				console.log("error performing initfile on:" + fileName);
			};
			//remove nasty Windows carriage returns
			var fileData = data.toString().replace(/\r/gi, '');
			var dataArray = fileData.split("\n");
			//console.log(dataArray);
			files[fileName] = dataArray;
			//console.log(files[fileName]);
			var output = "{\"status\" : \"ok\", \"" + fileName + "\": \"" + files[fileName].length + "\"}";
			response.end(output);
		});
		break;
    case "/fts/SAVE":
        //write back to file
		var fileString = files[fileName].join("\r\n");
		fs.writeFile(fileName, fileString, function(err) {
			if(err) {response.end("{\"status\" : \"ko\", \"value\": \"" + fileName + "\"}");	console.log("error writing to file:" + fileName);}
			var output = "{\"status\" : \"ok\"}"
			console.log(fileName + " was saved!");
			response.end(output);
		}); 
        break;
    case "/fts/RESET":
        //get the filename and remove all elements for that file
		files[fileName] = [];
		var output = "{\"status\" : \"ok\", \"" + fileName + "\": \"" + files[fileName].length + "\"}";
		response.end(output);
        break;
	case "/fts/LENGTH":
        //return the length
		if (!files[fileName]) { files[fileName] = []; }
        fileLength = files[fileName].length;
		var output = "{\"status\" : \"ok\", \"" + fileName + "\": \"" + files[fileName].length + "\"}";
		response.end(output);
        break;		
    case "/fts/STATUS":
        //get the list of files and return count for each one
		response.write("{\"status\" : \"ok\", \"files\" : {");
		var filesKeys = Object.keys(files);
		for (var i = 0; i < filesKeys.length; i++) {
			response.write("\"" + filesKeys[i] + "\": \"" + files[filesKeys[i]].length + "\"");
			if (i < filesKeys.length -1){response.write(", ");}
		}
		response.end("}}");
        break;		
    case "/fts/STOP":
        //stop the server... not sure about the value of this...
        break;
	case "/fts/LIST":
        //return the items in a list
		if (!files[fileName]) { files[fileName] = []; }
        fileLength = files[fileName].length;
		var output = "{\"status\" : \"ok\", \"" + fileName + "\": {" + files[fileName] + "}}";
		response.end(output);
        break;		
	default:
        response.end("{\"status\" : \"ko\"}");
	}
}).listen(12988);

console.log('Server running at http://127.0.0.1:12988/');