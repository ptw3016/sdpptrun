async function exttimecv(fulldatestring) {
    if (fulldatestring.indexOf(",") != -1) {
        const fdtcommaSplit = fulldatestring.split(",");
        let yearmonthday = fdtcommaSplit[1].trim();
        let yearmonthdaySplit = yearmonthday.split(" ");
        let timestring = fdtcommaSplit[2].trim();
        let timeStringSplit = timestring.split("(");
        let timeStringSplit2 = timeStringSplit[0].split("~");
        const daynm = translateDayOfWeek(fdtcommaSplit[0]);
        const month = monthNameToNumber(yearmonthdaySplit[1]);
        const year = parseInt(yearmonthdaySplit[2]);
        const date = parseInt(yearmonthdaySplit[0]);
        const exttime1 = formatTime(timeStringSplit2[0]);
        const exttime2 = formatTime(timeStringSplit2[1]);
        return { daynm: daynm, year: year, month: month, date: date, exttime1: exttime1, exttime2: exttime2 }
    } else {
        //2023. 11. 28(화) 오전 9:00~오전 10:00(1시간)
        let yearmonthdaySplit = fulldatestring.split(") ");
        let yearmonthdayAr = yearmonthdaySplit[0].split(". ");
        const dayAr = yearmonthdayAr[2].split("(");
        const date = parseInt(dayAr[0]);
        const daynm = dayAr[1];
        const month = parseInt(yearmonthdayAr[1]);
        const year = parseInt(yearmonthdayAr[0]);
        let timestring = yearmonthdaySplit[1].trim();
        let timeStringSplit = timestring.split("(");
        let timeStringSplit2 = timeStringSplit[0].split("~");
        const exttime1 = timeStringSplit2[0];
        const exttime2 = timeStringSplit2[1];
        return { daynm: daynm, year: year, month: month, date: date, exttime1: exttime1, exttime2: exttime2 }
    }
}

function translateDayOfWeek(dayOfWeek) {
    const dayOfWeekMap = {
        "Sun": "일",
        "Mon": "월",
        "Tue": "화",
        "Wed": "수",
        "Thu": "목",
        "Fri": "금",
        "Sat": "토"
    };

    const translatedDay = dayOfWeekMap[dayOfWeek];

    if (translatedDay) {
        return translatedDay;
    } else {
        return "요일을 인식할 수 없습니다.";
    }
}


function monthNameToNumber(monthName) {
    const monthMap = {
        "Jan": 1,
        "Feb": 2,
        "Mar": 3,
        "Apr": 4,
        "May": 5,
        "Jun": 6,
        "Jul": 7,
        "Aug": 8,
        "Sep": 9,
        "Oct": 10,
        "Nov": 11,
        "Dec": 12
    };

    const monthNumber = monthMap[monthName];

    if (monthNumber) {
        return monthNumber;
    } else {
        return "해당 월을 인식할 수 없습니다.";
    }
}

function formatTime(inputTime) {
    // 입력된 시간을 시와 분으로 분리
    const timeSplit = inputTime.split(" ");
    const timeComponents = timeSplit[0].split(":");

    if (timeComponents.length !== 2) {
        return "잘못된 시간 형식입니다.";
    }
    const hour = parseInt(timeComponents[0]);
    const minute = timeComponents[1];

    // 오후 시간 형식으로 변환
    if (timeSplit[1] == "AM") {
        return `오전 ${hour}:${minute}`;
    } else if (timeSplit[1] == "PM") {
        return `오후 ${hour}:${minute}`;
    } else {
        return "잘못된 시간 형식입니다.";
    }
}

module.exports = { exttimecv }