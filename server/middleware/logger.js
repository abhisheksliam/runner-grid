/**
 * Created by AbhishekK on 9/13/2016.
 */

'use strict';
//http://stackoverflow.com/questions/10987444/how-to-use-global-variable-in-node-js

module.exports = function(app, config) {
    /**
     * @type {Logger|exports}
     */
    const bunyan = require("bunyan");
    const bunyanformat = require('bunyan-format');
    const formatOut = bunyanformat({ outputMode: 'short' });
    const logger = bunyan.createLogger({name: 'RunnerGrid', stream: formatOut, level: 'info' });
};