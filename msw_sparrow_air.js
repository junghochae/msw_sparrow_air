/**
* Created by Il Yeup, Ahn in KETI on 2020-09-04.
*/

/**
* Copyright (c) 2020, OCEAN
* All rights reserved.
* Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
* 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
* 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
* 3. The name of the author may not be used to endorse or promote products derived from this software without specific prior written permission.
* THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

// for TAS of mission

var mqtt = require('mqtt');
var fs = require('fs');
var spawn = require('child_process').spawn;

var my_msw_name = 'msw_sync_test';

var fc = {};
var config = {};

config.name = my_msw_name;

try {
  config.directory_name = msw_directory[my_msw_name];
  config.sorite_name = '/' + my_sortie_name;
  config.gcs = drone_info.gcs;
  config.drone = drone_info.drone;
  config.lib = [];
}
catch (e) {
  config.sortie_name = '';
  config.directory_name = '';
  config.gcs = 'KETI_MUV';
  config.drone = 'FC_MUV_01';
  config.lib = [];
}

config.directory_name = 'lib_sparrow_air';
const mlib_name = 'lib_sparrow_air';
const mlib_repository_url = 'https://github.com/IoTKETI/lib_sparrow_air.git';

try {
  if(fs.existsSync('./' + config.directory_name)) {
    setTimeout(git_pull, 10, mlib_name, config.directory_name);
  }
  else {
    setTimeout(git_clone, 10, mlib_name, config.directory_name, mlib_repository_url);
  }
}
catch (e) {
  console.log(e.message);
}

function git_clone(mlib_name, directory_name, repository_url) {
  try {
    require('fs-extra').removeSync('./' + directory_name);
  }
  catch (e) {
    console.log(e.message);
  }

  var gitClone = spawn('git', ['clone', repository_url, directory_name]);

  gitClone.stdout.on('data', function(data) {
    console.log('stdout: ' + data);
  });

  gitClone.stderr.on('data', function(data) {
    console.log('stderr: ' + data);
  });

  gitClone.on('exit', function(code) {
    console.log('exit: ' + code);

    setTimeout(requireMLib, 5000);
  });

  gitClone.on('error', function(code) {
    console.log('error: ' + code);
  });
}

function git_pull(mlib_name, directory_name) {
  try {
    if (process.platform === 'win32') {
      var cmd = 'git'
    }
    else {
      cmd = 'git'
    }

    var gitPull = spawn(cmd, ['pull'], { cwd: process.cwd() + '/' + directory_name });

    gitPull.stdout.on('data', function(data) {
      console.log('stdout: ' + data);
    });

    gitPull.stderr.on('data', function(data) {
      console.log('stderr: ' + data);
    });

    gitPull.on('exit', function(code) {
      console.log('exit: ' + code);

      setTimeout(requireMLib, 1000);
    });

    gitPull.on('error', function(code) {
      console.log('error: ' + code);
    });
  }
  catch (e) {
    console.log(e.message);
  }
}

function requireMLib() {
  addLib();
  init();
}

// library 추가
function addLib() {
  var add_lib = {};
  try {
    add_lib = {};
    add_lib = JSON.parse(fs.readFileSync('./' + config.directory_name + '/' + mlib_name + '.json', 'utf8'));
    config.lib.push(add_lib);
  }
  catch (e) {
    add_lib = {
      name: ' + mlib_name + ',
      target: 'armv6',
      description: "[name] [portnum] [baudrate]",
      scripts: './' + mlib_name + ' /dev/ttyUSB3 115200',
      data: ['AIR'],
      control: ['Control_AIR']
    };
    config.lib.push(add_lib);
  }
}
// 유저 디파인 미션 소프트웨어 기능
//////////////////////////////////////////////////////////////////////////////
function parseDataMission(topic, str_message) {
  try {
    // User Define Code
    var obj_lib_data = JSON.parse(str_message);
    if(fc.hasOwnProperty('global_position_int')) {
      Object.assign(obj_lib_data, JSON.parse(JSON.stringify(fc['global_position_int'])));
    }

    if(fc.hasOwnProperty('heartbeat')) {
      Object.assign(obj_lib_data, JSON.parse(JSON.stringify(fc['heartbeat'])));
    }

    if(fc.hasOwnProperty('attitude')) {
      Object.assign(obj_lib_data, JSON.parse(JSON.stringify(fc['attitude'])));
    }

    if(fc.hasOwnProperty('battery_status')) {
      Object.assign(obj_lib_data, JSON.parse(JSON.stringify(fc['battery_status'])));
    }

    str_message = JSON.stringify(obj_lib_data);
    ///////////////////////////////////////////

    var topic_arr = topic.split('/');
    let data_topic = '/Mobius/' + config.gcs + '/Mission_Data/' + config.drone + '/' + config.name + '/' + topic_arr[topic_arr.length - 1];
    msw_mqtt_client.publish(data_topic + '/' + sortie_name,, str_message);

  
}
  catch (e) {
    console.log('[parseDataMission] data format of lib is not json');
  }
}
///////////////////////////////////////////////////////////////////////////////

function parseControlMission(topic, str_message) {
  try {
    var topic_arr = topic.split('/');
    var _topic = '/MUV/control' + config.lib[0].name + '/' + topic_arr[topic_arr.length - 1];
    msw_mqtt_client.publish(_topic, str_message);
  
}
  catch (e) {
    console.log('[parseDataMission] data format of lib is not json');
  }
}

function parseFcData(topic, str_message) {
  var topic_arr = topic.split('/');
  if(topic_arr[topic_arr.length-1] == 'global_position_int') {
    var _topic = '/MUV/control' + config.lib[0].name + '/' + config.lib[1].control[1];
    msw_mqtt_client.publish(_topic, str_message);
  }


}
