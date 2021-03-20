var connectionId;
var heartbeatIneterval;
var http;
var currentHeat;
var resultBuffer = '';
var FAKE_ID = 'fake';
var regex = /\s*(\d)\s+(\d\.\d+)/g;

document.addEventListener('DOMContentLoaded', contentLoaded, false);

function contentLoaded() {
  document.querySelector('#connect').addEventListener("click", connectPressed);
  document.querySelector("#results").addEventListener("click", fakeResults);
  document.querySelector("#arm").addEventListener("click", resetTimer);
}

function connectPressed() {
  var deviceUrl = document.querySelector("#derby_url");
  http = new HttpConnection("http://" + deviceUrl.value + "/derbynet/");
  http.post("action.php", "action=login&name=Timer&password=", function(res, err) {
    if (!err) {
      console.log("result", res);

      http.post("action.php", "action=timer-message&message=HELLO", function(res, err) {
        console.log(res, err);
        if (!err) connected();
      });
    } else {
      console.log("Error login");
    }
  });
}

function connected() {
  chrome.serial.getDevices(function(ports) {
    console.log(ports);
    if (ports.length == 0) return;

    var listenBtn = document.querySelector("#listen");
    var portPicker = document.querySelector('#portDropdown');
    portPicker.innerHTML = '<option value="' + FAKE_ID + '">Fake timer</option>';
    ports.forEach(function(port) {
      portPicker.innerHTML = portPicker.innerHTML + '<option value="' +
        port.path + '">' + port.displayName + ' (' + port.path + ')</option>';
    });

    listenBtn.addEventListener("click", listenPressed);
  });
}

function listenPressed() {
  var portPicker = document.querySelector('#portDropdown');
  console.log(portPicker.value);

  if (portPicker.value == FAKE_ID) {
    setTimeout(fakeSerialConnected, 2000);
    return;
  }

  chrome.serial.connect(portPicker.value, {
    'bitrate': 1200,
    'dataBits': 'seven',
    'parityBit': 'no',
    'stopBits': 'two',
    'ctsFlowControl': false
  }, serialConnected);
}

function serialConnected(openInfo) {
  if (openInfo === undefined) {
    console.log('Unable to connect to device with');
    return;
  }
  
  connectionId = openInfo.connectionId;
  chrome.serial.onReceive.addListener(dataReceived);
  chrome.serial.onReceiveError.addListener(receiveError);

  startTimer();
}

function fakeSerialConnected() {
  connectionId = FAKE_ID;
  startTimer();
}

function parseResponse(res) {
  var heat = res.getElementsByTagName('heat-ready');
  var abort = res.getElementsByTagName('abort');

  if (heat.length > 0) {
    currentHeat = {
      laneMask: parseInt(heat[0].getAttribute('lane-mask'), 10),
      roundid: heat[0].getAttribute('roundid'),
      heat: heat[0].getAttribute('heat')
    };

    if (connectionId == FAKE_ID) {
      document.querySelector("#results").setAttribute("style", "");
    } else {
      document.querySelector("#arm").setAttribute("style", "");
    }
  }

  if (abort.length > 0) {
    currentHeat = null;
    document.querySelector("#results").setAttribute("style", "display: none;");
  }
}

function startTimer() {
  http.post("action.php", "action=timer-message&message=IDENTIFIED", function(res, err) {
    console.log(res, err);
    if (err) 
      return;

    parseResponse(res);
    heartbeatIneterval = setInterval(sendHeartbeat, 5000);
  });
}

function sendHeartbeat() {
  http.post("action.php", "action=timer-message&message=HEARTBEAT", function(res, err) {
    console.log(res, err);
    if (err)
      return;

    parseResponse(res);
  });
}

function fakeResults() {
  if (!currentHeat)
    return;
  var results = [];
  var mask = currentHeat.laneMask;
  var lane = 1;

  while (mask != 0) {
    if (mask & 0x1) {
      results.push({
        lane: lane,
        time: Math.random() * 10
      })
    } else {
      results.push({
        lane: 0,
        time: 0
      })
    }
    mask >>= 1;
    lane++;
  }

  results = results.sort(function(a,b) {
    if (a.lane == 0)
      return 1;
    if (b.lane == 0)
      return -1;

    return a.time - b.time;
  });

  var str = results.map(function(r) {
    return r.lane.toString() + ' ' + r.time.toFixed(3);
  }).join(" ") + '\n';

  resultsReceived(str);
}

function resultsReceived(data) {
  // If there is not a heat ignore
  if (!currentHeat) 
    return;

  resultBuffer += data;

  console.log(resultBuffer);

  if (!resultBuffer.endsWith('\n'))
    return;

  results = [];
  var laneMask = currentHeat.laneMask;
  var lane = 1;

  while (laneMask != 0) {
    if (laneMask & 0x1) {
      results.push({
        lane: lane
      });
    }
    lane++;
    laneMask >>= 1;
  }

  var place = 1;
  [...resultBuffer.matchAll(regex)].forEach(element => {
    var lane = parseInt(element[1], 10);

    var res = results.filter(r => r && r.lane == lane)[0];
    if (!res)
      return;
    
    res.place = place;
    res.time = element[2];  
    place++;
  });
  
  var str ="action=timer-message&message=FINISHED&roundid=" + currentHeat.roundid + "&heat=" + currentHeat.heat + "&" +
    results.filter(r => r.place).map(r => 'lane' + r.lane + '=' + r.time + '&place' + r.lane + '=' + r.place).join('&');
  
  http.post("action.php", str, function(res, err) {
    console.log(res, err);
    if (err)
      return;

    currentHeat = null;
    resultBuffer = "";
    document.querySelector("#results").setAttribute("style", "display: none;");
    parseResponse(res);
  });
}

function dataReceived(info) {
  if (!info || !info.data || info.connectionId != connectionId)
    return;
  
  console.log(info.data);
  resultsReceived(ab2str(info.data));
}

function receiveError(info) {
  if (!info || !info.data || info.connectionId != connectionId)
    return;

  connectionId = null;
}

function resetTimer() {
  if (!connectionId || connectionId == FAKE_ID)
    return;

  chrome.serial.send(connectionId, str2ab(" "), function() {});
  document.querySelector("#arm").setAttribute("style", "display: none;");
}

// Converts ArrayBuffer to String.
var ab2str = function(buf) {
  var bufView = new Uint8Array(buf);
  var unis = [];
  for (var i = 0; i < bufView.length; i++) {
    unis.push(bufView[i]);
  }
  return String.fromCharCode.apply(null, unis);
};

// Converts String to ArrayBuffer.
var str2ab = function(str) {
  var buf = new ArrayBuffer(str.length);
  var bufView = new Uint8Array(buf);
  for (var i = 0; i < str.length; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
};

var getIndexByValue = function(element, value) {
  var list = element.options;
  for (var i = 0; i < list.length; i++) {
    if (list[i].value === value) {
      return i;
    }
  }
};
