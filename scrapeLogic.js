const puppeteer = require("puppeteer");
var nodemailer = require('nodemailer');
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const fs = require('fs');
const ktMsgSendPr = require("./ktMsgSendPr");

require("dotenv").config();
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;
const REFRESH_TOKEN2 = process.env.REFRESH_TOKEN2;
const SHEET_NAME = process.env.SHEET_NAME;
const SHEET_ID = process.env.SHEET_ID;

const scrapeLogic = async (reqbd, res) => {
  const browser = await puppeteer.launch({
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath:
      process.env.NODE_ENV === 'production'
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });
  try {
    var emailsubject = "";
    var emailcontent = "";

    //2시간 이상인지 체크하기 위한용도
    const ipnamec = reqbd.ipname //이름
    const timegbc = reqbd.timegb;   //"오전";
    const timegbc2 = reqbd.timegb2;   //"오전"; 
    const iptimec = reqbd.iptime;   //"2:30";
    const iptimec2 = reqbd.iptime2; //"2:30";
    var timechk1 = timegbc + " " + iptimec;
    var timechk2 = timegbc2 + " " + iptimec2;
    var timeDiff = timeDifference(timechk1, timechk2);
    //console.log(typeof timeDiff); // 시간 간격 출력
    var prdatecv = reqbd.ipyear + "." + numpad(reqbd.ipmonth) + "." + numpad(reqbd.ipdate) + ".";
    var prdatecvwk = await weekdaypr(prdatecv);
    var prbjbt = "미배정";
    var stipVALUES = [
      [
        "예약",
        process.env.SdTitle + " Lab",
        prbjbt,
        reqbd.prscsp,
        reqbd.ipscdate,
        ipnamec,
        prdatecvwk,
        reqbd.timegb,
        reqbd.iptime,
        reqbd.timegb2,
        reqbd.iptime2,
        reqbd.ipgjst,
        reqbd.ipgjsd,
        reqbd.ipgjga,
        reqbd.ipprscrq,
        reqbd.scgstext,
        reqbd.prscnum,
        reqbd.infochkphnum,
      ]
    ];


    if (timeDiff > 2) {
      console.log("It will end after more than 2 hours.");

      emailsubject = "(제목)신청시간이 2시간 초과여서 종료합니다! 방을 직접 잡아주세요! 추후 자동예정";
      emailcontent = "(본문)신청시간이 2시간 초과여서 종료합니다! 방을 직접 잡아주세요! 추후 자동예정\n" +
        "----reqbd----\n" +
        "/예약자명 : " + reqbd.ipname + "\n" +  //name
        "/예약일자 : " + prdatecvwk + "\n" +
        "/예약시간 : " + reqbd.timegb + " " + reqbd.iptime + " - " + reqbd.timegb2 + " " + reqbd.iptime2 + "\n";

      stipVALUES[0][2] = "2시가초과/수동";
      googlesheetappend(stipVALUES);
      var sendemjson = {
        to: process.env.sdadminnvml,
        subject: emailsubject,
        message: emailcontent
      }
      //메일 전송
      sendemailPr(sendemjson); // 이메일 전송
      return { rqcode: "0000", prresultcode: "0002", prsultreson: "It will end after more than 2 hours." };
    }



    if (reqbd.prrqsw == process.env.RQSW_ID) {
      console.log("Run Booking Process !! Start !!");
      res.send("Run Booking Process !! Start !!");
    } else if (reqbd.prrqsw = process.env.RQSWAutoPr_ID) {
      console.log("Run Booking Process !! Start !!");

    } else {
      await browser.close();
      res.send("연습실 자동예약 스위치 입력이 올바르지 않습니다. 종료합니다.");
      stipVALUES[0][2] = "오류/sw오류";
      googlesheetappend(stipVALUES);
      return { rqcode: "0001", prresultcode: "0003", prsultreson: "sw error" };
    }
    //console.log(reqbd);
    const page = await browser.newPage();
    // Set screen size
    await page.setViewport({ width: 1920, height: 1080 });

    await page.goto(process.env.NvBk_SiteUrl, { waitUntil: 'networkidle2' });
    //console.log('로그인버튼 클릭!');
    const liXPathlg = '//*[@id="gnb_login_button"]/span[3]';
    const liElementlg = await page.waitForXPath(liXPathlg);
    await liElementlg.click();

    const liXPath1 = '//*[@id="id"]';
    const liElement1 = await page.waitForXPath(liXPath1);
    await liElement1.click();

    let nvbk_scret = process.env.NvBk_Secret;
    for (let char of nvbk_scret) {
      await page.keyboard.press(char);
    }

    await page.waitForTimeout(1000);
    await page.keyboard.down('ControlLeft');
    await page.keyboard.press('KeyA');
    await page.keyboard.press('KeyX');
    await page.keyboard.up('ControlLeft');
    await page.keyboard.press('Backspace');

    //console.log('비번 입력칸 클릭!');
    await page.click('#pw');
    await page.keyboard.down('ControlLeft');
    await page.keyboard.press('KeyV');
    await page.keyboard.up('ControlLeft');
    await page.waitForTimeout(1000);

    await page.click('#id');
    let nvbk_id = process.env.NvBk_Id;
    for (let idchar of nvbk_id) {
      await page.keyboard.press(idchar);
    }
    await page.keyboard.down('ControlLeft');
    await page.keyboard.press('KeyA');
    await page.keyboard.press('KeyC');
    await page.keyboard.up('ControlLeft');
    await page.keyboard.press('Backspace');
    await page.keyboard.down('ControlLeft');
    await page.keyboard.press('KeyV');
    await page.keyboard.up('ControlLeft');
    await page.waitForTimeout(1000);

    //console.log('입력후 로그인버튼 클릭!');
    await page.click('.btn_login');
    const liXPathsrch = '//*[@id="container"]/div/div/div[1]/div[2]/button';
    const liElementsrch = await page.waitForXPath(liXPathsrch);
    await liElementsrch.click();

    await page.waitForSelector('#calendar');
    const ipyear = reqbd.ipyear;   //2023;  //숫자만! 스트링말고!
    const ipmonth = reqbd.ipmonth; //6;    //숫자만! 스트링말고!
    const ipdate = reqbd.ipdate;   //"1";  //스트링으로만!
    const timegb = reqbd.timegb;   //"오전"; //스트링으로만!
    const timegb2 = reqbd.timegb2;   //"오전"; //스트링으로만!
    const iptime = reqbd.iptime;   //"2:30"; //스트링으로만!
    const iptime2cv = subtract30Minutes(reqbd.iptime2);   //"3:00"; //스트링으로만!

    const getyearval = await page.evaluate(() => {
      const getyear = document.querySelector('.calendar-title span:nth-child(1)').textContent; //년도
      return parseInt(getyear);
    });
    const getmonthval = await page.evaluate(() => {
      const getmonth = document.querySelector('.calendar-title span:nth-child(2)').textContent; //월
      return parseInt(getmonth);
    });

    //console.log("가져온 년도 : " + getyearval);
    //console.log("가져온 월 : " + getmonthval);

    function getMonthChange(baseYear, baseMonth, newYear, newMonth) {
      // 기준 년월과 새로운 년월을 월 단위로 변환함
      const baseMonthValue = baseYear * 12 + baseMonth;
      const newMonthValue = newYear * 12 + newMonth;

      // 새로운 월과 기준 월의 차이를 구함
      const diff = newMonthValue - baseMonthValue;

      return diff;
    }
    const getmc = await getMonthChange(getyearval, getmonthval, ipyear, ipmonth);
    //console.log("기준 년월보다 : " + getmc);
    var monthxpath = '';
    var monthgb = '';
    if (typeof getmc === 'number') {
      if (getmc < 0) { //음수일경우
        monthxpath = '//*[@id="calendar"]/div/a[1]'; //이전달
        monthgb = '이전달';
      }
      else if (getmc > 0) { //양수일경우
        monthxpath = '//*[@id="calendar"]/div/a[2]';  //다음달
        monthgb = '다음달';
      }
      if (getmc != 0) {
        //console.log("for문 준비 chk!");
        var getmcplus = Math.abs(getmc);   //for문위해 음수를 양수로
        for (let v = 0; v < getmcplus; v++) {
          //console.log(v + "번 " + monthgb + " 클릭");
          const liElemonth = await page.waitForXPath(monthxpath);
          await liElemonth.click();
          await page.waitForTimeout(500);
        }
        //console.log("월바꾸기 완료!");
      }
    }
    else {
      await browser.close();
      //res.send('가져온 월값이 숫자가 아닙니다. 종료합니다.');
      console.log("가져온 월값이 숫자가 아닙니다. 종료합니다.");
      stipVALUES[0][2] = "오류/월값숫자x";
      googlesheetappend(stipVALUES);
      return { rqcode: "0001", prresultcode: "0004", prsultreson: "get month error" };;
    }

    const elements = await page.$$('tr[ng-repeat="row in $ctrl.calendarRows"] td');
    for (let i = 0; i < elements.length; i++) {
      const span = await elements[i].$('span');
      const value = await page.evaluate(el => el.innerText, span);
      //console.log("날짜 : "+value);
      if (value == ipdate) {
        const aTag = await elements[i].$('a');
        await aTag.click();
        // `div class='am'` 요소가 있는지 확인
        await page.$('div.am');
        // `//div[@class='am']` xpath 요소가 있는지 확인
        //const amDiv = await page.$x('/html/body/app/bk-alert/div/div[2]/p/span');
        //console.log("원하는 날짜 클릭완료됨");
        await page.waitForSelector('.am');
        if (timegb == "오전") {
          var div2 = await page.$('div.am');
        } else if (timegb == "오후") {
          var div2 = await page.$('div.pm');
        }
        if (timegb2 == "오전") {
          var div3 = await page.$('div.am');
        } else if (timegb2 == "오후") {
          var div3 = await page.$('div.pm');
        }
        const elements2 = await div2.$$('li.item');
        const elements3 = await div3.$$('li.item');
        for (let i = 0; i < elements2.length; i++) {
          const span2 = await elements2[i].$('span[ng-bind="$ctrl.getStartTime(timeSchedule)"]');
          const value2 = await page.evaluate(el => el.innerText, span2);
          if (value2 == iptime) {
            const aTag2 = await elements2[i].$('a');
            await aTag2.click();
            // console.log("원하는 시간1 클릭완료됨:"+iptime);
            // console.log("원하는 시간1 element:" +value2);
            break;
          }
        }
        
        for (let i = 0; i < elements3.length; i++) {
          const span3 = await elements3[i].$('span[ng-bind="$ctrl.getStartTime(timeSchedule)"]');
          const value3 = await page.evaluate(el => el.innerText, span3);
          //console.log(value3);
          if (value3 == iptime2cv) {
            const aTag3 = await elements3[i].$('a');
            await aTag3.click();
            // console.log("원하는 시간2 클릭완료됨:"+iptime2cv);
            // console.log("원하는 시간2 element:" +value3);
            break;
          }
        }
        //
        const liXPathsrfnl = '//*[@id="container"]/div/div/bk-select-time-schedule/div/div[3]/button';
        const liElementsrfnl = await page.waitForXPath(liXPathsrfnl);
        await liElementsrfnl.click();
        await page.waitForTimeout(1000);

        var liElements = await page.$$('ul.lst_item_box > li.item');

        var prroomchkArray = [
          process.env.SdBtName1,
          process.env.SdBtName2,
          process.env.SdBtName3
        ];


        var roomchk = false;
        var bjroomchk = "";
        if (liElements.length != 0) {
          outerLoop: for (var s = 0; s < prroomchkArray.length; s++) {
            for (let liElement of liElements) {
              const scroomtitle = await page.evaluate(el => el.querySelector('a.lnk_item_book').getAttribute('title'), liElement);
              //console.log("검색된 연습실명:" + scroomtitle);
              if (scroomtitle === prroomchkArray[s]) {
                //console.log("원하는 방 클릭준비");
                var aElement = await liElement.$('a[title="' + prroomchkArray[s] + '"]');
                await aElement.click();
                //console.log("원하는 방 클릭완료");
                roomchk = true;
                bjroomchk = prroomchkArray[s];
                break outerLoop;
              }
            }
          }
        }


        if (roomchk == false) {
          await browser.close();
          //res.send('원하는 방이 없습니다 종료합니다!');
          console.log("There is no room. Exit the program!");

          emailsubject = "(제목)예약가능한 방이 없습니다 종료합니다!";
          emailcontent = "(본문)예약가능한 방이 없습니다 종료합니다!\n" +
            "----reqbd----\n" +
            "/예약자명 : " + reqbd.ipname + "\n" +  //name
            "/예약일자 : " + prdatecvwk + "\n" +
            "/예약시간 : " + reqbd.timegb + " " + reqbd.iptime + " - " + reqbd.timegb2 + " " + reqbd.iptime2 + "\n";

          var sendemjson = {
            to: process.env.sdadminnvml,
            subject: emailsubject,
            message: emailcontent
          }

          stipVALUES[0][2] = "TO없음/수동";
          googlesheetappend(stipVALUES);
          //메일 전송
          sendemailPr(sendemjson); // 이메일 전송
          return { rqcode: "0000", prresultcode: "0002", prsultreson: "No rooms available for reservation" };
        }
        //await page.waitForTimeout(5000);
        //console.log("5초지나고 스크린샷");
        const seltimexp = '//*[@id="container"]/bk-freetime/div[2]/bk-select-time-schedule/div/div[3]/button';
        await page.waitForXPath(seltimexp);
        await page.waitForTimeout(500);

        if (timegb == "오전") {
          var div4 = "am";
        } else if (timegb == "오후") {
          var div4 = "pm";
        }

        if (timegb2 == "오전") {
          var div5 = "am";
        } else if (timegb2 == "오후") {
          var div5 = "pm";
        }

        // div5 = "pm";
        // iptime = "10:00";
        // iptime2cv = "10:30";

        var liElements2 = await page.$$('div.' + div4 + ' > ul.lst_time > li.item');
        for (let liElement2 of liElements2) {
          const spanText = await page.evaluate(el => el.querySelector('span.time_info_box > span').textContent, liElement2);
          if (spanText === iptime) {
            var aElement2 = await liElement2.$('a.anchor');
            await aElement2.click();
            break;
          }
        }

        var liElements3 = await page.$$('div.' + div5 + ' > ul.lst_time > li.item');
        for (let liElement3 of liElements3) {
          const spanText2 = await page.evaluate(el => el.querySelector('span.time_info_box > span').textContent, liElement3);
          if (spanText2 === iptime2cv) {
            var aElement3 = await liElement3.$('a.anchor');
            await aElement3.click();
            break;
          }
        }

        var prtimechk = false;
        try {
          // 태그 선택자를 사용하여 원하는 요소를 추출합니다.
          const text = await page.$eval('div.ly_alert span._booking_alert_txt', element => element.textContent);
          //console.log("선택chk: " + text);
        } catch {
          //console.log("선택chk: 메시지가 없습니다.");
          prtimechk = true;
        }

        if (prtimechk != true) {

          emailsubject = "(제목)예약가능한 방이 없는것 같습니다. 예약시간이 선택이 안됩니다.";
          emailcontent = "(본문)예약가능한 방이 없는것 같습니다. 예약시간이 선택이 안됩니다.\n" +

            "----reqbd----\n" +
            "/예약자명 : " + reqbd.ipname + "\n" +  //name
            "/예약일자 : " + prdatecvwk + "\n" +
            "/예약시간 : " + reqbd.timegb + " " + reqbd.iptime + " - " + reqbd.timegb2 + " " + reqbd.iptime2 + "\n";

          var sendemjson = {
            to: process.env.sdadminnvml,
            subject: emailsubject,
            message: emailcontent
          }

          stipVALUES[0][2] = "TO없음/수동";
          googlesheetappend(stipVALUES);
          //메일 전송
          sendemailPr(sendemjson); // 이메일 전송
          return { rqcode: "0000", prresultcode: "0002", prsultreson: "No rooms available for reservation" };

        }

        // const screenshot = await page.screenshot({ fullPage: true });
        // // 스크린샷 저장
        // fs.writeFileSync('screenshot.png', screenshot);

        //console.log("최종시간선택 확정 클릭");
        const liXPathsrfnl2 = '//*[@id="container"]/bk-freetime/div[2]/bk-select-time-schedule/div/div[3]/button';
        const liElementsrfnl2 = await page.waitForXPath(liXPathsrfnl2);
        await liElementsrfnl2.click();

        //console.log("최종선택 다음단계 클릭");
        const liXPathsrfnl3 = '//*[@id="container"]/bk-freetime/div[2]/div[2]/bk-submit/div/button';
        const liElementsrfnl3 = await page.waitForXPath(liXPathsrfnl3);
        await liElementsrfnl3.click();

        await page.waitForXPath('//*[@id="name"]');

        //console.log("최종 예약확정 클릭");
        const liXPathsrfngo = '//*[@id="container"]/bk-freetime/div[2]/div[2]/bk-submit/div/button';
        const liElementsrfngo = await page.waitForXPath(liXPathsrfngo);
        await liElementsrfngo.click();

        //console.log("예약완료화면 기다리기");
        await page.waitForXPath('//*[@id="container"]/bk-freetime/div[2]/div[2]/bk-submit/bk-notify-popup/div/div[2]/div/strong');
        //console.log("예약완료화면 확인!");
        // Get the strong element
        var strongElement = await page.$('strong.title');
        var spanElement = await strongElement.$('span');
        var spanText = await page.evaluate(el => el.textContent, spanElement);
        var strongText = await page.evaluate((el, span) => el.textContent.replace(span, ''), strongElement, spanText);
        var resultchk = spanText + strongText;
        //console.log(resultchk);

        await browser.close();
        //res.set('Content-Type', 'image/png');
        //res.send(screenshot);
        const apprtime = reqbd.timegb + " " + reqbd.iptime + " - " + reqbd.timegb2 + " " + reqbd.iptime2;
        const ktsjs = {
          ktsdname : reqbd.ipname,
          apprnum : bjroomchk,
          date: prdatecvwk,
          time: apprtime,
          appay: reqbd.ipgjga,
          appaysd: reqbd.ipgjsd,
          apbb: "네이버예약"
        }

        const msgrqrst = await ktMsgSendPr.ktsendPr(ktsjs);
        var msgrqval = "";
        if(msgrqrst == "0000"){
          msgrqval = "전송성공 (code:"+msgrqrst+")";
        }else{
          msgrqval = "전송실패 (code:"+msgrqrst+")";
        }
        emailsubject = "(제목)예약이 성공적으로 완료되었습니다.!";
        emailcontent = "(본문)예약이 성공적으로 완료되었습니다.!\n" +
          "*혹시 셀프예약 회원이면 중복예약일 수 있으니 예약을 취소해주세요!\n" +
          "----reqbd----\n" +
          "/예약자명 : " + reqbd.ipname + "\n" +  //name
          "/예약일자 : " + prdatecvwk + "\n" +
          "/예약시간 : " + apprtime + "\n" +
          "/예약완료부스 : " + bjroomchk + "\n"+
          "/메시지 전송결과 : " + msgrqval;
          "/예약클릭시간 : 1st['"+iptime+"'], 2nd['"+iptime2cv+"'] <-제대로 클릭되었는지 확인해보기!"; 

        stipVALUES[0][2] = bjroomchk;
        googlesheetappend(stipVALUES);

        var sendemjson = {
          to: process.env.sdadminnvml,
          subject: emailsubject,
          message: emailcontent
        }
        //메일 전송
        sendemailPr(sendemjson); // 이메일 전송


        return { rqcode: "0000", prresultcode: "0000", prsultreson: "Booking Success!!" };
      }
    }

  } catch (e) {

    await browser.close();
    console.error(e);
    var emailsubject = "(제목)예약 중 에러가 떳습니다.!";
    var emailcontent = "(본문)예약 중 에러가 떳습니다.!\n" +
      "-----error msg-----\n" +
      e.message + "\n" +
      "-----error stack-----\n" +
      e.stack;

    stipVALUES[0][2] = "예약에러";
    googlesheetappend(stipVALUES);

    var sendemjson = {
      to: process.env.sdadminnvml,
      subject: emailsubject,
      message: emailcontent,
      attachmsg: "ok"
    }

    //메일 전송
    sendemailPr(sendemjson); // 이메일 전송
    return { rqcode: "0000", prresultcode: "0001", prsultreson: "Error during execution!" };
    //res.send(`Something went wrong while running Puppeteer: ${e}`);
  } finally {
    await browser.close();
  }
};

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

function numpad(number) {
  return number.toString().padStart(2, "0");
}

async function weekdaypr(ipdate) {
  //ipdate = '2023-05-20';
  const date = new Date(ipdate);
  const dayOfWeek = date.getDay();
  const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];
  const dayweekresult = ipdate + " (" + daysOfWeek[dayOfWeek] + ")";
  return dayweekresult;
}

function subtract30Minutes(timeString) {
    // 시간과 분으로 분리합니다.
    const [hours, minutes] = timeString.split(':').map(str => parseInt(str, 10));
    // 시간에서 30분을 빼줍니다.
    let newHours = hours;
    let newMinutes = minutes - 30;
    if (newMinutes < 0) {
      newMinutes += 60;
      newHours -= 1;
    }
    // 시간을 24시간 형식으로 만듭니다.
    if (newHours < 0) {
      newHours += 24;
    }
    // 결과를 문자열로 반환합니다.
    if(newHours==0){
        newHours = 12;
    }

    return `${newHours}:${newMinutes.toString().padStart(2, '0')}`;
  }

function timeDifference(time1, time2) {
  let hour1 = parseInt(time1.split(" ")[1].split(":")[0]);
  let hour2 = parseInt(time2.split(" ")[1].split(":")[0]);
  let minute1 = parseInt(time1.split(" ")[1].split(":")[1]);
  let minute2 = parseInt(time2.split(" ")[1].split(":")[1]);

  if (time1.split(" ")[0] === "오후" && hour1 !== 12) {
    hour1 += 12;
  }
  if (time2.split(" ")[0] === "오후" && hour2 !== 12) {
    hour2 += 12;
  }

  let difference = ((hour2 - hour1) * 60 + (minute2 - minute1)) / 60;
  return difference;
}


async function googlesheetappend(VALUES) {
  const RANGE = `${SHEET_NAME}!A:B`; // ex) Sheet1!A1:B2  //한글도가능

  const authClient = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
  authClient.setCredentials({ refresh_token: REFRESH_TOKEN2 });
  const sheets = google.sheets({ version: 'v4', auth: authClient });
  try {

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      //spreadsheetName: SHEET_NAME,
      range: RANGE,
      valueInputOption: 'USER_ENTERED',
      resource: { values: VALUES },
    });
    console.log(`시트에 행이 추가되었습니다.`);

    // const response = await sheets.spreadsheets.values.get({  //sheet get!
    //   spreadsheetId,
    //   range: `${sheetName}!${range}`,
    // });

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
    sendemailPr(sendemjson); // 이메일 전송
  }

}


module.exports = { scrapeLogic, numpad, weekdaypr, sendemailPr, googlesheetappend };
