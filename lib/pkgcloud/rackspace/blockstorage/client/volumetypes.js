/*
 * volumetypes.js: Instance methods for working with VolumeTypes from CloudBlockStorage
 *
 * (C) 2013 Rackspace
 *      Ken Perkins
 * MIT LICENSE
 *
 *
 */
var errs = require('errs'),
    VolumeType = require('../volumetype').VolumeType;

exports.getVolumeTypes = function(callback) {
  var self = this;
  return this.request({
    path: 'types'
  }, function (err, body, res) {
    return err
      ? callback(err)
      : callback(null, body['volume_types'].map(function (data) {
      return new VolumeType(self, data);
    }), res);
  });
};

exports.getVolumeType = function (volumetype, callback) {
  var volumeTypeId = volumetype instanceof VolumeType ? volumetype.id : volumetype;

  var self = this;
  return this.request({
    path: 'types/' + volumeTypeId
  }, function (err, body) {
    return err
      ? callback(err)
      : callback(null, new VolumeType(self, body['volume_type']));
  });
};