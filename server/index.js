var express = require('express');
var cors = require('cors');
var app = express();

app.use(cors({
  allowedHeaders: [
    'Link',
    'ETag',
    'If-Modified-Since',
    'Access-Control-Allow-Headers',
    'Authorization'
  ]
}));

app.use(express.static(__dirname + '/cache'));

app.listen(9000);
