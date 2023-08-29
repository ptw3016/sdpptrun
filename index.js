const express = require("express");
const app = express();
const { scrapeLogic } = require("./scrapeLogic");
const prautotest = require("./prautotest.js");
const bodyParser = require('body-parser');
const ktMsgSendPr = require("./ktMsgSendPr");
const sctycontrol = require("./sctycontrol");

const PORT = process.env.PORT || 4000;
//require("dotenv").config();


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// app.get("/scrape/:id", (req, res) => {
//     const reqval = req.params
//     const prrqval = reqval.id
//     //console.log(prrqval);
//     //res.send(prrqval);
//     console.log(process.env.RQSW_ID);
    
//     if (prrqval === process.env.RQSW_ID) {
//       console.log("요청완료!");
//       res.send('요청완료.');
//       //scrapeLogic(prrqval,res);
  
//     } else {
//       res.send('잘못된 요청입니다.');
//     }
// });
app.get("/", (req, res) => {
  //res.send("ppt 구동 준비완료!");
});

app.get("/hejapi", (req, res) => {
  res.send("hej연동준비!");
});

app.get("/lguptest.php", (req, res) => {
    res.send("lgup테스트 준비완료!");
});

// app.get("/infochkppt", (req, res) => {
//   //res.send("서버테스트 준비완료222!");
//   infochkppt.sdprgetinfo(req,res);
// });

app.post('/scrapepost', async(req, res) => {
  const { body } = req;
  const prrqswchk = body.prrqsw;  //prphnuo
  let prrqswprphnuo = body.prphnuo;
  const prrqoknumcv = await LuPhchk(prrqswprphnuo);
  if (prrqswchk === process.env.RQSW_ID) {
    const ktsjs = {
      tonum: prrqoknumcv,
      ktsdname: "",
      apprnum: "",
      date: "",
      time: "",
      appay: "",
      appaysd: "",
      apbb: "",
      tempid: "sdalertcall2",
      btnjr: "",
      sdsendmode: "콜백"
    }
    const msgrqrst = await ktMsgSendPr.ktsendPr(ktsjs);
    res.send('요청결과코드:'+msgrqrst+"/"+prrqoknumcv);
    
  } else {
    res.send('잘못된 요청입니다.');
  }
    //res.send(test1);
});

async function LuPhchk(pnb) {
  // 숫자와 '-'를 제외한 모든 문자를 제거합니다.
  const cleaned = pnb.replace(/\D/g, '');
  if (cleaned.substring(0, 3) !== '010') {
    return pnb;
  }
  if (cleaned.length === 11 && cleaned[3] === '-' && cleaned[8] === '-') {
    return cleaned;
  }
  const match = cleaned.match(/^(\d{3})(\d{4})(\d{4})$/);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }
  return pnb;
}

app.listen(PORT, () => {
    prautotest.startTimer();
    console.log(`Listening on port ${PORT}`); 
    //sctycontrol.sctytimebkPr();
    //console.log(`sctycontrol Process Start!!`);
})
