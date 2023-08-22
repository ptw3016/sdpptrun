const schedule = require('node-schedule');
const { OAuth2Client } = require('google-auth-library');
var nodemailer = require('nodemailer');
const axios = require('axios');
const crypto = require('crypto');
const qs = require('qs');
require("dotenv").config();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;


// 튜야 API 기본 정보 설정
const baseUrl = process.env.tyacurl; // 
const accessKey = process.env.tyackey; // 
const secretKey = process.env.tysckey; 
const tysd2dlsens_id = process.env.tysd2dlsens_id
const tysd2fgbt_id = process.env.tysd2fgbt_id;

async function sdbgdlchkPr() {
    var rstimechk = await rltimestr();
    console.log("sdbg2dlchk start!:" + rstimechk);

    var dlsensst = await dolcstatechk(tysd2dlsens_id);
    dlsensst = "";
    let rststring = "";
    //let datestring = hour +":"+s minute;
    if (dlsensst == true) {
        rststring = "*별관도어락 상태확인 : 별관 문이 열려있습니다.";
    } else if (dlsensst == false) {
        rststring = "*별관도어락 상태확인 : 별관 문이 닫혀있습니다.";
    }

    var emailsubject = rststring;
    var emailcontent = rststring + "\n";

    //googlesheetappend(stipVALUES);
    var sendemjson = {
        to: process.env.sdadminnvml,
        subject: emailsubject,
        message: emailcontent
    }
    sendemailPr(sendemjson); //
}

async function dolcstatechk(device_id) { //dlcs control - chk
    await getToken();
    const device_rst = await callTyApi('GET', `/v1.0/iot-03/devices/${device_id}/status`, {}, {});
    console.log(device_rst);

    var rststring = "";
    if (device_rst[0].value == true) {
        rststring = true;
    } else if (device_rst[0].value == false) {
        rststring = false;
    }
    return rststring;
}


async function sctytimebkPr() {
    // 월요일과 수요일을 숫자로 매핑합니다 (0: 일요일, 1: 월요일, ..., 6: 토요일).
    const targetDaysOfWeek = [0, 1, 2, 3, 4, 5, 6]; //
    const hgDayWeek = ["일", "월", "화", "수", "목", "금", "토"]
    const hour = 16;  // 24시간 형식  
    const minute = 6;

    // 원하는 요일과 시간에 함수를 실행하도록 스케줄링합니다.
    const rule = new schedule.RecurrenceRule();
    rule.dayOfWeek = targetDaysOfWeek;
    rule.hour = hour;
    rule.minute = minute;
    rule.tz = 'Asia/Seoul';

    const job = schedule.scheduleJob(rule, sdbgdlchkPr);

    if (job) {
        console.log("sc on!");
    } else {
        console.log("sc off!");
    }
}



async function sendemailPr(sendemjson) {
    const authClient = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    authClient.setCredentials({ refresh_token: REFRESH_TOKEN });

    var to = sendemjson.to;
    var subject = sendemjson.subject;
    var message = sendemjson.message;
    var attachmsg = sendemjson.attachmsg;

    const accessToken = await authClient.getAccessToken();
    const transport = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: process.env.sdadmingmml,
            clientId: CLIENT_ID,
            clientSecret: CLIENT_SECRET,
            refreshToken: REFRESH_TOKEN,
            accessToken: accessToken,
        },
    });

    if (attachmsg == "ok") {
        var screenshotfn = sendemjson.screenshotfn;
        var mailOptions = {
            from: '"' + process.env.SdTitle + ' ' + process.env.sdadmingmml, // 발신자 정보
            to: to, // 수신자 정보
            subject: subject, // 제목
            text: message, // 내용 (텍스트)
            attachments: [
                {
                    filename: 'screenshot.png',
                    content: screenshotfn
                }
            ]
            //html: "<b>html-이메일 테스트중</b>", // 내용 (HTML)
        };
    } else {
        var mailOptions = {
            from: '"' + process.env.SdTitle + ' ' + process.env.sdadmingmml, // 발신자 정보
            to: to, // 수신자 정보
            subject: subject, // 제목
            text: message, // 내용 (텍스트)
            //html: "<b>html-이메일 테스트중</b>", // 내용 (HTML)
        };
    }

    const result = await transport.sendMail(mailOptions);
    //console.log(result);
}

async function rltimestr() {
    const currentDate = new Date();

    const year = currentDate.getFullYear();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const day = currentDate.getDate().toString().padStart(2, '0');

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayOfWeek = daysOfWeek[currentDate.getDay()];

    const hour = currentDate.getHours().toString().padStart(2, '0');
    let hourcv = parseInt(hour) + 9;
    const minute = currentDate.getMinutes().toString().padStart(2, '0');
    const second = currentDate.getSeconds().toString().padStart(2, '0');

    const formattedDateTime = `${year}-${month}-${day}(${dayOfWeek}) ${hourcv}:${minute}:${second}`;

    return formattedDateTime;
}


let tokenty = '';
let tokenExpireTime = 0;

function encryptStr(str, secret) {
  return crypto.createHmac('sha256', secret).update(str, 'utf8').digest('hex').toUpperCase();
}

async function getToken() {
  const timestamp = Date.now().toString();
  console.log("tokentimestamp:"+timestamp);
  const signUrl = '/v1.0/token?grant_type=1';
  const contentHash = crypto.createHash('sha256').update('').digest('hex');
  const stringToSign = ['GET', contentHash, '', signUrl].join('\n');
  const signStr = accessKey + timestamp + stringToSign;
  const sign = encryptStr(signStr, secretKey);
  const headers = {
    t: timestamp,
    sign_method: 'HMAC-SHA256',
    client_id: accessKey,
    sign: sign,
  };
  const options = {
    method: 'GET',
    url: baseUrl + signUrl,
    headers: headers,
  };
  try {
    const response = await axios(options);
    if (response.data.success) {
      tokenty = response.data.result.access_token;
      tokenExpireTime = response.data.result.expire_time;
      console.log('Token obtained successfully:', tokenty);
    } else {
      console.error('Token request failed:', response.data.msg);
    }
  } catch (error) {
    console.error(error);
  }
}

async function callTyApi(method, path, params, data) {
    const timestamp = Date.now().toString();
    console.log("calltyapitimestamp:"+timestamp);
    const sortedParams = {};
    Object.keys(params)
      .sort()
      .forEach((key) => (sortedParams[key] = params[key]));
    const querystring = decodeURIComponent(qs.stringify(sortedParams));
    const url = querystring ? `${path}?${querystring}` : path;
  
    const contentHash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    const stringToSign = [method, contentHash, '', url].join('\n');
    const signStr = accessKey + tokenty + timestamp + stringToSign;
    const sign = encryptStr(signStr, secretKey);
    const headers = {
      t: timestamp,
      path: url,
      client_id: accessKey,
      sign: sign,
      sign_method: 'HMAC-SHA256',
      access_token: tokenty,
    };
    const options = {
      method: method,
      url: baseUrl + url,
      headers: headers,
      data: data,
    };
    try {
      const response = await axios(options);
      if (response.data.success) {
        return response.data.result;
      } else {
        console.error('API request failed:', response.data.msg);
        if (response.data.code === 1010 || response.data.code === 1011) {
          // 토큰 만료 또는 무효일 경우, 새로운 토큰 요청
          console.log('Token expired or invalid, requesting a new one...');
          await getToken();
          // 재귀적으로 API 호출 함수 다시 실행
          return callTyApi(method, path, params, data);
        } else {
          return null;
        }
      }
    } catch (error) {
      console.error(error);
      return null;
    }
}


module.exports = { sctytimebkPr };






  