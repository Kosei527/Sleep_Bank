const INTEREST_RATE = 1.1;    // 1日あたりの利息（10%）
const COINS_PER_HOUR = 100;   // 睡眠1時間＝100コイン

//日付の文字列をn日ずらす　（"2026-10-28", -1 → "2026-10-27"）
function addDays(dateStr, n) {
    const date = new Date(dateStr + "T00:00:00Z");
    date.setUTCDate(date.getUTCDate() + n);
    return date.toISOString().slice(0, 10);
}

// 寝た時刻と起きた時刻（文字）から、睡眠時間（分）を返す
function sleepMinutesBetween(sleptAt, wokeAt) {
        const woke = new Date(wokeAt);
        const slept = new Date(sleptAt);
        const diffMs = woke - slept;
        const sleepMinutes = diffMs / (1000 * 60); //単位を分にする
        return sleepMinutes;
}

/* 全体の流れ

1. 借金を0、連続を0から始める
2. 始まりの日付 ＝ 履歴の中の一番古い date
3. 終わりの日付 ＝ today の1日前
4. 始まりから終わりまで、1日ずつ繰り返す：
   4-1. 利息を足す（借金 × 1.1、小数は切り捨て）
   4-2. その日の夜の睡眠記録を、履歴から探す
   4-3. 記録があったら：
         ・睡眠時間 ＝ 起きた日時 − 寝た日時
         ・差 ＝ 目標 − 睡眠時間
         ・差がプラス（足りない）→ 差 × 100 を借金に足す（切り捨て）
         ・差がマイナスかゼロ（足りてる）→ 差の分を返済。借金は0より下にしない
         ・目標以上寝た → 連続 +1、届かなかった → 連続 0
   4-4. 記録がなかったら：
         ・昨日の夜なら → 連続はそのまま
         ・それより前なら → 連続 0
5. 借金と連続を返す
*/

function calcDebt(history, today) {
    // 1. 借金を0、連続を0から始める
    let debt = 0;
    let streak = 0;
    // 2. 始まりの日付 ＝ 履歴の中の一番古い date
    if (history.length === 0) {
        return { debt: 0, streak: 0 }
    }
    const firstDay = history.map(r => r.date).sort()[0];
    // 3. 終わりの日付 ＝ today の1日前
    const lastDay = addDays(today, -1);
    // 4. 繰り返し
    let day = firstDay;
    while (day <= lastDay) {
        //4-1.利息の追加
        debt = Math.floor(debt * INTEREST_RATE);
        //4-2. その日の夜の睡眠記録を履歴から探す
        const record = history.find(r => r.date === day); //=>はアロー関数 rを受け取って、条件を返す関数
        if (record) { //record Noneならundefined
            // 4-3
            const sleepMinutes = sleepMinutesBetween(record.sleptAt,record.wokeAt);
            const diffMinutes = (record.targetHours * 60) - sleepMinutes;
            if (diffMinutes <= 0) {
                debt = (debt - Math.floor((Math.abs(diffMinutes) * COINS_PER_HOUR / 60)));
                if (debt <= 0) {
                    debt = 0;
                }
                streak++
            } else {
                debt = (debt + Math.floor((Math.abs(diffMinutes) * COINS_PER_HOUR / 60)));
                streak = 0;
            }


        } else {
            //4-4
            if (day !== lastDay) {
                streak = 0;
            }
        }
        day = addDays(day, 1);
    }
    // 5. 借金と連続を返す
    return { debt, streak };
}

// データの保存
function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

//名前で読む、まだ何もなければdefaultVlalueを返す
function load(key, defaultValue) {
    const text = localStorage.getItem(key);
    if (text === null){
        return defaultValue;
    }
    return JSON.parse(text);
}

//早送り込みの[今]を、日時オブジェクトで返す
function now() {
    const timeOffset = load("timeOffset", 0);
    const offsetMs = timeOffset * 1000 * 60;
    return new Date(Date.now() + offsetMs);
}

// 日時オブジェクトを "2026-10-30T03:23" の形の文字にする
function formatDateTime(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate())
        + "T" + pad(d.getHours()) + ":" + pad(d.getMinutes());
}

// 早送り込みの「今」を "2026-10-30T03:23" の形で返す
function nowString() {
    return formatDateTime(now());
}

// 早送り込みの「今日」を "2026-10-30" の形で返す
function todayString() {
    return nowString().slice(0,10);
}

//おやすみを記録
function goodnight() {
    if (!load("settings", null)){ //保存されていない、null、偽
        return { ok: false, code: "NO_SETTINGS", reason: "先に目標睡眠時間を設定してね" }
    }
    if (load("sleptAt", null)){
        return { ok: false, code: "ALREADY_SLEEPING", reason: "もう寝ています" }
    }
    const nowTime = nowString(); //現在時刻
    save("sleptAt", nowTime);
    return {ok: true, sleptAt:nowTime};
}

//おはようを記録
function goodmorning() {
    const sleptAt = load("sleptAt", null);
    if(!sleptAt){
        return { ok: false, code: "NO_SLEEPING", reason: "まだおやすみしていません" }
    }
    const wokeAt = nowString();
    const lastNight = addDays(todayString(), -1)
    const sleepMinutes = sleepMinutesBetween(sleptAt, wokeAt)
    const history = load("history", []);
    if (sleepMinutes >=  960){
        return { ok: false, code: "FORGOT_MORNING", reason: "おはようの押し忘れかも。起きた時刻を入力してね" }
    }
    if(history.find(r => r.date === lastNight)){
        return { ok: false, code: "ALREADY_RECORDED", reason: "もう夜の記録があるよ" }
    }

}


// Node.jsでテストするための1行（ブラウザでは無視される）
if (typeof module !== "undefined") {
    module.exports = { calcDebt };
}