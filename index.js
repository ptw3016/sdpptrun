const express = require("express");
const app = express();
const { scrapeLogic } = require("./scrapeLogic");
const prautotest = require("./prautotest.js");
const bodyParser = require('body-parser');
const infochkppt = require("./infochkppt");

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


app.get("/lguptest", (req, res) => {
    res.send("lgup테스트 준비완료!");
});

// app.get("/infochkppt", (req, res) => {
//   //res.send("서버테스트 준비완료222!");
//   infochkppt.sdprgetinfo(req,res);
// });



app.post('/scrapepost', (req, res) => {
  const { body } = req;
  const prrqswchk = body.prrqsw;

  if (prrqswchk === process.env.RQSW_ID) {
    res.send('요청완료-대기');
  } else {
    res.send('잘못된 요청입니다.');
  }
    //res.send(test1);
});
  
app.listen(PORT, () => {
    prautotest.startTimer();
    console.log(`Listening on port ${PORT}`); 
})