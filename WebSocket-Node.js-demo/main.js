const readline = require('readline');
const demo = require('./demo');
const config = require('config');
const pako = require('pako');
const WebSocket = require('ws');
const moment = require('moment');
const CryptoJS = require ('crypto-js')

const HttpsProxyAgent = require('https-proxy-agent');

let proxy = { host: '127.0.0.1', port: 49936 };
let agent = new HttpsProxyAgent('socks://127.0.0.1:49936');

const host = "api.huobi.pro";
const uri = "/ws/v1"

var ws = new WebSocket(config.huobi.ws_url_prex, { agent });
    ws.on('open', () => {
        console.log('socket open succeed. input your command, or "h" to get help');
        auth(ws);
        recursiveAsyncReadLine(); 
    });
    ws.on('close', () => {
        console.log('socket close succeed.');
    });
    ws.on('message', (data) => {
        let text = pako.inflate(data, {
            to: 'string'
        });
        let msg = JSON.parse(text);
        if (msg.ping) {
            ws.send(JSON.stringify({
                pong: msg.ping
            }));
        } else if (msg.tick) {
            console.log(msg);
            // handle(msg);
        } else {
            console.log(text);
        }
    });

var rl = readline.createInterface(process.stdin, process.stdout);

function recursiveAsyncReadLine () {
    
    rl.question('Command: ', function (answer) {
        switch (answer){
            case 'exit':
              ws.close();
              return rl.close();
            case 's1':
            case 's2':
            case 's3':
              demo.run_sub(ws, answer);break;  
            case 'r1':
            case 'r2':
              demo.run_req(ws, answer);break;  
            case 'h':
              console.log('Req请求指令列表如下:');
              var getIntfs = config.ws_interfaces.ws_req;
              getIntfs.forEach(e => {
                console.log(e.tip, e.intf_no);
              });
              console.log('Ws注册指令列表如下:');
              var postIntfs = config.ws_interfaces.ws_sub;
              postIntfs.forEach(e => {
                console.log(e.tip, e.intf_no);
              });
              break;  

            default:
              console.log('请输入指令, 比如s1, s2, s1, r1, r2..., 指令列表请输入h, 退出输入exit');break;  
        }
      // (ws.readyState === WebSocket.OPEN) && ws.close();
      recursiveAsyncReadLine(); //Calling this function again to ask new question
    });
  };



/////

/**
 * 签名计算
 * @param method
 * @param host
 * @param path
 * @param data
 * @returns {*|string}
 */
function sign_sha(method, host, path, data) {
  var pars = [];

  //将参数值 encode
  for (let item in data) {
      pars.push(item + "=" + encodeURIComponent(data[item]));
  }

  //排序 并加入&连接
  var p = pars.sort().join("&");

  // 在method, host, path 后加入\n
  var meta = [method, host, path, p].join('\n');

  //用HmacSHA256 进行加密
  var hash = CryptoJS.HmacSHA256(meta, config.huobi.secretKey);
  // 按Base64 编码 字符串
  var Signature = CryptoJS.enc.Base64.stringify(hash);
  // console.log(p);
  return Signature;
}

/**
 * 发送auth请求
 * @param ws
 */
function auth(ws) {

  const timestamp = moment.utc().format('YYYY-MM-DDTHH:mm:ss');

  var data = {
      AccessKeyId: config.huobi.accessKey,
      SignatureMethod: "HmacSHA256",
      SignatureVersion: "2",
      Timestamp: timestamp,
  }

  //计算签名
  data["Signature"] = sign_sha('GET', host, uri, data);
  data["op"]="auth";
  // console.log(data);
  ws.send(JSON.stringify(data));
}
