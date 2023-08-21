const schedule = require('node-schedule');
const { TuyaContext } = require('@tuya/tuya-connector-nodejs');
const { OAuth2Client } = require('google-auth-library');
var nodemailer = require('nodemailer');
require("dotenv").config();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

const context = new TuyaContext({
    baseUrl: process.env.tyacurl,
    accessKey: process.env.tyackey,
    secretKey: process.env.tysckey,
});

const tysd2dlsens_id = process.env.tysd2dlsens_id;

async function sdbgdlchkPr() {
    var rstimechk = await rltimestr();
    console.log("sdbg2dlchk start!:" + rstimechk);
    var dlsensst = await dolcstatechk(tysd2dlsens_id);
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
    const commands = await context.request({
        path: `/v1.0/iot-03/devices/${device_id}/status`,
        method: 'GET',
        //body: {}
    });
    if (!commands.success) {
        new Error();
    }
    //console.log("Execution result:",commands);
    var rststring = "";
    if (commands.result[0].value == true) {
        rststring = true;
    } else if (commands.result[0].value == false) {
        rststring = false;
    }
    return rststring
}


async function sctytimebkPr() {
    const utccv1 = 9;
    // 월요일과 수요일을 숫자로 매핑합니다 (0: 일요일, 1: 월요일, ..., 6: 토요일).
    const targetDaysOfWeek = [0, 1, 2, 3, 4, 5, 6]; //
    const hgDayWeek = ["일", "월", "화", "수", "목", "금", "토"]
    const hour = 19 - utccv1; // 24시간 형식  /utccv1은 utc 시간 매칭
    const minute = 42;

    // 원하는 요일과 시간에 함수를 실행하도록 스케줄링합니다.
    const rule = new schedule.RecurrenceRule();
    rule.dayOfWeek = targetDaysOfWeek;
    rule.hour = hour;
    rule.minute = minute;

    const job = schedule.scheduleJob(rule, sdbgdlchkPr);

    if (job) {
        console.log("sc on!");
        console.log("sc prtime:", job.nextInvocation());
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
    const minute = currentDate.getMinutes().toString().padStart(2, '0');
    const second = currentDate.getSeconds().toString().padStart(2, '0');

    const formattedDateTime = `${year}-${month}-${day}(${dayOfWeek}) ${hour}:${minute}:${second}`;

    return formattedDateTime;
}

module.exports = { sctytimebkPr };
