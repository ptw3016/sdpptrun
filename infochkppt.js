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
    try {

        console.log("ready");
        const sdipage = await sdprchkbrs.newPage();
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
        const liXPathsrch = '//*[@id="app"]/div[1]/div[2]/div[2]/div/div[2]/div[4]/div[2]';
        const liElementsrch = await sdipage.waitForXPath(liXPathsrch);
        await sdipage.waitForTimeout(1000);

        var elements = await sdipage.$$('.BookingListView__contents-user__1BF15');
        var prscinfoname = "";
        var prscinfophnum = "";
        var memberinfochk = false;
        var elementsct = elements.length;
        //elementsct = 0;
        var runct = 0;
        if (elementsct==0) {
            for (var i = 0; i < 3; i++) {
                runct += 1;
                console.log("조회된 이용내역 0이므로 " + runct + "번째 다시실행!");
                elements = await sdipage.$$('.BookingListView__contents-user__1BF15');
                elementsct = elements.length;
                if (elementsct > 0) {
                    console.log("다시 조회된 이용내역 갯수 " + elementsct + "이므로 다음단계!");
                    break;
                }
                await sdipage.waitForTimeout(1000);
            }
        }
        if(runct==3 && elementsct==0){
            console.log("이용내역이 0이어서 3번까지 재실행 후에도 0이어서 종료!");
            emailsubject = "이용내역이 0이어서 3번까지 재실행 후에도 0이어서 종료!";
            emailcontent = "이용내역이 0이어서 3번까지 재실행 후에도 0이어서 종료!\n" +
                "----reqbd----\n" +
                "/이용내역 조회갯수 : " + elementsct;

            var sendemjson = {
                to: process.env.sdadminnvml,
                subject: emailsubject,
                message: emailcontent
            }
            //메일 전송
            await scrapeLogic.sendemailPr(sendemjson); // 이메일 전송
            return { memberinfochk: memberinfochk, minfochkname: prscinfoname, minfochkphnum: prscinfophnum, mifcrtcode:"" }
        }

    
        if (elements.length > 0) {
            const lastElement = elements[elements.length - 1]; //제일 최근 예약자 정보 가져오기
            const nameElement = await lastElement.$('.BookingListView__name__16_zV');
            var nyname = await sdipage.evaluate((el) => el.textContent, nameElement);
            const phElement = await lastElement.$('.BookingListView__phone__2IoIp');
            var phNumber = await sdipage.evaluate((el) => el.textContent, phElement);

            prscinfoname = nyname;
            prscinfophnum = phNumber;

            //신청일시 정렬 XP
            ////*[@id="app"]/div[1]/div[2]/div[2]/div/div[2]/div[4]/div[1]/div/div[2]/div[8]/button
            const liXPath7 = '//*[@id="app"]/div[1]/div[2]/div[2]/div/div[2]/div[4]/div[1]/div/div[2]/div[8]/button';
            const liElement7 = await sdipage.waitForXPath(liXPath7);
            await liElement7.click();

            await sdipage.waitForTimeout(500);

            const liXPath8 = '//*[@id="app"]/div[1]/div[2]/div[2]/div/div[2]/div[4]/div[1]/div/div[2]/div[8]/button';
            const liElement8 = await sdipage.waitForXPath(liXPath8);
            await liElement8.click();

            await sdipage.waitForTimeout(500);

        } else {
            console.log("이용내역중 리스트가 없습니다! 종료합니다!");
            //console.log("chkboolean: " + memberinfochk);
            // console.log(minfochkname);
            // console.log(minfochkphnum);

            emailsubject = "(Lab연습실)이용내역중 조회된 리스트가 없습니다! 종료합니다!";
            emailcontent = "(Lab연습실)이용내역중 조회된 리스트가 없습니다! 종료합니다!\n" +
               
                "----reqbd----\n" +
                "/이용내역 조회갯수 : " + elements.length;

            var sendemjson = {
                to: process.env.sdadminnvml,
                subject: emailsubject,
                message: emailcontent
            }
            //메일 전송
            await scrapeLogic.sendemailPr(sendemjson); // 이메일 전송
            return { memberinfochk: memberinfochk, minfochkname: prscinfoname, minfochkphnum: prscinfophnum, mifcrtcode:"" }
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
            return { memberinfochk: memberinfochk, minfochkname: prscinfoname, minfochkphnum: prscinfophnum, mifcrtcode:"" }
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
            }
        }

        if (memberinfochk == true && minfochkself!="selfon") {
            console.log("chkboolean: " + memberinfochk);
            return { memberinfochk: memberinfochk, minfochkname: minfochkname, minfochkphnum: minfochkphnum, mifcrtcode:"0000" }
        } else if(memberinfochk == true && minfochkself=="selfon"){
            console.log("chkboolean: " + memberinfochk);
            // console.log("이용자 정보는 확인되었으나 셀프모드입니다.");
            return { memberinfochk: memberinfochk, minfochkname: minfochkname, minfochkphnum: minfochkphnum, mifcrtcode:"0001" }
        }else {
            //console.log("일치하는 정보가 없습니다! 신규일 수 있으니 확인해보세요!");
            console.log("chkboolean: " + memberinfochk);
            return { memberinfochk: memberinfochk, minfochkname: minfochkname, minfochkphnum: minfochkphnum, mifcrtcode:"0002" }
        }

        // for (const element of elements) {
        //   const nameElement = await element.$('.BookingListView__name__16_zV');
        //   const name = await sdipage.evaluate((el) => el.textContent, nameElement);
        //   console.log(name);
        //   if (name === '홍길동') { //유료 예약자 이름
        //     const phoneElement = await element.$('.BookingListView__phone__2IoIp');
        //     const phoneNumber = await sdipage.evaluate((el) => el.textContent, phoneElement);
        //     console.log(phoneNumber);
        //     //break; 원하는 이름을 찾은 후 반복문을 중지하려면 이 줄을 추가하세요.
        //   }
        // }

        // // 스크린샷 찍기
        // const screenshotBuffer = await sdipage.screenshot();

        // // 스크린샷을 응답으로 보내기
        // res.set('Content-Type', 'image/png');
        // res.send(screenshotBuffer);

    } catch (e) {
      
        console.error(e);
        var emailsubject = "예약요청중 에러발생!!";
        var emailcontent = "예약요청중 에러발생!!\n" +

            "----reqbd----\n" +
            "/\n"+
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
    } finally {
        console.log("이용내역 검증 브라우저 종료");
        await sdprchkbrs.close();
    }

}


module.exports = { sdprgetinfo };