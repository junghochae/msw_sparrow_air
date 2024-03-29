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

let mqtt = require('mqtt');
let fs = require('fs');
let spawn = require('child_process').spawn;

let my_msw_name = '';

let fc = {};
let config = {};

let sortie_name
try {
  sortie_name = my_sortie_name
}
catch(e) {
  sortie_name = process.argv[2]
}

config.name = my_msw_name;

try {
  try {    // for nCube-MUV (NodeJs)
    config.directory_name = msw_directory[my_msw_name];
    config.sortie_name = '/' + sortie_name;
    config.gcs = drone_info.gcs;
    config.drone = drone_info.drone;
    config.lib = [];
  }
  catch (e) {    // for nCube-MUV-Python
    config.directory_name = process.argv[3];
    config.sortie_name = '/' + sortie_name;
    config.gcs = process.argv[4];
    config.drone = process.argv[5];
    config.lib = [];
  }
}
catch(e) {
  config.sortie_name = '';
  config.directory_name = '';
  config.gcs = 'KETI_MUV';
  config.drone = 'FC_MUV_01';
  config.lib = [];
}

config.directory_name = 'lib_bz_cargo';
const mlib_name = 'lib_bz_cargo';
const mlib_repository_url = 'https://github.com/IoTKETI/lib_bz_cargo.git';

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
let add_lib = {};
try {
  add_lib = JSON.parse(fs.readFileSync('./' + config.directory_name + '/lib_bz_cargo.json', 'utf8'));
  config.lib.push(add_lib);
}
catch (e) {
  add_lib = {
    name: 'lib_devtool_test',
    target: 'armv6',
    description: "[name] [portnum] [baudrate]",
    scripts: './lib_devtool_test /dev/ttyUSB4 115200',
    data: ['Test'],
    control: ['Control_Test']
  };
  config.lib.push(add_lib);
}
function init() {
  if(config.lib.length > 0) {
    for(let idx in config.lib) {
      if(config.lib.hasOwnProperty(idx)) {
        if (msw_mqtt_client != null) {
          for (let i = 0; i < config.lib[idx].control.length; i++) {
            let sub_container_name = config.lib[idx].control[i];
            let _topic = '/Mobius/' + config.gcs + '/Mission_Data/' + config.drone + '/' + my_msw_name + '/' + sub_container_name;
            msw_mqtt_client.subscribe(_topic);
            msw_sub_muv_topic.push(_topic);
            console.log('[msw_mqtt] msw_sub_muv_topic[' + i + ']: ' + _topic);
          }

          for (let i = 0; i < config.lib[idx].data.length; i++) {
            let container_name = config.lib[idx].data[i];
            let _topic = '/MUV/data/' + config.lib[idx].name + '/' + container_name;
            msw_mqtt_client.subscribe(_topic);
            msw_sub_lib_topic.push(_topic);
            console.log('[lib_mqtt] lib_topic[' + i + ']: ' + _topic);
          }
        }

        let obj_lib = config.lib[idx];
        setTimeout(runLib, 1000 + parseInt(Math.random()*10), JSON.parse(JSON.stringify(obj_lib)));
      }
    }
  }
}

function runLib(obj_lib) {
  try {
    let scripts_arr = obj_lib.scripts.split(' ');
    if(config.directory_name == '') {

    }
    else {
      scripts_arr[0] = scripts_arr[0].replace('./', '');
      scripts_arr[0] = './' + config.directory_name + '/' + scripts_arr[0];
    }

    let run_lib = spawn(scripts_arr[0], scripts_arr.slice(1));

    run_lib.stdout.on('data', function(data) {
      console.log('stdout: ' + data);
    });

    run_lib.stderr.on('data', function(data) {
      console.log('stderr: ' + data);
    });

    run_lib.on('exit', function(code) {
      console.log('exit: ' + code);

      setTimeout(runLib, 2000, obj_lib);
    });

    run_lib.on('error', function(code) {
      console.log('error: ' + code);
    });
  }
  catch (e) {
    console.log(e.message);
  }
}

function on_receive_from_muv(topic, str_message) {
  console.log('[' + topic + '] ' + str_message);

  parseControlMission(topic, str_message);
}

function on_receive_from_lib(topic, str_message) {
  console.log('[' + topic + '] ' + str_message + '\n');

  parseDataMission(topic, str_message);
}

function on_process_fc_data(topic, str_message) {
  console.log('[' + topic + '] ' + str_message + '\n');

  let topic_arr = topic.split('/');
  try {
    fc[topic_arr[topic_arr.length-1]] = JSON.parse(str_message.toString());

  }
  catch (e) {
  }

  parseFcData(topic, str_message);
}

setTimeout(init, 1000);

// msw가 muv로 부터 트리거를 받는 용도
// 명세에 sub_container 로 표기
let msw_sub_muv_topic = [];

let msw_sub_lib_topic = [];

let msw_sub_fc_topic = [];

let msw_mqtt_client = null;

msw_mqtt_connect('localhost', 1883);

function msw_mqtt_connect(broker_ip, port) {
  if(msw_mqtt_client == null) {
    let connectOptions = {
        host: broker_ip,
        port: port,
        protocol: "mqtt",
        keepalive: 10,
        protocolId: "MQTT",
        protocolVersion: 4,
        clean: true,
        reconnectPeriod: 2000,
        connectTimeout: 2000,
        rejectUnauthorized: false
    };

    msw_mqtt_client = mqtt.connect(connectOptions);

    msw_mqtt_client.on('connect', function () {
      console.log('[msw_mqtt_connect] connected to ' + broker_ip);
      for(let idx in msw_sub_fc_topic) {
        if(msw_sub_fc_topic.hasOwnProperty(idx)) {
          msw_mqtt_client.subscribe(msw_sub_fc_topic[idx]);
          console.log('[msw_mqtt] msw_sub_fc_topic[' + idx + ']: ' + msw_sub_fc_topic[idx]);
        }
      }
    });

    msw_mqtt_client.on('message', function (topic, message) {
      for(let idx in msw_sub_muv_topic) {
        if (msw_sub_muv_topic.hasOwnProperty(idx)) {
          if(topic === msw_sub_muv_topic[idx]) {
            setTimeout(on_receive_from_muv, parseInt(Math.random() * 5), topic, message.toString());
            break;
          }
        }
      }

      for(idx in msw_sub_lib_topic) {
        if (msw_sub_lib_topic.hasOwnProperty(idx)) {
          if(topic == msw_sub_lib_topic[idx]) {
            setTimeout(on_receive_from_lib, parseInt(Math.random() * 5), topic, message.toString());
            break;
          }
        }
      }

      for(idx in msw_sub_fc_topic) {
        if (msw_sub_fc_topic.hasOwnProperty(idx)) {
          if(topic == msw_sub_fc_topic[idx]) {
            setTimeout(on_process_fc_data, parseInt(Math.random() * 5), topic, message.toString());
            break;
          }
        }
      }
    });

    msw_mqtt_client.on('error', function (err) {
      console.log(err.message);
    });
  }
}
// 유저 디파인 미션 소프트웨어 기능
//////////////////////////////////////////////////////////////////////////////
function parseDataMission(topic, str_message) {
  try {
    let topic_arr = topic.split('/');
    if (topic_arr[topic_arr.length - 1] === config.lib[0].data[0]) {

      let data_topic = '/Mobius/' + config.gcs + '/Mission_Data/' + config.drone + '/' + config.name + '/' + topic_arr[topic_arr.length - 1];
      msw_mqtt_client.publish(data_topic, str_message);
    }
    else if (topic_arr[topic_arr.length - 1] === config.lib[0].data[1]) {
      if (mavPort != null) {
        if (mavPort.isOpen) {
          mavPort.write(Buffer.from(str_message, 'hex'))
        }
      }
    }
  }
  catch (e) {
    console.log('[parseDataMission] data format of lib is not json');
  }
}
///////////////////////////////////////////////////////////////////////////////

function parseControlMission(topic, str_message) {
  try {
  
}
  catch (e) {
    console.log('[parseDataMission] data format of lib is not json');
  }
}

function parseFcData(topic, str_message) {


}
