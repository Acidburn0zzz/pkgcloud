/*
 * database.js: Database methods for working with databases from Azure Tables
 *
 * (C) Microsoft Open Technologies, Inc.
 *
 */

var errs = require('errs'),
  async = require('async'),
  auth = require('../../../common/auth'),
  templates = require('../../utils/templates'),
  azureApi = require('../../utils/azureApi.js'),
  PATH = require('path'),
  xml2JSON = require('../../utils/xml2json.js').xml2JSON,
  _ = require('underscore'),
  url = require('url');

exports.init = function (options) {
  this.serversUrl = options.serversUrl || azureApi.TABLES_ENDPOINT;
  this.version = azureApi.TABLES_API_VERSION;
  // add the auth keys for request authorization
  this.azureKeys = {};
  this.azureKeys.storageAccount = this.config.storageAccount;
  this.azureKeys.storageAccessKey = this.config.storageAccessKey;

  this.before.push(auth.azure.tablesSignature);
};


//  Create a new Azure Table Database
//  Need name of table to create
//  ### @options {Object} table create options.
//  ##### @options['name'] {String} Name of the new table.(required)
exports.create = function (options, callback) {

  var params = {},
    headers = {},
    self = this,
    body;

  if (!options || typeof options === 'function') {
    return errs.handle(errs.create({
      message: 'Options required to create a database.'
    }), Array.prototype.slice.call(arguments).pop());
  }

  // Check for name
  if (!options['name']) {
    return errs.handle(errs.create({
      message: 'options.name is a required option'
    }), Array.prototype.slice.call(arguments).pop());
  }

  params.name = options.name;
  params.date = new Date().toISOString();

  // async execute the following tasks one by one and bail if there is an error
  async.waterfall([
    function (next) {
      var path = PATH.join(__dirname, 'templates/createTable.xml');
      templates.load(path, next);
    },
    function (template, next) {
      // compile template with params
      body = _.template(template, params);
      //console.log(body);
      headers['content-length'] = body.length;
      self.request({
        method: 'POST',
        path: ['Tables'],
        body:body,
        headers: headers
      }, next, function (body, res) {
        xml2JSON(body,function(err, data) {
          return err ? next(err) : next(null, data);
        });
      });
    }],
    function (err, result) {
      if (err) {
        callback(err);
      } else {
        callback(null, self.formatResponse(result));
      }
    }
  );
};

//  List the Azure Tables in the current account
// ### @callback {Function} Continuation to respond to when complete. Returns array of Database objects.
exports.list = function (callback) {
  var tables = [],
    self = this;

  this.xmlRequest('GET', ['Tables'], callback, function (body, res) {
    if (body && body.entry) {
      if (_.isArray(body.entry)) {
        body.entry.forEach(function (table) {
          tables.push(self.formatResponse(table));
        });
      } else {
        tables.push(self.formatResponse(body.entry));
      }
    }
    callback(null,tables);
  });
};

// Delete a database
// ### @options {Object} Set of options can be
// #### options['id'] {String} id of the database to delete (required)
// ### @callback {Function} Continuation to respond to when complete.
exports.remove = function (id, callback) {
  var path;
  if (!id || typeof id === 'function') {
    return errs.handle(errs.create({
      message: 'id is a required argument'
    }), Array.prototype.slice.call(arguments).pop());
  }

  path = encodeTableUriComponent("Tables('" + id + "')");
  this.xmlRequest('DELETE', [path], callback, function (body, res) {
    callback(null, res.statusCode === 204)
  });
};

// Function formatResponse
// This function parse the response from the provider and return an object
// with the correct keys and values.
// ### @response {Object} The body response from the provider api
exports.formatResponse = function (response) {
  var database = {
    id: response.content['m:properties']['d:TableName'],
    host: this.url(),
    uri: response.id,
    username: '',
    password: ''
  };
  return database;
};

exports.url = function () {
  var args = Array.prototype.slice.call(arguments);
  var url = 'http://' + this.azureKeys.storageAccount + '.' + this.serversUrl + '/';
  if (args[0]) {
    url += args[0];
  }
  if (args[1]) {
    url += args[1];
  }

  return url;
};



// Encode a uri according to Azure Table rules
// ### @options {uri} The uri to encode
// ### @return {String} The encoded uri.
var encodeTableUriComponent = function (uri) {
  return encodeURIComponent(uri)
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
};