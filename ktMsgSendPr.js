const crypto = require('crypto');
const axios = require('axios');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const scrapeLogic = require("./scrapeLogic");
require("dotenv").config();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN2 = process.env.REFRESH_TOKEN2;
const SHEET_ID = process.env.SHEET_ID;
const sheetName = process.env.KTTP_ST_NM;
const ktPlusId = process.env.SdTitle;
const sheetName_ktny = process.env.KTNY_ST_NM;

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

    const tempid = sjs.tempid;
    let sdnum = "";
    if (sjs.tonum == "") {
        return "phnum error - empty!";
    } else {
        const valdphchk = await valdPhNum(sjs.tonum);
        if (valdphchk == true) {
            sdnum = await removeHyphens(sjs.tonum);
        } else {
            return "phnum format error!";   //추후에 문자보내지게
        }

    }

    const sendjson = {
        to: sdnum,
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
        return "template error!";
    }
    const data = JSON.stringify(params);


    try {
        const response = await axios.post(apiUrl, data, { headers });
        const result = response.data;
        const messageId = result.messages[0].messageId;
        const sendresult = await getKakaoATResult(accessKey, serviceId, messageId);
        const msgrstcode = sendresult.ktmsgresultcode;
        const msgcontent = params.messages[0].content;
        console.log("메시지 요청결과 : " + msgrstcode);
        const currentDate = new Date();
        const rqinputdtcv = await formDateToStr(currentDate);
        
        var sendNyArray = {
            sdipname: sjs.ktsdname,
            sdipnum: "", //rgnum
            sdipcont: msgcontent, //문자내용
            sdiprsnum: sdnum, //수신번호-보낼번호
            sdipktrqchk: sendresult.ktrqtresultcode, //요청결과
            sdipktmsgchk: sendresult.ktmsgresultcode, //메시지전송결과
            sdipdate: rqinputdtcv,  //요청시간
            sdipktbr: "알림톡-" + sjs.sdsendmode
          }
        await ktnystappend(sendNyArray);
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
        ktsdname = sendjson.ktsdname + "님";
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
        tempcontent = tempcontent.replace("#{번호1}", process.env.KTTP_NUM);
        tempcontent = tempcontent.replace("#{번호2}", process.env.prktmsgttestnum);
        tempcontent = tempcontent.replace("#{홈페이지주소}", "www.sharpdurm.co.kr");

    } else if (tempid === "sdalertcall2") {  //콜백
        to = sendjson.to;
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

                        var sendresult = {
                            ktrqtresultcode: reschkresult.requestStatusCode,
                            ktmsgresultcode: reschkresult.messageStatusCode,
                            smsresultchk: "",
                            requestTime: reschkresult.requestTime,
                        };
                        resolve(sendresult);  //결과보내기
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

async function removeHyphens(phnum) {
    return phnum.replace(/-/g, "");
}


async function valdPhNum(phnuma) {
    // Regular expression to check the phone number format
    const phoneRegex = /^010-\d{4}-\d{4}$/;

    return phoneRegex.test(phnuma);
}

async function ktnystappend(sdipjson) {
    const RANGE = `${sheetName_ktny}!A2:I`; // ex) Sheet1!A1:B2  //한글도가능

    const authClient = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    authClient.setCredentials({ refresh_token: REFRESH_TOKEN2 });
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    try {
        var ktname = sdipjson.sdipname; //이름
        var ktrgnum = sdipjson.sdipnum; //등록번호
        var ktsenddate = sdipjson.sdipdate; //전송일자
        var ktsendcont = sdipjson.sdipcont; //전송내용
        var ktrecievenum = sdipjson.sdiprsnum; //수신번호
        var ktsendnum = process.env.KTSD_NUM; //발신번호
        var ktrqresult = sdipjson.sdipktrqchk; //요청결과
        var ktmsgresult = sdipjson.sdipktmsgchk; //메시지결과
        if (ktrqresult == "A000") {
            ktrqresult = "요청:성공";
        } else {
            ktrqresult = "요청:실패(" + ktrqresult + ")";
        }
        if (ktmsgresult == "0000") {
            ktmsgresult = "메시지:성공";
        } else {
            ktmsgresult = "메시지:실패(" + ktmsgresult + ")";
        }

        var ktsendresult = ktrqresult + "/" + ktmsgresult;
        var ktsendgb = sdipjson.sdipktbr; //전송구분
        var ktsendnyid = new Date().getTime().toString();

        var ktnyArray = [[ktname, ktrgnum, ktsenddate, ktsendcont, ktrecievenum, ktsendnum, ktsendresult, ktsendgb, ktsendnyid]];
        //     //Logger.log(ktnyArray);
        //     ktnyst.appendRow(ktnyArray);
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SHEET_ID,
            //spreadsheetName: SHEET_NAME,
            range: RANGE,
            valueInputOption: 'USER_ENTERED',
            resource: { values: ktnyArray },
        });
        console.log(`ktny 시트에 행이 추가되었습니다.`);

        // const response = await sheets.spreadsheets.values.get({  //sheet get!
        //   spreadsheetId,
        //   range: `${sheetName}!${range}`,
        // });

    } catch (e) {

        console.error(e);
        var emailsubject = "시트에 추가중 에러발생!!";
        var emailcontent = "시트에 추가중 에러발생!!\n" +

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
        sendemailPr(sendemjson); // 이메일 전송
    }

}

async function formDateToStr(date) {
    const daysOfWeek = ["일", "월", "화", "수", "목", "금", "토"];

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dayOfWeek = daysOfWeek[date.getDay()];

    let hours = date.getHours();
    const ampm = hours >= 12 ? "오후" : "오전";
    hours = hours % 12 || 12;
    const minutes = String(date.getMinutes()).padStart(2, '0');

    const formattedString = `${year}-${month}-${day}(${dayOfWeek}) ${ampm} ${hours}:${minutes}`;
    return formattedString;
}


module.exports = { ktsendPr };