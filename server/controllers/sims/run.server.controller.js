/**
 * Created by AbhishekK
 */
'use strict';

//var io = require('socket.io')(server);

var util = require('../../utils');

exports.runTask = function (req, res) {

    /**
     * todo:
     * 1. establish 2way connection with client
     * 2. validate & save request data
     * 3. write files to lib/jf
     * 4. run mvn command
     * 5. show logs
     * 6. option to stop test

 post data json format

    {"command": "mvn test",
    "params": [
		"-DtestName=word.Test_GO16_WD_04_4A_01_A1",
		"-DbrName=firefox",
		"-Dnode=abhi",
		"-DhubIp=192.168.1.200",
		"-DhubPort=4444"
    ],
    "task": {
			"filename": "Test_GO16_WD_04_4A_01_A1",
			"xml": "xml file content",
			"java": "java file content"
			}
    }

     POST: http://RunnerGrid:8080/sims/runtask
     */

    var cmd = req.body.command + ' ' + req.body.params.join(" ");

    writeTestFile(req.body.task.filename,req.body.task.java,req.body.task.xml,
    function(){

        console.log('running command ' + cmd);

        var process = require('child_process');
        var ls;

        //todo: change dir path
        var options = { cwd: "H:/runner-grid/server/lib/jf",
            env: process.env
        }

        ls = process.spawn('cmd.exe', ['/c', cmd], options);



        ls.stdout.on('data', function(data){
            //console.log('tt')
            //io.emit('stream', {n:ab2str(data)});
            //io.sockets.on('connection', function (socket) {
            //io.sockets.broadcast.emit('stream', {n:data});
            //});

            console.log(util.ab2str(data));
        })

        ls.stderr.on('data', function (data) {
            //io.emit('stream', {n:ab2str(data)});

            console.log(util.ab2str(data));
        });

        ls.on('exit', function (code) {
            //io.emit('stream', {n:ab2str(code)});

            console.log('child process exited with code ' + code);
        });

        res.end("cmd started.");
    },
    function(er) {

    }
    )
    //res.json({});
};

function writeTestFile(filename,java,xml,done, err){

    // todo: write java & xml files
    console.log('writing.. '+ filename);

    done();

};
