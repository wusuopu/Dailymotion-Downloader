'use strict';

const fs = require('fs');
const spawn = require('child_process').spawn;
const api = require('./src/api');
const async = require('async');
const _ = require('lodash');
const request = require('request');
const Curl = require('node-libcurl').Curl;

const QUALITY = 480;      // 默认下载 480p 的视频
if (process.argv.length < 3) {
  console.log('Usage:');
  console.log('\tnode index.js <video-url>');
  console.log('\tnode index.js <video-id>');
  console.log('\tnode index.js <playlist-url>');
  process.exit(1);
}

let url = process.argv[2];
if (!url.startsWith('http')) {
  url = `http://dailymotion.com/video/${url}`;
}

let data = api.parseURL(url);
if (!data.type) {
  console.log('url is invalid');
  process.exit(1);
}

function parseVideo(data, done) {
  // 解析得到视频的标题，以及id
  if (data.type === 'playlist') {
    api.parsePlayList(data.id, done);
  } else {
    api.parseVideo(data.id, (err, result) => {
      done(err, [result]);
    });
  }
}

function parseLink(videoID, done) {
  // 解析得到视频的下载地址
  let output = `${__dirname}/tmp/down-${videoID}.txt`;
  let casper = spawn('npm', ['run', 'parse', '--', videoID, output]);
  casper.on('close', (code) => {
    let error = code !== 0 ? {code} : null;
    done(error, output);
  });
}

function curlDownload(url, target, done) {
  let curl = new Curl();
  let fd = fs.createWriteStream(target);
  let totalLength = 0;
  let downloaded = 0;

  curl.setOpt('URL', url);
  curl.setOpt('FOLLOWLOCATION', true );

  curl._onEnd = function() {
    console.log('curl on end');
    curl.close();
    fd.end();
    done();
  };
  curl.on('data', function(chunk) {
    if (chunk.length > 0) {
      downloaded += chunk.length;
      fd.write(chunk, 'binary');
      console.log(`download: ${target} ${downloaded} / ${totalLength}`);
    }
  });
  curl.on('header', function(chunk) {
    let header = chunk.toString().trim().split(': ');
    if (header[0] === 'Content-Length') {
      totalLength = parseInt(header[1], 10);
    }
  });
  curl.on('error', function(err) {
    console.log('curl on error', err);
    curl.close();
    fd.end();
    fs.unlinkSync(target);
    done(err);
  });

  curl.perform();
}


function downloadVideo(video, next) {
  console.log(video.id, video.title);
  async.waterfall([
    (cb) => {
      parseLink(video.id, cb);
    },
    (output, cb) => {
      fs.readFile(output, {encoding: 'utf-8'}, cb);
    },
    (links, cb) => {
      links = links.split('\n');
      if (links.length === 0) {
        return cb('no invalid link');
      }

      let link = links[0];
      let pattern = new RegExp(`${QUALITY}/video`);
      _.each(links, (l) => {
        if (l.match(pattern)) {
          link = l;
        }
      });

      let target = `${__dirname}/download/${video.id}-${video.title}.mp4`;
      curlDownload(link, target, cb);
    }
  ], (error) => {
    error ? console.log('download error: ', video.id, error) : console.log('download finish.', video.id);
    return next(error);
  });
}

parseVideo(data, (err, result) => {
  if (err) {
    console.log(err);
    process.exit(2);
  }
  async.eachLimit(result, 1, downloadVideo, (err) => {
  });
});
