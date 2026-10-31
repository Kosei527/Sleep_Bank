//借金の計算用ファイル

const assert = require("node:assert");
const { calcDebt } = require("./bank.js");

const history = [
  { date: "2026-10-25", sleptAt: "2026-10-25T23:00", wokeAt: "2026-10-26T04:00", targetHours: 7, manual: false },
  { date: "2026-10-26", sleptAt: "2026-10-26T23:00", wokeAt: "2026-10-27T07:00", targetHours: 7, manual: false },
];

assert.deepStrictEqual(calcDebt(history, "2026-10-28"), { debt: 132, streak: 1 });
assert.deepStrictEqual(calcDebt(history, "2026-10-29"), { debt: 145, streak: 0 });
// 69分不足 → 115コイン（割り算を先にすると114になるバグの確認）
const short69 = [
  { date: "2026-10-25", sleptAt: "2026-10-25T23:00", wokeAt: "2026-10-26T04:51", targetHours: 7, manual: false },
];
assert.deepStrictEqual(calcDebt(short69, "2026-10-26"), { debt: 115, streak: 0 });

// 履歴が空 → 借金0、連続0
assert.deepStrictEqual(calcDebt([], "2026-10-26"), { debt: 0, streak: 0 });
// 順番が逆の履歴でも、同じ結果になるか
const reversed = [
  { date: "2026-10-26", sleptAt: "2026-10-26T23:00", wokeAt: "2026-10-27T07:00", targetHours: 7, manual: false },
  { date: "2026-10-25", sleptAt: "2026-10-25T23:00", wokeAt: "2026-10-26T04:00", targetHours: 7, manual: false },
];
assert.deepStrictEqual(calcDebt(reversed, "2026-10-28"), { debt: 132, streak: 1 });

console.log("全部OK");