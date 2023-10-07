const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const nodemailer = require("nodemailer");
const scrapeLogic = require("./scrapeLogic");
const infochkppt = require("./infochkppt");
const fs = require('fs');

require("dotenv").config();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

let interval;
var counta = 1;
var rstmsgchk = "";
var rstidchk = false;
const testsw = "";   //test sw - timeset-search! , *
const devsw = ""; //dev sw

async function startTimer() {
    try {
        const authClient = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
        authClient.setCredentials({ refresh_token: REFRESH_TOKEN });
        const gmail = google.gmail({ version: 'v1', auth: authClient });
        interval = setInterval(async () => {
            const res = await gmail.users.labels.list({
                userId: 'me',
            });
            const labels = res.data.labels;
            var seleclabelname = "[" + process.env.SdTitle + "] 연습실유료예약";  //실사용
            if (testsw == process.env.testsw) {
                var seleclabelname2 = "INBOX";  //test
                var seleclabelid2 = "";  //test
            }

            var seleclabelid = "";

            if (labels.length) {
                await labels.forEach((label) => {
                    //console.log("Label name : "+label.name) //label name list!
                    if (seleclabelname == label.name) {
                        seleclabelid = label.id;
                    }
                    if (testsw == process.env.testsw) {
                        if (seleclabelname2 == label.name) {
                            seleclabelid2 = label.id;
                            //console.log(seleclabelid2);
                        }
                    }
                });
            } else {
                console.log('No labels found.');
            }


            if (testsw == process.env.testsw) {
                //console.log(seleclabelid2);
                const res2 = await gmail.users.messages.list({
                    userId: 'me',
                    labelIds: seleclabelid,
                });
                const res2test = await gmail.users.messages.list({  //test
                    userId: 'me',
                    labelIds: seleclabelid2,
                });
                var messagestest = res2test.data.messages; //test용
                var rstmsgId = await messagestest[0].id; //test
                var messages = res2.data.messages;
                var rstmsgId2 = await messages[0].id;
                var rstmsglength = messagestest.length;
            } else {
                const res2 = await gmail.users.messages.list({
                    userId: 'me',
                    labelIds: seleclabelid,
                });
                var messages = res2.data.messages;
                var rstmsgId = await messages[0].id;
                var rstmsglength = messages.length;
            }



            //console.log(rstmsgId);
            if (rstidchk == false) {
                rstmsgchk = rstmsgId;
                rstidchk = true;
            }

            if (rstmsgchk != rstmsgId && rstmsgchk != "") {
                var infochkname = "";
                var infochkphnum = "";
                var testchk = "";
                var infochkerrt = "";

                try {
                    clearInterval(interval); // 특정 함수 실행 후 타이머 종료
                    console.log("New Email Received!! / New email ID : " + rstmsgId + " / Old email ID :" + rstmsgchk);

                    var prjsonArray = [];
                    for (var i = 0; i < rstmsglength; i++) {
                        if (testsw == process.env.testsw) {
                            if (messagestest[i].id == rstmsgchk) {

                                //console.log("지금 0인덱스의 ID : "+messages[0].id)
                                //console.log("예전 "+rstmsgchk+"값은 현재 idx : "+i+"로 밀려남");
                                break;
                            }
                        } else {
                            if (messages[i].id == rstmsgchk) {

                                //console.log("지금 0인덱스의 ID : "+messages[0].id)
                                //console.log("예전 "+rstmsgchk+"값은 현재 idx : "+i+"로 밀려남");
                                break;
                            }
                        }
                        //console.log("새메시지 ID : " + messages[i].id) //동시에 들어온 새메일 체크해보기

                        //***
                        if (testsw == process.env.testsw) {
                            var infochkrt = await infochkppt.sdprgetinfo();
                            infochkname = infochkrt.minfochkname;
                            infochkphnum = process.env.prktmsgttestnum;
                            testchk = "testing";
                            infochkerrt = "0000";
                        } else {
                            var infochkrt = await infochkppt.sdprgetinfo();

                            //mifcrtcode 결과로 오류이메일 전송 준비!,시트추가도 준비!

                            if (infochkrt.memberinfochk == true && infochkrt.mifcrtcode == "0000") {
                                console.log("이용내역 일치정보 확인!");
                                infochkname = infochkrt.minfochkname;
                                infochkphnum = infochkrt.minfochkphnum;
                                infochkerrt = infochkrt.mifcrtcode;
                            } else {
                                console.log("이용내역 일치정보 확인 안됨!");
                                infochkname = infochkrt.minfochkname;
                                infochkphnum = infochkrt.minfochkphnum;
                                infochkerrt = infochkrt.mifcrtcode;
                            }
                        }

                        var prjson = await googleemailmsgget(messages[i].id);  //실사용

                        if (prjson == "") {
                            continue;
                        }
                        var prusedateext = await prdateExt(prjson.prusedate);
                        var prscdatejson = await prdtcovDate(prusedateext.ipdatedt);

                        var chknameprrt = await blindnamechkPr(infochkname, prjson.prscname);
                        //console.log("infochkname:" + infochkname);
                        //console.log("prjson.prscname:" + prjson.prscname);

                        var chknrst = chknameprrt.chknameresult;

                        //***
                        if (testsw == process.env.testsw) {
                            chknrst = true;
                        }
                        //--**

                        var gjgach = prjson.prgjga;
                        gjgach = await gjgach.split("=");
                        var gjgacha = await gjgach[1].trim();
                        var gjgachatt = await gjgacha.slice(0, -1);
                        var scgstext = gjgach[0];
                        var startKeyword = "(비회원)(";
                        var endKeyword = ")";
                        var result = await extractTextBetweenWords(scgstext, startKeyword, endKeyword);
                        var scgstext = await result.replace(startKeyword, "").trim();
                        var scgstextnum = parseInt(scgstext);
                        //scgstextnum = 2;  //갯수 test용
                        const VALUES = [
                            [
                                "예약",
                                process.env.SdTitle + " Lab",
                                "미배정",
                                prjson.prscsp,
                                prjson.prscdate,
                                prjson.prscname,
                                prusedateext.ipdatedt,
                                prusedateext.ipdatest1,
                                prusedateext.ipdatest2,
                                prusedateext.ipdateed1,
                                prusedateext.ipdateed2,
                                prjson.prgjst,
                                prjson.prgjsd,
                                gjgachatt,
                                prjson.prscrq,
                                scgstext,
                                prjson.prscnum,
                                infochkphnum,
                            ]
                        ];

                        if (infochkerrt == "0000") {   //info OK,self X,

                        } else {
                            var emailsubject = "";
                            var emailcontent = "";
                            var prdatecv = prscdatejson.dateYear + "-" + scrapeLogic.numpad(prscdatejson.dateMonth) + "-" + scrapeLogic.numpad(prscdatejson.dateDay);
                            if (infochkerrt == "0001") {
                                emailsubject = "(Lab연습실)이용자 정보는 확인되었으나 셀프모드입니다.";
                                emailcontent = "(Lab연습실)이용자 정보는 확인되었으나 셀프모드입니다.\n" +
                                    "----reqbd----\n" +
                                    "/신청자명 : " + infochkname + "\n" +
                                    "/신청자phnum : " + infochkphnum + " (" + testchk + ")" + "\n" +
                                    "/예약자명 : " + prjson.prscname + "(이메일에서 가져온 이름)\n" +  //name
                                    "/예약일자 : " + await scrapeLogic.weekdaypr(prdatecv) + "\n" +
                                    "/예약시간 : " + prusedateext.ipdatest1 + " " + prusedateext.ipdatest2 + " - " + prusedateext.ipdateed1 + " " + prusedateext.ipdateed2 + "\n" +
                                    "/예약갯수 : " + scgstextnum + "개";

                                VALUES[0][2] = "셀프모드/미배정";

                            } else if (infochkerrt == "0002") {
                                emailsubject = "(Lab연습실)이용자 정보중 일치하는 정보가 없습니다! 신규일 수 있으니 확인해보세요!";
                                emailcontent = "(Lab연습실)이용자 정보중 일치하는 정보가 없습니다! 신규일 수 있으니 확인해보세요!\n" +
                                    "----reqbd----\n" +
                                    "/신청자명 : " + infochkname + "\n" +
                                    "/신청자phnum : " + infochkphnum + " (" + testchk + ")" + "\n" +
                                    "/예약자명 : " + prjson.prscname + "(이메일에서 가져온 이름)\n" +  //name
                                    "/예약일자 : " + await scrapeLogic.weekdaypr(prdatecv) + "\n" +
                                    "/예약시간 : " + prusedateext.ipdatest1 + " " + prusedateext.ipdatest2 + " - " + prusedateext.ipdateed1 + " " + prusedateext.ipdateed2 + "\n" +
                                    "/예약갯수 : " + scgstextnum + "개";

                                VALUES[0][2] = "이용자정보없음/수동";
                            }

                            var sendemjson = {
                                to: process.env.sdadminnvml,
                                subject: emailsubject,
                                message: emailcontent
                            }

                            //메일 전송
                            await scrapeLogic.sendemailPr(sendemjson); // 이메일 전송
                            await scrapeLogic.googlesheetappend(VALUES);


                            continue;
                        }

                        if (chknrst == true) {
                            console.log("nyname 일치 확인!");
                        } else {
                            console.log("신청자이름과 이메일 정보 이름이 다른것 같습니다. 종료합니다.");
                            var emailsubject = "신청자이름과 이메일 정보 이름이 다른것 같습니다. 종료합니다.";
                            var prdatecv = prscdatejson.dateYear + "-" + scrapeLogic.numpad(prscdatejson.dateMonth) + "-" + scrapeLogic.numpad(prscdatejson.dateDay);
                            var emailcontent = "신청자이름과 이메일 정보 이름이 다른것 같습니다. 종료합니다.\n" +
                                "----reqbd----\n" +
                                "/신청자명 : " + infochkname + "(예약내역에서 가져온 이름)\n" +
                                "/예약자명 : " + prjson.prscname + "(이메일에서 가져온 이름)\n" +  //name
                                "/예약일자 : " + await scrapeLogic.weekdaypr(prdatecv) + "\n" +
                                "/예약시간 : " + prusedateext.ipdatest1 + " " + prusedateext.ipdatest2 + " - " + prusedateext.ipdateed1 + " " + prusedateext.ipdateed2 + "\n" +
                                "/예약갯수 : " + scgstextnum + "개";

                            VALUES[0][2] = "이메일정보불일치/오류";

                            var sendemjson = {
                                to: process.env.sdadminnvml,
                                subject: emailsubject,
                                message: emailcontent
                            }
                            //메일 전송
                            await scrapeLogic.sendemailPr(sendemjson); // 이메일 전송
                            await scrapeLogic.googlesheetappend(VALUES);
                            continue;
                        }

                        if (scgstextnum > 1) {  //신청갯수 2개이상이면 한번더 수동으로!
                            console.log("신청갯수가 " + scgstextnum + "개 이어서 수동으로 더 잡아야합니다!");
                            var scgstextnum2 = scgstextnum - 1;
                            var emailsubject = "연습실 유료 신청 갯수가 " + scgstextnum + "개 이어서 수동으로 [" + scgstextnum2 + "개] 더 잡아야합니다!";
                            var prdatecv = prscdatejson.dateYear + "-" + scrapeLogic.numpad(prscdatejson.dateMonth) + "-" + scrapeLogic.numpad(prscdatejson.dateDay);
                            var emailcontent = "연습실 유료 신청 갯수가 " + scgstextnum + "개 이어서 수동으로 [" + scgstextnum2 + "개] 더 잡아야합니다!\n" +
                                "----reqbd----\n" +
                                "/예약자명 : " + prjson.prscname + "\n" +  //name
                                "/예약일자 : " + await scrapeLogic.weekdaypr(prdatecv) + "\n" +
                                "/예약시간 : " + prusedateext.ipdatest1 + " " + prusedateext.ipdatest2 + " - " + prusedateext.ipdateed1 + " " + prusedateext.ipdateed2 + "\n" +
                                "/예약갯수 : " + scgstextnum + "개";

                            //VALUES[0][2] = "신청갯수2개이상/수동";  

                            var sendemjson = {
                                to: process.env.sdadminnvml,
                                subject: emailsubject,
                                message: emailcontent
                            }
                            //메일 전송
                            scrapeLogic.sendemailPr(sendemjson); // 이메일 전송
                            //await scrapeLogic.googlesheetappend(VALUES);
                        }
                        if (testsw == process.env.testsw) { //timeset
                            var ipyearval = 2023;
                            var ipmonthval = 10;
                            var ipdayval = "10";
                            var iptimestval1 = "오전";
                            var iptimeedval1 = "오전";
                            var iptimestval2 = "9:00";
                            var iptimeedval2 = "10:00";
                            //console.log();
                        } else {
                            var ipyearval = prscdatejson.dateYear;
                            var ipmonthval = prscdatejson.dateMonth;
                            var ipdayval = prscdatejson.dateDay;
                            var iptimestval1 = prusedateext.ipdatest1;
                            var iptimeedval1 = prusedateext.ipdateed1;
                            var iptimestval2 = prusedateext.ipdatest2;
                            var iptimeedval2 = prusedateext.ipdateed2;
                        }



                        var prscjson = {  // 실사용
                            prrqsw: "prrqAutoswon",
                            ipname: infochkname,
                            ipyear: ipyearval,  //숫자만! 스트링말고!
                            ipmonth: ipmonthval,    //숫자만! 스트링말고!
                            ipdate: ipdayval,  //스트링으로만!
                            timegb: iptimestval1, //스트링으로만!
                            timegb2: iptimeedval1, //스트링으로만!
                            iptime: iptimestval2, //스트링으로만!
                            iptime2: iptimeedval2, //스트링으로만!
                            ipgjst: prjson.prgjst,
                            ipgjsd: prjson.prgjsd,
                            ipgjga: gjgachatt,
                            ipprscrq: prjson.prscrq,
                            scgstext: scgstext,
                            prscnum: prjson.prscnum,
                            prscsp: prjson.prscsp,
                            ipscdate: prjson.prscdate,
                            infochkphnum: infochkphnum,
                        };

                        if (testsw == process.env.testsw) {
                            console.log(prscjson);
                        }
                        prjsonArray.push(prscjson);
                    }
                    if (testsw == process.env.testsw) {
                        rstmsgchk = await messagestest[0].id;
                    } else {
                        rstmsgchk = await messages[0].id;
                    }
                } catch (e) {
                    console.log("Error! 잘못된 요청값입니다. 종료합니다!");   //요청에 대한 에러처리 다시해야함
                    if (testsw == process.env.testsw) {
                        rstmsgchk = await messagestest[0].id;
                    } else {
                        rstmsgchk = await messages[0].id;
                    }
                    var emailsubject = "잘못된 요청으로 에러가 떳습니다. 종료합니다!";
                    var emailcontent = "잘못된 요청으로 에러가 떳습니다. 종료합니다!\n\n";


                    emailcontent += "-----error msg-----\n" +
                        e.message + "\n" +
                        "-----error stack-----\n" +
                        e.stack;

                    var sendemjson = {
                        to: process.env.sdadminnvml,
                        subject: emailsubject,
                        message: emailcontent
                    }
                    //메일 전송
                    await scrapeLogic.sendemailPr(sendemjson); // 이메일 전송
                }
                //위에서 확인된 예약 내용 복수로 가져와서 전달..
                prautoProcess(prjsonArray).then(() => {
                    setTimeout(startTimer, 5000); // 함수 실행 완료 후 5초 뒤에 다시 타이머 시작
                });
            } else {
                console.log("email check running... : " + counta + "");
                //완료된 예약 구글 시트에 저장하기! 이후에는 카카오톡으로 알림톡까지 자동으로 보내질 수 있게 그리고 이메일로 알림주기
                //정기권도 구분하기!!
                counta += 1;
            }

        }, 5000);
    } catch (e) {
        console.error(e);
        var emailsubject = "예약 요청 중 에러가 떳습니다.! [시스템에러-실행중단됨]";
        //var prdatecv = prscdatejson.dateYear + "-" + scrapeLogic.numpad(prscdatejson.dateMonth) + "-" + scrapeLogic.numpad(prscdatejson.dateDay);
        var emailcontent = "예약 요청 중 에러가 떳습니다.! [시스템에러-실행중단됨]\n" +
            e + "\n" +
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

async function prautoProcess(prjsonArray) {  //연습실 방잡기
    console.log("Run book process!");

    for (var i = 0; i < prjsonArray.length; i++) {
        const maxAttempts = 5; // 최대 실행 횟수 설정
        let attempts = 0;
        attempts++;
        console.log(`scrapelogic run count : ${attempts}`);
        var prscjson = {
            prrqsw: "prrqAutoswon",
            ipname: prjsonArray[i].ipname, //"김아무개",
            ipyear: prjsonArray[i].ipyear,   //2023;  //숫자만! 스트링말고!
            ipmonth: prjsonArray[i].ipmonth, //6;    //숫자만! 스트링말고!
            ipdate: prjsonArray[i].ipdate,   //"1";  //스트링으로만!
            timegb: prjsonArray[i].timegb,   //"오전"; //스트링으로만!
            timegb2: prjsonArray[i].timegb2,   //"오전"; //스트링으로만!
            iptime: prjsonArray[i].iptime,  //"2:30"; //스트링으로만!
            iptime2: prjsonArray[i].iptime2,  //"3:00"; //스트링으로만!
            ipprbtnm: prjsonArray[i].ipprbtnm,  //
            ipgjst: prjsonArray[i].ipgjst,
            ipgjsd: prjsonArray[i].ipgjsd,
            ipgjga: prjsonArray[i].ipgjga,
            ipprscrq: prjsonArray[i].ipprscrq,
            scgstext: prjsonArray[i].scgstext,
            prscnum: prjsonArray[i].prscnum,
            prscsp: prjsonArray[i].prscsp,
            ipscdate: prjsonArray[i].ipscdate,
            infochkphnum: prjsonArray[i].infochkphnum,

        }


        var resp = "";
        async function scrapeLogicProcess(prscjson) {
            var autoPrResult = await scrapeLogic.scrapeLogic(prscjson, resp);
            //console.log(autoPrResult);  //예약 성공 내역
            if (autoPrResult.rqcode == "0000" && autoPrResult.prresultcode == "0000") {
                console.log("booking success!!!");

            } else if (autoPrResult.rqcode == "0000" && autoPrResult.prresultcode == "0001" && attempts < maxAttempts) {
                console.log("booking failed, restart!!");
                await scrapeLogicProcess(prscjson);
            } else if (autoPrResult.rqcode == "0000" && autoPrResult.prresultcode == "0001" && attempts == maxAttempts) {
                console.log("The request was successful [ " + attempts + " times ], but I think I got an error in a row Check your email");
            } else if (autoPrResult.rqcode == "0000" && autoPrResult.prresultcode == "0002") {
                console.log("The request was successful, but I think I got an error Check your email");
            } else if (autoPrResult.rqcode == "0001" && autoPrResult.prresultcode == "0003") {
                console.log("The request was successful, but there seems to be a switch error.");
            } else if (autoPrResult.rqcode == "0001" && autoPrResult.prresultcode == "0004") {
                console.log("The value of the imported month is not a number.");
            }
        }
        await scrapeLogicProcess(prscjson);

    }

    // Promise를 반환하는 예시
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log("Process Success!!");
            resolve();
        }, 2000);
    });
}

async function googleemailmsgget(msgid) {
    const authClient = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    authClient.setCredentials({ refresh_token: REFRESH_TOKEN });
    const gmail = google.gmail({ version: 'v1', auth: authClient });

    try {
        const { data } = await gmail.users.messages.get({
            userId: 'me',
            id: msgid,
            format: 'full',
        });

        const messagePayload = data.payload;
        const parts = messagePayload.parts;

        let text = '';
        if (parts && parts.length) {
            parts.forEach(part => {
                if (part.mimeType === 'text/plain') {
                    text = part.body.data;
                }
            });
        } else if (messagePayload.mimeType === 'text/plain') {
            text = messagePayload.body.data;
        }

        let decodedText = await Buffer.from(text, 'base64url').toString('utf8');
        decodedText = await decodedText.trim();
        function removeExtraSpaces(str) {
            // 정규식을 사용하여 연속된 공백을 하나로 치환
            return str.replace(/\s+/g, ' ');
        }
        const resultstring = await removeExtraSpaces(decodedText);
        //console.log("!!가져온메일본문:");
        //console.log(resultstring);

        if (resultstring.indexOf(process.env.SdTitle + " Lab 새로운 예약이 확정 되었습니다.") != -1) {
            if (resultstring.indexOf("정기권") != -1) {
                console.log("정기권 신청같습니다. 수동으로 처리해주세요!");
                var prjson2 = await sdprnvparse(resultstring);
                var gjgach = prjson2.prgjga;
                gjgach = await gjgach.split("=");
                var gjgacha = await gjgach[1].trim();
                var gjgachatt = await gjgacha.slice(0, -1);
                var scgstext = gjgach[0];

                var VALUES = [
                    [
                        "예약",
                        process.env.SdTitle + " Lab",
                        "정기권결제",
                        prjson2.prscsp,
                        prjson2.prscdate,
                        prjson2.prscname,
                        "",
                        "",
                        "",
                        "",
                        "",
                        prjson2.prgjst,
                        prjson2.prgjsd,
                        gjgachatt,
                        prjson2.prscrq,
                        scgstext,
                        prjson2.prscnum,
                    ]
                ];
                scrapeLogic.googlesheetappend(VALUES);
                var emailsubject = "예약요청이 정기권인것 같습니다 우선 종료합니다.";
                var emailcontent = "예약요청이 정기권인것 같습니다 우선 종료합니다.\n" +
                    "----reqbd----\n" +
                    "/예약자명 : " + prjson2.prscname + "\n" +  //name
                    "/예약일자 : " + prjson2.prscdate + "\n" +
                    "/예약금액 : " + gjgachatt + "\n" +
                    "/예약갯수 : " + scgstext + "개";

                var sendemjson = {
                    to: process.env.sdadminnvml,
                    subject: emailsubject,
                    message: emailcontent
                }
                //메일 전송
                scrapeLogic.sendemailPr(sendemjson); // 이메일 전송
                return "";  //null값으로 리턴
            }
            const prjson = await sdprnvparse(resultstring);
            return prjson;
            //console.log(sdprnvparse(resultstring));
            //console.log(prjson);
        }
    } catch (e) {
        console.error(e);
        var emailsubject = "예약요청중 에러발생!!";
        var emailcontent = "예약요청중 에러발생!!\n" +
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

async function sdprnvparse(resultstring) {
    const text = resultstring;
    var startKeyword = "예약자명";
    var endKeyword = "예약신청";
    var result = await extractTextBetweenWords(text, startKeyword, endKeyword);
    result = await result.replace(startKeyword, "").trim();
    result = await result.slice(0, -1);

    //console.log(result);
    var prscname = result;
    startKeyword = "예약신청 일시";
    endKeyword = "예약내역";
    result = await extractTextBetweenWords(text, startKeyword, endKeyword);
    result = await result.replace(startKeyword, "").trim();
    //console.log(result);
    var prscdate = result;
    startKeyword = "예약번호";
    endKeyword = "예약상품";
    result = await extractTextBetweenWords(text, startKeyword, endKeyword);
    result = await result.replace(startKeyword, "").trim();
    //console.log(result);
    var prscnum = result;
    startKeyword = "예약상품";
    endKeyword = "이용일시";
    result = await extractTextBetweenWords(text, startKeyword, endKeyword);
    result = await result.replace(startKeyword, "").trim();
    //console.log(result);
    var prscsp = result;
    startKeyword = "이용일시";
    endKeyword = "결제상태";
    result = await extractTextBetweenWords(text, startKeyword, endKeyword);
    result = await result.replace(startKeyword, "").trim();
    //console.log(result);
    var prusedate = result;
    startKeyword = "결제상태";
    endKeyword = "결제수단";
    result = await extractTextBetweenWords(text, startKeyword, endKeyword);
    result = await result.replace(startKeyword, "").trim();
    //console.log(result);
    var prgjst = result;
    startKeyword = "결제수단";
    endKeyword = "결제금액";
    result = await extractTextBetweenWords(text, startKeyword, endKeyword);
    result = await result.replace(startKeyword, "").trim();
    //console.log(result);
    var prgjsd = result;

    startKeyword = "결제금액";
    endKeyword = "매장방문결제";
    result = await extractTextBetweenWords(text, startKeyword, endKeyword);
    result = await result.replace(startKeyword, "").trim();
    //console.log(result);
    var prgjga = result;

    startKeyword = "요청사항";
    endKeyword = "자세히 보기";
    result = await extractTextBetweenWords(text, startKeyword, endKeyword);
    result = await result.replace(startKeyword, "").trim();
    //console.log(result);
    var prscrq = result;

    var totaljson = {
        prscname: prscname,
        prscdate: prscdate,
        prscnum: prscnum,
        prscsp: prscsp,
        prusedate: prusedate,
        prgjst: prgjst,
        prgjsd: prgjsd,
        prgjga: prgjga,
        prscrq: prscrq
    }
    //console.log(totaljson);
    return totaljson;
}

function extractTextBetweenWords(inputText, startWord, endWord) {
    // 시작 단어의 인덱스를 찾습니다.
    const startIndex = inputText.indexOf(startWord);

    // 시작 단어의 다음 인덱스부터 끝 단어의 인덱스를 찾습니다.
    const endIndex = inputText.indexOf(endWord, startIndex + startWord.length);

    // 시작 단어의 인덱스부터 끝 단어의 인덱스 이전까지의 문자열을 추출합니다.
    const extractedText = inputText.substring(startIndex, endIndex);

    return extractedText;
}

async function prdateExt(ipdate) {
    //ipdate = "2023.05.15.(월) 오후 22:00~오후 23:00";
    //	2023.06.23.(금) 오후20:30~오후22:30
    var ipdatear1 = await ipdate.split(" ");
    var ipdatedt = await ipdatear1[0].trim();
    var ipdatear2 = await ipdatear1[1].split("~");

    var ipdatest = ipdatear2[0];
    var ipdateed = ipdatear2[1];
    // 오후를 추출
    const timeRegex = /([오전|오후]+)/;
    var timeMatch = await ipdatest.match(timeRegex);
    var ipdatestext1 = timeMatch[0];
    var timeMatch2 = await ipdateed.match(timeRegex);
    var ipdateedext1 = timeMatch2[0];

    // 시간을 추출
    const hourRegex = /(\d{1,2}):(\d{2})/;

    var hourMatch = await ipdatest.match(hourRegex);
    var ipdatestext2 = hourMatch[0];

    var hourMatch2 = await ipdateed.match(hourRegex);
    var ipdateedext2 = hourMatch2[0];

    //ipdatestext2 = "12:00";
    //ipdateedext2 = "00:00";

    var datejson = {
        ipdatedt: ipdatedt,
        ipdatest1: ipdatestext1,
        ipdatest2: await convertTime(ipdatestext2),
        ipdateed1: ipdateedext1,
        ipdateed2: await convertTime(ipdateedext2),
        ipdatedtpr: "",

    }
    //console.log(datejson);
    return datejson;
}

async function convertTime(timeString) {
    const parts = timeString.split(":");
    let hour = parseInt(parts[0]);
    let minute = parseInt(parts[1]);

    // 24시간 형식을 12시간 형식으로 변환
    if (hour > 12) {
        hour -= 12;
    } else if (hour == 0) {
        hour = 12;
    }
    // 분이 한 자리 수인 경우 앞에 0을 추가
    if (minute < 10) {
        minute = "0" + minute;
    }

    // 변환된 시간 문자열 반환
    return hour + ":" + minute;
}

async function prdtcovDate(dateString) {
    //dateString = "2023.05.15.(월)";
    //console.log(dateString);
    var dateStringAr = dateString.split(".");
    var dateYear = parseInt(dateStringAr[0]);  //숫자만
    var dateMonthcv = dateStringAr[1]; //숫자만
    var dateDaycv = dateStringAr[2];

    var dateMonth = parseInt(dateMonthcv, 10);//숫자만
    var dateDay = parseInt(dateDaycv, 10) + ""; //String만

    var extDateJson = {
        dateYear: dateYear,
        dateMonth: dateMonth,
        dateDay: dateDay,
    }
    //console.log(extDateJson);
    return extDateJson;
}

async function sendemailPr2(sendemjson) {
    const authClient = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
    authClient.setCredentials({ refresh_token: REFRESH_TOKEN });

    var to = sendemjson.to;
    var subject = sendemjson.subject;
    var message = sendemjson.message;

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
    const mailOptions = {
        from: '"테스트" <' + process.env.sdadminnvml + '>', // 발신자 정보
        to: to, // 수신자 정보
        subject: subject, // 제목
        text: message, // 내용 (텍스트)
        //html: "<b>html-이메일 테스트중</b>", // 내용 (HTML)
    };
    const result = await transport.sendMail(mailOptions);
    //console.log(result);
}

async function blindnamechkPr(ipname, dbname) {
    // ipname = "홍길준";
    // dbname = "홍*준";
    if (ipname[0] == dbname[0] && ipname[ipname.length - 1] == dbname[dbname.length - 1]) {
        //Logger.log("이름이 같아 보입니다");
        return { chknameresult: true };
    } else {
        //Logger.log("이름이 다릅니다");
        return { chknameresult: false };
    }
}

module.exports = {
    startTimer
};