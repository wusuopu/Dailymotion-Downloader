'use strict';

var fs = require('fs');
var casper = require('casper').create({
  //pageSettings: {
  //  webSecurityEnabled: false
  //},
  //onResourceRequested: function(obj) {
  //  console.log('onResourceRequested: ', obj.getCurrentUrl());
  //},
  onError: function(msg, trace) {
    console.log('onError:', msg, trace);
  }
});
var url = casper.cli.args[0];
if (!url) {
  console.log('url arg needed.');
  casper.exit(1);
}

if (! /^http/.test(url)) {
  url = 'http://dailymotion.com/embed/video/' + url;
}
casper.start();
// 1. 打开 embed video 播放页面
casper
  //.open('http://dailymotion.com/embed/video/x3os0le')
  .open(url)
  .thenEvaluate(function() {
    // 2. 解析下载地址
    var appPath = 'http://savevideo.me/';
    var form = document.createElement("form");
    form.setAttribute("method","post");
    form.setAttribute("action",appPath);
    var hiddenField = document.createElement("input");
    hiddenField.setAttribute("type","hidden");
    hiddenField.setAttribute("name","url");
    hiddenField.setAttribute("value",document.location);
    form.appendChild(hiddenField);
    var hiddenField = document.createElement("input");
    hiddenField.setAttribute("type","hidden");
    hiddenField.setAttribute("name","src");
    hiddenField.setAttribute("value",document.body.innerHTML);
    form.appendChild(hiddenField);
    document.body.appendChild(form);
    form.submit();
  })
  .waitForUrl(/savevideo.me/)
  .then(function() {
    console.log('in save video site');
  })
  .waitForSelector('#ajaxresults .download_links p a')
  .then(function() {
    var id = url.split('/').slice(-1)[0];
    var output = './tmp/' + id + '-down.txt';
    var links = this.getElementsInfo('#ajaxresults .download_links p a');
    var str = '';
    for (var i in links) {
      var href = links[i].attributes.href;
      if (/^http/.test(href)) {
        str +=  href + '\n';
      }
    }
    if (output) {
      try {
        fs.write(output, str, 'w');
      } catch(e) {
        console.log('write error:', e);
      }
    } else {
      console.log(str);
    }
  })
;

casper.run(function() {
  this.echo('Done.').exit();
});
