const express = require("express");
const app = express();
const { scrapeLogic } = require("./scrapeLogic");
const prautotest = require("./prautotest.js");
const bodyParser = require('body-parser');
const ktMsgSendPr = require("./ktMsgSendPr");

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
  res.send("ppt 구동 준비완료!");
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

  if (prrqswchk === process.env.RQSW_ID) {
    const ktsjs = {
      tonum: process.env.LudestNum,
      ktsdname: "",
      apprnum: "",
      date: "",
      time: "",
      appay: "",
      appaysd: "",
      apbb: "",
      tempid: "sdalertcall1",
      btnjr: "",
      sdsendmode: "콜백"
    }
    const msgrqrst = await ktMsgSendPr.ktsendPr(ktsjs);
    res.send('요청결과코드:'+msgrqrst);
    
  } else {
    res.send('잘못된 요청입니다.');
  }
    //res.send(test1);
});



app.listen(PORT, () => {
    prautotest.startTimer();
    console.log(`Listening on port ${PORT}`); 
})
