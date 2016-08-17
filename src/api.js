'use strict';

const request = require('request');
const URL = require('url-parse');
const async = require('async');


function parsePlayList(id, cb, page) {
  // 获取一个 PlayList 下的所有视频
  page = page || 1;
  let u = `https://api.dailymotion.com/playlist/${id}/videos?page=${page}`;
  async.waterfall([
    function getPlayListInfo( next ) {
      request({ method: 'GET', uri: u }, next);
    },
    function parseResult( res, body, next ) {
      if (res.statusCode !== 200) {
        return next({code: res.statusCode});
      }
      let result;
      try {
        result = JSON.parse(body);
      } catch(e) {
        return next(e);
      }

      if (result.error) {
        return next(result.error);
      }
      if (result.has_more) {
        parsePlayList(id, (err, list) => {
          if (err) {
            return next(null, result.list);
          }
          next(null, result.list.concat(list));
        }, page + 1);
      } else {
        next(null, result.list);
      }
    }
  ], cb);
}

function parseVideo(id, cb) {
  let u = `https://api.dailymotion.com/video/${id}`;
  request({ method: 'GET', uri: u }, (err, res, body) => {
    if (err) {
      return cb(err);
    }
    if (res.statusCode !== 200) {
      return cb({code: res.statusCode});
    }
    let result;
    try {
      result = JSON.parse(body);
    } catch(e) {
      return cb(e);
    }

    if (result.error) {
      return cb(result.error);
    }
    cb(null, result);
  });
}

function parseURL(url) {
  let u = new URL(url, true);
  let result = {
    id: u.pathname.split('/').slice(-1)[0].split('_')[0]
  };
  if (u.pathname.startsWith('/playlist/')) {
    result.type = 'playlist';
  } else if (u.pathname.startsWith('/video/')) {
    result.type = 'video';
  } else if (u.pathname.startsWith('/embed/video/')) {
    result.type = 'video';
  }

  return result;
}

module.exports = {
  parsePlayList,
  parseVideo,
  parseURL
};
