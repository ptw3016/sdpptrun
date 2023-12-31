const puppeteer = require("puppeteer");
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const scrapeLogic = require("./scrapeLogic");

const fs = require('fs');

require("dotenv").config();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;
const REFRESH_TOKEN2 = process.env.REFRESH_TOKEN2;
const SHEET_ID = process.env.SHEET_ID;
const SdTitle = process.env.SdTitle;

const sdprgetinfo = async () => {  //(reqbd, res) 화면 보려면 이거.
    const sdprchkbrs = await puppeteer.launch({
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
    console.log("ready");
    const sdipage = await sdprchkbrs.newPage();
    try {

        //console.log("ready");
        //const sdipage = await sdprchkbrs.newPage();
        // Set screen size
        await sdipage.setViewport({ width: 1920, height: 1080 });
        await sdipage.goto(process.env.NvBkad_SiteUrl, { waitUntil: 'networkidle2' });

        const liXPath1 = '//*[@id="id"]';
        const liElement1 = await sdipage.waitForXPath(liXPath1);
        await liElement1.click();

        let nvbk_scret = process.env.NvBk_Secret;
        for (let char of nvbk_scret) {
            await sdipage.keyboard.press(char);
        }

        await sdipage.waitForTimeout(1000);
        await sdipage.keyboard.down('ControlLeft');
        await sdipage.keyboard.press('KeyA');
        await sdipage.keyboard.press('KeyX');
        await sdipage.keyboard.up('ControlLeft');
        await sdipage.keyboard.press('Backspace');

        //console.log('비번 입력칸 클릭!');
        await sdipage.click('#pw');
        await sdipage.keyboard.down('ControlLeft');
        await sdipage.keyboard.press('KeyV');
        await sdipage.keyboard.up('ControlLeft');
        await sdipage.waitForTimeout(1000);

        await sdipage.click('#id');
        let nvbk_id = process.env.NvBk_Id;
        for (let idchar of nvbk_id) {
            await sdipage.keyboard.press(idchar);
        }
        await sdipage.keyboard.down('ControlLeft');
        await sdipage.keyboard.press('KeyA');
        await sdipage.keyboard.press('KeyC');
        await sdipage.keyboard.up('ControlLeft');
        await sdipage.keyboard.press('Backspace');
        await sdipage.keyboard.down('ControlLeft');
        await sdipage.keyboard.press('KeyV');
        await sdipage.keyboard.up('ControlLeft');
        await sdipage.waitForTimeout(1000);

        //console.log('입력후 로그인버튼 클릭!');
        await sdipage.click('.btn_login');
        await sdipage.waitForTimeout(8000);

        //[내역이상시, sctesttoolmemo.js chk]
        //------------------------------
        //throw new Error('error test!');

        await sdipage.waitForXPath('//*[contains(@class, "BookingListView__contents-inner__")]');
        await sdipage.waitForXPath('//*[contains(@class, "BookingListView__content__")]');
        await sdipage.waitForXPath('//*[contains(@class, "BookingListView__name__")]');

        var elements = await sdipage.$$('[class*="BookingListView__contents-inner__"]');
        var elements2 = await sdipage.$$('[class*="BookingListView__content__"]');

        var prscinfoname = "";
        var prscinfophnum = "";
        var memberinfochk = false;
        //console.log("이용내역갯수:"+elements.length);
        let elementslth = elements.length;
        //elementslth = 0;

        // const screenshot = await sdipage.screenshot({ fullPage: true });
        // fs.writeFileSync('screenshot.png', screenshot);

        if (elementslth > 0) {
            var latestdateArray = [];
            for (var i = 0; i < elements.length; i++) {
                var lastElement2 = elements[i]; //제일 최근 예약자 정보 가져오기
                var lastElement3 = elements2[i];
                var nameElement2 = await lastElement2.$('[class*="BookingListView__name__"]');  //^가아닌 *로!
                var sclatestElement = await lastElement3.$('[class*="BookingListView__order-date__"]');
                var nyname2 = await sdipage.evaluate((el) => el.textContent, nameElement2);
                var sclatestDate = await sdipage.evaluate((el) => el.textContent, sclatestElement);
                //console.log("elements[" + i + "]:" + nyname2 + "/latestDate:" + sclatestDate);
                latestdateArray.push(sclatestDate);
            }

            //console.log(latestdateArray);
            const ltid = await findLatestDate(latestdateArray);
            //console.log("ltid:" + ltid);

            const lastElement = elements[ltid]; //제일 최근 예약자 정보 가져오기
            const nameElement = await lastElement.$('[class*="BookingListView__name__"]');
            var nyname = await sdipage.evaluate((el) => el.textContent, nameElement);
            const phElement = await lastElement.$('[class*="BookingListView__phone__"]');
            var phNumber = await sdipage.evaluate((el) => el.textContent, phElement);
            prscinfoname = nyname;
            prscinfophnum = phNumber;
            await sdipage.waitForTimeout(500);
            //console.log("infochknm:" + prscinfoname);
            // console.log("수정중ph:" + prscinfophnum);


        } else {
            const sshotattach = await sdipage.screenshot({ fullPage: true });

            console.log("이용내역중 리스트가 없습니다! 종료합니다!");
            //console.log("chkboolean: " + memberinfochk);
            // console.log(minfochkname);
            // console.log(minfochkphnum);

            emailsubject = "(Lab연습실)이용내역중 조회된 리스트가 없습니다! 종료합니다!";
            emailcontent = "(Lab연습실)이용내역중 조회된 리스트가 없습니다! 종료합니다!\n" +
                "클래스 변경 가능성있음 확인!\n" +
                "----reqbd----\n" +
                "/이용내역 조회갯수 : " + elements.length;

            // 스크린샷 저장
            var sendemjson = {
                to: process.env.sdadminnvml,
                subject: emailsubject,
                message: emailcontent,
                attachmsg: "ok",
                screenshotfn: sshotattach

            }
            //메일 전송
            await scrapeLogic.sendemailPr(sendemjson); // 이메일 전송
            return { memberinfochk: memberinfochk, minfochkname: prscinfoname, minfochkphnum: prscinfophnum, mifcrtcode: "" }
        }


        if (nyname == "" || phNumber == "") {
            console.log("이용내역 조회는 완료했으나 가져온 데이터가 널값입니다!");
            console.log("chkboolean: " + memberinfochk);
            emailsubject = "(Lab연습실)이용내역 조회는 완료했으나 가져온 데이터가 널값입니다!";
            emailcontent = "(Lab연습실)이용내역 조회는 완료했으나 가져온 데이터가 널값입니다!\n" +
                "----reqbd----\n" +
                "/신청자명 : " + nyname + "\n" +
                "/신청자phnum : " + phNumber;

            var sendemjson = {
                to: process.env.sdadminnvml,
                subject: emailsubject,
                message: emailcontent
            }
            //메일 전송
            await scrapeLogic.sendemailPr(sendemjson); // 이메일 전송
            return { memberinfochk: memberinfochk, minfochkname: prscinfoname, minfochkphnum: prscinfophnum, mifcrtcode: "" }
        }

        // //스프레드시트 ID, 시트 이름, 가져올 범위를 설정합니다.
        const sheetName = process.env.SHEET_NAME2;
        const range = 'A2:P';

        const authClient = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
        authClient.setCredentials({ refresh_token: REFRESH_TOKEN2 });
        const sheets = google.sheets({ version: 'v4', auth: authClient });
        const response = await sheets.spreadsheets.values.get({  //sheet get!
            spreadsheetId: SHEET_ID,
            range: `${sheetName}!${range}`,
        });

        const values = response.data.values;
        var chkname = "";

        var minfochkname = "";
        var minfochkphnum = "";
        var minfochkself = "";

        for (var i = 0; i < values.length; i++) {
            //() 처리!
            if (values[i][5].indexOf("(") != -1) {
                //console.log(values[i][5]);
                var namecvAr = values[i][5].split("(");
                var namecv = namecvAr[0];
                //console.log(namecv);
                chkname = namecv;
            } else {
                chkname = values[i][5];
            }

            if (chkname == prscinfoname && values[i][6] == prscinfophnum) {
                //onsole.log("일치하는 정보가 있습니다!");
                //console.log(values[i][5]+"/"+values[i][6]);
                minfochkname = prscinfoname;
                minfochkphnum = prscinfophnum;
                memberinfochk = true;
                minfochkself = values[i][15];
                break;
            }
        }

        if (memberinfochk == true && minfochkself != "selfon") {
            console.log("chkboolean: " + memberinfochk);
            return { memberinfochk: memberinfochk, minfochkname: minfochkname, minfochkphnum: minfochkphnum, mifcrtcode: "0000" }
        } else if (memberinfochk == true && minfochkself == "selfon") {
            console.log("chkboolean: " + memberinfochk);
            // console.log("이용자 정보는 확인되었으나 셀프모드입니다.");
            return { memberinfochk: memberinfochk, minfochkname: minfochkname, minfochkphnum: minfochkphnum, mifcrtcode: "0001" }
        } else {
            //console.log("일치하는 정보가 없습니다! 신규일 수 있으니 확인해보세요!");
            console.log("chkboolean: " + memberinfochk);
            var emailsubject = "infochkppt에서 회원확인안됨!!";
            var emailcontent = "infochkppt에서 회원확인안됨!!\n" +
                "----확인내용----\n" +
                "*조회된nm : " + prscinfoname + "\n" +
                "*조회된cp : " + prscinfophnum + "\n" +
                "---------------\n" +
                "신규가 맞는지도 확인해보기!";

            var sendemjson = {
                to: process.env.sdadminnvml,
                subject: emailsubject,
                message: emailcontent
            }

            //메일 전송
            scrapeLogic.sendemailPr(sendemjson); // 이메일 전송
            //scrapeLogic.ggstprUserApd(pruserValues);
            return { memberinfochk: memberinfochk, minfochkname: prscinfoname, minfochkphnum: prscinfophnum, mifcrtcode: "0002" }
        }


    } catch (e) {

        console.error(e);
        const sdisshotattach = await sdipage.screenshot({ fullPage: true });
        var emailsubject = "예약요청중 에러발생!!";
        var emailcontent = "예약요청중 에러발생!!\n" +
            "----reqbd----\n" +
            "/\n" +
            "-----error msg-----\n" +
            e.message + "\n" +
            "-----error stack-----\n" +
            e.stack + "\n" +
            "-----이용내역 최근chk info--------\n" +
            "*조회된nm : " + prscinfoname + "\n" +
            "*조회된cp : " + prscinfophnum + "\n" +
            "---------------\n" +
            "memberinfochk:" + memberinfochk + "\n" +
            "minfochkname:" + minfochkname + "\n" +
            "minfochkphnum:" + minfochkphnum + "\n" +
            "minfochkself:" + minfochkself + "\n";

        var sendemjson = {
            to: process.env.sdadminnvml,
            subject: emailsubject,
            message: emailcontent,
            attachmsg: "ok",
            screenshotfn: sdisshotattach
        }
        //메일 전송
        scrapeLogic.sendemailPr(sendemjson); // 이메일 전송
    } finally {
        console.log("이용내역 검증 브라우저 종료");
        await sdprchkbrs.close();
    }
}

async function findLatestDate(dateArray) {
    //console.log(dateArray)
    let formattedArray = dateArray.map(date => {
        let datesplit = date.split(".");
        //console.log(datesplit);
        let year = "20" + datesplit[0].trim(); // 연도
        //console.log(year);
        let month = datesplit[1].trim(); // 월
        //console.log(month);
        let day = datesplit[2].trim(); // 일
        //console.log(day);
        let timegb = date.slice(15, 17);
        //console.log(timegb);
        let timestring = date.slice(17, 24); // 시간
        //console.log(timestring);
        let timearray = timestring.split(":");
        let hour = timearray[0];
        hour = hour.trim();
        let minute = timearray[1];
        if (timegb === "오후") {
            if (hour !== "12") {
                hour = String(Number(hour) + 12);
            }
        }
        return `${year}-${numpad(month)}-${numpad(day)}T${numpad(hour)}:${numpad(minute)}:00`;
    });

    //console.log("formattedArray:" + formattedArray);

    // Date 객체로 변환합니다.6
    let dateObjects = formattedArray.map(date => new Date(date));
    //console.log("dateObjects:" + dateObjects);
    // Date 객체들을 밀리초로 변환합니다.
    let dateMilliseconds = dateObjects.map(date => date.getTime());
    //console.log("dateMilliseconds:" + dateMilliseconds);
    // 가장 최근 날짜를 찾습니다.
    let latestDate = Math.max(...dateMilliseconds);
    //console.log("latestDate:" + latestDate);
    // 최근 날짜의 인덱스를 찾습니다.
    let index = dateMilliseconds.indexOf(latestDate);

    //console.log(`제일 최근 날짜는 ${dateArray[index]}이고, 배열의 인덱스는 ${index}입니다.`);
    return index;
}

function numpad(number) {
    return number.toString().padStart(2, "0");
}

//sdprgetinfo();

module.exports = { sdprgetinfo };