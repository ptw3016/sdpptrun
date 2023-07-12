const crypto = require('crypto');
const axios = require('axios');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const scrapeLogic = require("./scrapeLogic");
require("dotenv").config();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
// const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const REFRESH_TOKEN2 = process.env.REFRESH_TOKEN2;
// const SHEET_NAME = process.env.SHEET_NAME;
const SHEET_ID = process.env.SHEET_ID;
const sheetName = process.env.KTTP_ST_NM;
const ktPlusId = process.env.SdTitle;

function makeSignature(mtval, accKey, urivalue) {
    const method = mtval;
    const timestamp = Date.now().toString();
    const accessKey = accKey; // access key id
    const secretKey = process.env.NvAPISecret;
    const url2 = urivalue;
    const message = [
        method,
        ' ',
        url2,
        '\n',
        timestamp,
        '\n',
        accessKey
    ];

    const signature = crypto.createHmac('sha256', secretKey)
        .update(message.join(''))
        .digest('base64');
    //console.log(signature);
    const signatureArray = [signature, timestamp];
    return signatureArray;
}
const ktsendPr = async (sjs) => {
    const accessKey = process.env.NvAPIaccKey;
    const serviceId = process.env.NvAPIsvcId;
    const urivalue = `/alimtalk/v2/services/${serviceId}/messages`;
    var mtval = "POST";
    const signatureArray = makeSignature(mtval, accessKey, urivalue);
    const signature = signatureArray[0];
    const timestamp = signatureArray[1];
    const apiUrl = "https://sens.apigw.ntruss.com" + urivalue;

    const headers = {
        'Content-Type': 'application/json; charset=utf-8',
        'x-ncp-apigw-timestamp': timestamp,
        'x-ncp-iam-access-key': accessKey,
        'x-ncp-apigw-signature-v2': signature,
    };

    const tempid = process.env.prktmsgtempid;
    const sendjson = {
        to: process.env.prktmsgttestnum,
        ktsdname: sjs.ktsdname,
        apmbgb: "비회원",
        apprnum: sjs.apprnum,
        date: sjs.date,
        time: sjs.time,
        appay: sjs.appay,
        appaysd: sjs.appaysd,
        apbb: sjs.apbb,
        btnjr: ""
    }

    var params = await getRequestParams(tempid, sendjson);  //메시지 템플릿 가져오기 - 전송시 템플릿만들고

    if (params == "0001") {
        console.log("템플릿 가져오기 실패! 종료합니다.");
        return;
    }
    const data = JSON.stringify(params);

    try {
        const response = await axios.post(apiUrl, data, { headers });
        const result = response.data;
        const messageId = result.messages[0].messageId;
        const rstmsg = await getKakaoATResult(accessKey, serviceId, messageId)
        const msgrstcode = rstmsg.messageStatusCode;
        console.log("메시지 요청결과 : " + rstmsg.messageStatusCode);
        return msgrstcode;
    } catch (e) {
        var emailsubject = "알림 메시지 요청중 에러발생!!";
        var emailcontent = "알림 메시지 요청중 에러발생!!\n" +
            "-----error msg-----\n" +
            e.message + "\n" +
            "-----error stack-----\n" +
            e.stack;

        var sendemjson = {
            to: process.env.sdadminnvml,
            subject: emailsubject,
            message: emailcontent
        }
        //메일 전송
        scrapeLogic.sendemailPr(sendemjson); // 이메일 전송
    }

}

async function getRequestParams(tempid, sendjson) {
    var ktaltmpList = await gapkttpstget();
    var tempchk = false;
    var btntypeAr = new Array();
    var btnnameAr = new Array();
    var btnlinkmbAr = new Array();
    var btnlinkpcAr = new Array();
    var btnjrbr = sendjson.btnjr; //버튼종류 분류

    for (var i = 0; i < ktaltmpList.length; i++) {
        if (tempid == ktaltmpList[i][0]) {
            //console.log(ktaltmpList[i][2]);
            tempchk = true;
            var tempcontent = ktaltmpList[i][2];
            if (ktaltmpList[i][3].indexOf(',') != -1) {
                btntypeAr = ktaltmpList[i][3].split(",");
                btnnameAr = ktaltmpList[i][4].split(",");
                btnlinkmbAr = ktaltmpList[i][5].split(",");
                btnlinkpcAr = ktaltmpList[i][6].split(",");

            } else {
                btntypeAr.push(ktaltmpList[i][3]);
                btnnameAr.push(ktaltmpList[i][4]);
                btnlinkmbAr.push(ktaltmpList[i][5]);
                btnlinkpcAr.push(ktaltmpList[i][6]);
            }
        }
    }

    var btncontents = new Array();
    for (var i = 0; i < btntypeAr.length; i++) {
        var btncontjson = {
            "type": btntypeAr[i],
            "name": btnnameAr[i],
            "linkMobile": btnlinkmbAr[i],
            "linkPc": btnlinkpcAr[i]
        };
        btncontents.push(btncontjson);
    }

    if (tempchk == false) {
        return "0001";  //템플릿 없으면 우선 이렇게 오류만들기
    }

    if (tempid === "sdalertpr2") {   //연습실
        to = sendjson.to;
        ktsdname = sendjson.ktsdname;
        date = sendjson.date;
        time = sendjson.time;
        apmbgb = sendjson.apmbgb;
        apprnum = sendjson.apprnum;
        appaysd = sendjson.appaysd;
        appay = sendjson.appay;
        apbb = sendjson.apbb;

        tempcontent = tempcontent.replace("#{예약자명}", ktsdname);
        tempcontent = tempcontent.replace("#{회원구분}", apmbgb);
        tempcontent = tempcontent.replace("#{예약부스번호}", apprnum);
        tempcontent = tempcontent.replace("#{예약일자}", date);
        tempcontent = tempcontent.replace("#{예약시간}", time);
        tempcontent = tempcontent.replace("#{결제수단}", appaysd);
        tempcontent = tempcontent.replace("#{결제금액}", appay);
        tempcontent = tempcontent.replace("#{예약방법}", apbb);
        tempcontent = tempcontent.replace("#{번호1}", "010-4833-8274");
        tempcontent = tempcontent.replace("#{번호2}", "010-5516-3016");
        tempcontent = tempcontent.replace("#{홈페이지주소}", "www.sharpdurm.co.kr");

    }


    if (btnjrbr == "btnaccent") {
        title = sendjson.title;
        //console.log(title);
        return {
            templateCode: tempid,
            plusFriendId: "@" + ktPlusId, // Plus Friend ID
            messages: [
                {
                    "to": to,
                    "title": title,
                    "content": tempcontent,
                    "buttons": btncontents
                }
            ]
        };
    } else {
        return {
            templateCode: tempid,
            plusFriendId: "@" + ktPlusId, // Plus Friend ID
            messages: [
                {
                    "to": to,
                    "content": tempcontent,
                    "buttons": btncontents
                }
            ]
        };
    }

}


async function getKakaoATResult(acKey, chId, msgId) {
    var accessKey2 = acKey;
    var channel2 = chId;
    var messageId2 = msgId;
    var mtval = "GET";
    var urival = "/alimtalk/v2/services/" + channel2 + "/messages/" + messageId2;
    var signatureArray2 = makeSignature(mtval, accessKey2, urival);

    var signature2 = signatureArray2[0];
    var timestamp2 = signatureArray2[1];

    var apiUrl2 = "https://sens.apigw.ntruss.com" + urival;
    var headers2 = {
        'x-ncp-apigw-timestamp': timestamp2,
        'x-ncp-iam-access-key': accessKey2,
        'x-ncp-apigw-signature-v2': signature2,
    };

    var options2 = {
        method: mtval,
        headers: headers2,
    };

    try {
        var reschkresult = "";
        return new Promise((resolve, reject) => {
            var rstchkinterval = setInterval(async function () {
                try {
                    var reschk = await axios(apiUrl2, options2);
                    reschkresult = reschk.data;

                    if (reschkresult.requestStatusCode != "A000") {
                        console.log("메시지 요청이 잘못되었습니다!");
                    }
                    if (reschkresult.messageStatusCode != undefined) {
                        //console.log("메시지결과 완료");
                        clearInterval(rstchkinterval);
                        resolve(reschkresult);
                    }
                } catch (error) {
                    console.error(error);
                    clearInterval(rstchkinterval);
                    reject(error);
                }
            }, 1000);
        });

    } catch (error) {
        console.error(error);
    }
}

async function gapkttpstget() {
    const kttprange = process.env.kttpstrange;

    const authClient = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    authClient.setCredentials({ refresh_token: REFRESH_TOKEN2 });
    const sheets = google.sheets({ version: 'v4', auth: authClient });
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${sheetName}!${kttprange}`,
    });

    const values = response.data.values;
    //console.log(values[0]);

    return values;
}

module.exports = { ktsendPr };