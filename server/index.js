var express = require('express');
var cors = require('cors');
var app = express();

var corsed = cors({
  allowedHeaders: [
    'Link',
    'ETag',
    'If-Modified-Since',
    'If-None-Match',
    'Access-Control-Allow-Headers',
    'Authorization'
  ],
  exposedHeaders: [
    'Link',
    'ETag'
  ]
});

app.options('*', corsed);

app.use(corsed);

app.use(express.static(__dirname + '/cache'));

app.listen(9000);
