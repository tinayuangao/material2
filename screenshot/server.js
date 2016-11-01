'use strict';

const Hapi = require('hapi');

const server = new Hapi.Server();

const https = require('https');
const url = require('url');
const qs = require('querystring');
const randomstring = require('randomstring');
const mapnik = require('mapnik');
//const screenshot = require('./_screenshot.js');

var access_token;
var myhost = 'http://fa1add4c.ngrok.io';
var repo = 'tinayuangao/test';
var personal_token = 'f48eab6bb937e6b8396e532e7f2fe14877d4c46c';
var client_id = '325805fefb07da168877';
var client_secret = '86327cb73d5717b67be3b26a1b034d2665417cad';
var host = 'github.com';
var apihost = 'api.github.com';

server.connection({
  port: 4567,
  routes: {
    cors: {
      origin: ['*'],
      additionalHeaders: ['token']
    }
  }
});

server.route({
  method: 'GET',
  path: '/pull/{id}/start',
  handler: function (request, reply) {
    reply('Hello, start compare diff for id ' + request.params.id + '!');
    // Pull latest commit from GitHub
    var id = request.params.id;
    var url = 'pull/' + id + '/diff';
    var approved = 'success';
    getPullRequest(id, personal_token, function(pull_request) {
      var sha = pull_request.head.sha;
      var branch = pull_request.head.ref;
      var user = pull_request.head.user.login;
      var repo = pull_request.head.repo.name;
      console.log('id: ' + id + ' sha: ' + sha + ' branch: ' + branch + ' user: ' + user + ' repo: ' + repo);

      //var
      //    a = new Image(),
      //    b = new Image();
      //a.src = 'https://avatars2.githubusercontent.com/u/20677343?v=3&s=466';
      //b.src = 'http://humblesoftware.github.io/js-imagediff/images/1_normal_a.jpg';
    });
    // Pull PR from GitHub
    // Run in VM
    // -- git clone git@github.com:user/repo.git
    // -- cd repo
    // -- git reset --hard sha
    // -- *install node
    // -- *instlal gulp
    // -- npm install
    // -- gulp e2e
    // -- *exit if some tests failed
    // Compare screenshots
    // -- nvm install 4.6.1
    // -- nvm use 4.6.1
    // -- npm install -g mapnik
    //
    // Update GitHub
  }
});

server.route({
  method: 'GET',
  path: '/pull/{id}/diff',
  handler: function (request, reply) {
    var id  = request.params.id;
    var approve = '<a href="/pull/' + id + '/approve"> Approve</a>';
    var nopermission = 'You have no permission to approve';
    var redirect_url = myhost + '/pull/' + id + '/diff';
    login(request, reply, redirect_url, function(access_token) {
      checkPermission(id, access_token, reply, approve, nopermission);
    });
    // Display diff images
    // -- Get images from Google Cloud
  }
});

var login = function(request, reply, url, cb) {
  var code = request.query.code;
  if (access_token == undefined && code == undefined) {
    getSessionCode(url, reply);
  } else if (access_token == undefined && code != undefined) {
    getAccessToken(code, function(access_token) {
      cb(access_token);
    });
  } else {
    cb(access_token);
  }
};

var getSessionCode = function(redirect_url, reply) {
  var params = {
    client_id: client_id,
    state: randomstring.generate(),
    redirect_uri: redirect_url
  };
  var options = {
    host: host,
    path: '/login/oauth/authorize?' + qs.stringify(params),
    method: 'GET',
    followAllRedirects: true,
    headers: {
      'Accept': '*/*',
      'Connection': 'close',
      'User-Agent': 'Node authentication',
      'followAllRedirects': true
    }
  };
  var req = https.request(options, (res) => {
    var str = '';
    res.on('data', (d) => {
      str += d;
    });

    res.on('end', () => {
      reply(str);
    });
  });
  req.end();
  req.on('error', (e) => {
    console.log('error ', e);
  });
};

var getAccessToken = function(session_code, cb) {
  var options = {
    host: host,
    path: '/login/oauth/access_token?client_id=' + client_id + '&client_secret=' + client_secret + '&code=' + session_code,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Node authentication'
    }
  };
  var req = https.request(options, (res) => {
    var str = '';
    res.on('data', (d) => {
      str += d;
    });

    res.on('end', () => {
      access_token = qs.parse(str)['access_token'];
      cb(access_token);
    });
  });
  req.end();
  req.on('error', (e) => {
    console.log(e);
  });
};


server.route({
  method: 'GET',
  path: '/pull/{id}/approve',
  handler: function (request, reply) {
    var id = request.params.id;
    var url = 'pull/' + id + '/approve';
    var approved = 'success';
    getPullRequest(id, personal_token, function(pull_request) {
      var sha = pull_request.head.sha;
      login(request, reply, url, function(access_token) {
        checkPermission(id, access_token, function(result) {
          if (result == approved) {
            updateStatus(id, sha, 'success', reply);
          } else {
            reply('Sorry. You have no permisssion to approve');
          }
        }, approved);
      });
    });
  }
});

var checkPermission = function(id, access_token, reply, approve, nopermission) {
    getRepo(access_token, function(result) {
      var permission = result.permissions.push;
      if (permission) {
        reply(approve);
      } else {
        reply(nopermission);
      }
    });
};


var sendRequest = function(path, access_token, cb, data) {
  var params = {
    'access_token': access_token
  };
  var options = {
    host: apihost,
    path: path + '?' + qs.stringify(params),
    method: data == null ? 'GET' : 'POST',
    headers: {
      'User-Agent': 'Image diff tool'
    }
  };
  var req = https.request(options, (res) => {
    var str = '';
    res.on('data', (d) => {
      str += d;
    });
    res.on('end', () => {
      var result = JSON.parse(str);
      cb(result);
    });
  });
  if (data != null) {
    req.write(data);
  }
  req.end();
  req.on('error', (e) => {
    console.log('error ', e);
  });
};

var getRepo = function(access_token, cb) {
    var path = '/repos/' + repo;
    sendRequest(path, access_token, cb);
};

var getPullRequest = function(id, access_token, cb) {
    var path = '/repos/' + repo + '/pulls/' + id;
    sendRequest(path, access_token, cb);
};

var updateStatus = function(id, sha, state, cb) {
    var data = {
      state: state,
      target_url: myhost + '/pull/' + id + '/diff',
    };
    var path = '/repos/' + repo+ '/statuses/' + sha;
    console.log('path is  ' + path);
    sendRequest(path, personal_token, function(result) {
      console.log(result.state);
      cb(result.state);
    }, JSON.stringify(data));
    /*var options = {
      host: apihost,
      path: '/repos/' + repo+ '/statuses/' + sha + '?' + qs.stringify(params),
      method: 'POST',
      headers: {
        'User-Agent': 'Image diff tool'
      }
    };
    var req = https.request(options, (res) => {
      reply(res);
    });
    req.write(JSON.stringify(data));
    req.end();
    req.on('error', (e) => {
      console.log('error ', e);
    });*/
};

server.route({
  method: 'POST',
  path: '/payload',
  handler: function(request, reply) {
    var id = request.payload.number;
    var sha = request.payload.pull_request.head.sha;
    var state = 'pending';
    updateStatus(id, sha, state, function(res) {
      //screenshot('demo page: index');
      reply(res);
    });
    // trigger diff
  }
});

server.start((err) => {
  if (err) {
    throw err;
  }
  console.log('Server running at:', server.info.uri);
});
