const { info, time } = require("node:console");

//日付の文字列をn列ずらす　（"2026-10-28", -1 → "2026-10-27"）
function addDays(dateStr, n) {
    const d = new Date(dateStr + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

/* 全体の流れ

1. 借金を0、連続を0から始める
2. 始まりの日付 ＝ 履歴の1行目の date
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
    // 2. 始まりの日付 ＝ 履歴の1行目の date
    if (history.length === 0) {
        return { debt: 0, streak: 0 }
    }
    const firstDay = history[0].date;
    // 3. 終わりの日付 ＝ today の1日前
    const lastDay = addDays(today, -1);
    // 4. 繰り返し
    let day = firstDay;
    while (day <= lastDay) {
        //4-1.利息の追加
        debt = Math.floor(debt * 1.1);
        //4-2. その日の夜の睡眠記録を履歴から探す
        const record = history.find(r => r.date === day); //=>はアロー関数 rを受け取って、条件を返す関数
        if (record) { //record Noneならundefined
            // 4-3
            const woke = new Date(record.wokeAt);
            const slept = new Date(record.sleptAt);
            const diffMs = woke - slept;
            const sleepMinutes = diffMs / (1000 * 60); //単位を分にする
            const diffMinutes = (record.targetHours * 60) - sleepMinutes;
            if (diffMinutes <= 0) {
                debt = (debt - Math.floor((Math.abs(diffMinutes) * 100 / 60)));
                if (debt <= 0) {
                    debt = 0;
                }
                streak++
            } else {
                debt = (debt + Math.floor((Math.abs(diffMinutes) * 100 / 60)));
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

// Node.jsでテストするための1行（ブラウザでは無視される）
if (typeof module !== "undefined") {
    module.exports = { calcDebt };
}