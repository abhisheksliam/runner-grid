/**
 * Created by AbhishekK on 9/13/2016.
 */

'use strict';

var util = require('../utils');
var fs = require('fs');

module.exports = function(app, config) {

    var process = require('child_process');
    var ls;

    //todo: change dir path
    var options = { cwd: "H:/runner-grid/server/lib",
        env: process.env
    };

    //todo: change dir path
    util.rmdirAsync('H:/runner-grid/server/lib/jf', function(){

        ls = process.spawn('cmd.exe', ['/c', 'git clone https://github.com/sim5runner/jf.git'], options);
        ls.stdout.on('data', function(data){
            console.log(util.ab2str(data));
        })

        ls.stderr.on('data', function (data) {
            console.log(util.ab2str(data));
        });

        ls.on('exit', function (code) {
            console.log('child process exited with code ' + code);
        });

    });

};