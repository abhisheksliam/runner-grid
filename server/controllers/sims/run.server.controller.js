/**
 * Created by AbhishekK
 */
'use strict';

var util = require('../../utils');
var fs = require('fs');
var mkdirp = require('mkdirp');
var paramsHandler = require('./params.server.controller');
var Client = require('svn-spawn');

exports.runTask = function (req, res) {
    var commitQ = [];
    var processing = false;

    var currentTestId = util.getUUID();
    _io.emit(req.body.user.ip, 'Client: '+req.body.user.ip + ' requested.');

    paramsHandler.mapRunParams(req.body,currentTestId, function(params){ // mapping params

        /**
         * Handling user request for run / commit
         *
         */

        writeTestFile(params.task.filename,params.task.appName,params.task.java,params.task.xml,params.clientIp,
            function(){
                if (params.task.commit.toString() === 'true') {

                    var newCommit = {
                        clientIp: params.clientIp,
                        filename: params.task.filename,
                        appName: params.task.appName,
                        svn: {
                            username: params.svn.username,
                            password: params.svn.password
                        },
                        res: res
                    };

                    commitQ.push(newCommit);

                    if (!processing) {
                        processing = true;

                        nextRequest:
                        while (commitQ.length) {
                            var processEl = commitQ.shift();

                            /**
                             * if commit
                             */
                            _io.emit(processEl.clientIp + '-svn', "Committing files to SVN");
                            _io.emit(processEl.clientIp + '-svn', processEl.filename);
                            commitFileToSvn( processEl.filename, processEl.svn.username, processEl.svn.password, '', processEl.appName, processEl.res,
                                function (success){ // success
                                    if(!commitQ.length) {processing = false;}
                                    console.log("Files committed successfully");
                                    _io.emit(processEl.clientIp + '-svn', '<span style="color: green">Files committed successfully</span>');
                                    res.json(
                                        {
                                            error:"false",
                                            msg:"Files committed successfully"
                                        }
                                    );
                                },function (failure){ // failure
                                    if(!commitQ.length) {processing = false;}
                                    _io.emit(processEl.clientIp + '-svn', '<span style="color: red">Error in pushing files to svn.</span>');
                                    res.json(
                                        {
                                            error:"true",
                                            msg:"Error in pushing files to svn"
                                        }
                                    );
                                });
                        }

                    }
                }
                else {
                    /**
                     * else run and return
                     */

                    var cmd = params.command;

                    _io.emit(params.clientIp, JSON.stringify(req.body));
                    console.log('Client: '+params.clientIp);
                    console.log('running command ' + cmd);

                    _io.emit(params.clientIp, 'Running command ' + cmd);

                    var process = require('child_process');
                    var ls;

                    var options = { cwd: (_serverDirectory+"/server/lib/jf"),
                        env: process.env
                    };

                    ls = process.spawn('cmd.exe', ['/c', cmd], options);

                    ls.stdout.on('data', function(data){
                        // todo: preserve logs
                        _io.emit(params.clientIp, '<span style="color: black">' + util.ab2str(data) + '</span>');
                        //console.log(util.ab2str(data));
                    });

                    ls.stderr.on('data', function (data) {
                        _io.emit(params.clientIp, '<span style="color: red">' + util.ab2str(data) + '</span>');
                        //console.log(util.ab2str(data));
                    });

                    ls.on('exit', function (code) {
                        console.log('run command exited with code ' + code);
                    });

                    ls.on('close', function(code) {
                        console.log('closing code: ' + code);

                        function removeTestFromRunningList(arr) {
                            var what, a = arguments, L = a.length, ax, i=0;
                            while (L > 1 && arr.length) {
                                what = a[--L];
                                for (var i=arr.length-1; i>=0; i--) {
                                    if(arr[i].id === what.id){
                                        arr.splice(i, 1);
                                    }
                                }
                            }
                            return arr;
                        };

                        removeTestFromRunningList(_runningTests, {id:currentTestId});

                    });

                    res.json(
                        {
                            error:"false",
                            msg:"Script execution triggered on runner server"
                        }
                    );

                }

            },
            function(er) {
                _io.emit(params.clientIp, 'client: '+params.clientIp);
                _io.emit(params.clientIp, '<span style="color: red">' + er + '</span>');
                res.json(
                    {
                        error:"true",
                        msg:"Error in script execution on runner server"
                    }
                );
            }
        )

    });

};

function writeTestFile(filename,appName,java,xml,clientIp,done, err){

    _io.emit(clientIp, 'Creating files..');

    var _taskXmlPath = util.getDirFromXMlName(filename);

    var xmlDirectory = (_serverDirectory + "/server/lib/jf/src/test/resources/taskXML" + _taskXmlPath);
    var xmlfilepath = xmlDirectory + "/" + filename + '.xml';

    var javafilepath = (_serverDirectory+"/server/lib/jf/src/test/java/testcase/"+appName + "/Test_" + filename + '.java');

    if (!(fs.existsSync(xmlDirectory))){
        console.log('creating dir.. '+ xmlDirectory);
        mkdirp(xmlDirectory, function (err) {
            if (err) console.error(err)
            else {
                writeFilesToDisk (xmlfilepath,xml,javafilepath,java);
            }
        });
    } else {
        writeFilesToDisk (xmlfilepath, xml, javafilepath, java);
    }

    function writeFilesToDisk( xmlfilepath, xml, javafilepath, java ){

        var otherCompleted = false;
        fs.writeFile( xmlfilepath, xml, function(error) {
            if (error) {
                err("write error:  " + error.message);
                console.error("write error:  " + error.message);
            } else {
                if(otherCompleted) {
                    done();
                } else {
                    otherCompleted = true;
                }
                console.log("Successful Write to " + xmlfilepath);
            }
        });

        fs.writeFile( javafilepath, java, function(error) {
            if (error) {
                err("write error:  " + error.message);
                console.error("write error:  " + error.message);
            } else {
                if(otherCompleted) {
                    done();
                } else {
                    otherCompleted = true;
                }
                console.log("Successful Write to " + javafilepath);
            }
        });
    };

    console.log('writing.. '+ filename);
};

function commitFileToSvn(_filename,user, pass, svnUrl, app, res, success, failure){
    var _taskXmlPath = util.getDirFromXMlName(_filename);

    var javaFilePath = '/src/test/java/testcase/' + app + '/'+ 'Test_' + _filename + '.java';
    var jsonFilePath = '/src/test/resources/taskJSON' + _taskXmlPath + '/' + _filename + '.json';
    var xmlFilePath = '/src/test/resources/taskXML' + _taskXmlPath + '/' + _filename + '.xml';

            /**
             * commiting files to svn
             * todo: add to queue here & pop one by one
             * todo: change this to commit files from stream to svn url
             */

            var client = new Client({
                cwd: (_serverDirectory + '/server/lib/jf'),
                username: user, // optional if authentication not required or is already saved
                password: pass, // optional if authentication not required or is already saved
                noAuthCache: true // optional, if true, username does not become the logged in user on the machine
            });



    var otherCompleted = false;
    var commiterr = false;
    /**
     * Commiting java
     */
    client.commit(['SIMS-0000', (_serverDirectory + '/server/lib/jf' + javaFilePath)], function(err, data) {
        if (err) {
            client.add(_serverDirectory + '/server/lib/jf' + javaFilePath, function(err, data) {
                if (err) {
                    if(otherCompleted) {
                        failure();
                    } else {otherCompleted = true;commiterr=true;}
                } else {
                    client.commit(['SIMS-0000', (_serverDirectory + '/server/lib/jf' + javaFilePath)], function(err, data) {
                        if (err) {
                            if(otherCompleted) {
                                failure();
                            } else {otherCompleted = true;commiterr=true;}
                        }
                        if(otherCompleted && (!commiterr)) {
                            success();
                        } else if(otherCompleted && commiterr) {
                            failure();
                        } else {otherCompleted = true;}
                    });
                }

            });
        } else {
            if(otherCompleted && (!commiterr)) {
                success();
            } else if(otherCompleted && commiterr) {
                failure();
            } else {otherCompleted = true;}
        }

    });

    /**
     * Commiting XML
     */
    client.commit(['SIMS-0000', (_serverDirectory + '/server/lib/jf' + xmlFilePath)], function(err, data) {
        if (err) {
            client.add(_serverDirectory + '/server/lib/jf' + xmlFilePath, function(err, data) {
                if (err) {
                    if(otherCompleted) {
                        failure();
                    } else {otherCompleted = true;commiterr=true;}
                } else {
                    client.commit(['SIMS-0000', (_serverDirectory + '/server/lib/jf' + xmlFilePath)], function(err, data) {
                        if (err) {
                            if(otherCompleted) {
                                failure();
                            } else {otherCompleted = true;commiterr=true;}
                        }
                        if(otherCompleted && (!commiterr)) {
                            success();
                        } else if(otherCompleted && commiterr) {
                            failure();
                        } else {otherCompleted = true;}
                    });
                }
            });
        } else {
            if(otherCompleted && (!commiterr)) {
                success();
            } else if(otherCompleted && commiterr) {
                failure();
            } else {otherCompleted = true;}
        }

    });

};

