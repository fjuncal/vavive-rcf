import assert from "node:assert/strict";
import {
  birthDateSchema,
  birthdayMatchesMonthDay,
  classifyBirthday,
  getBirthdayHighlights,
  getBirthdayMonthWindow,
} from "@/domain/birthdays";

assert.equal(classifyBirthday("1990-10-16", "2026-10-16"), "today");
assert.equal(classifyBirthday("1990-10-17", "2026-10-16"), "week");
assert.equal(classifyBirthday("1990-10-30", "2026-10-16"), "month");
assert.equal(classifyBirthday("1990-11-02", "2026-10-16"), null);

// Week crosses month and year boundaries.
assert.equal(classifyBirthday("1990-11-01", "2026-10-31"), "week");
assert.equal(classifyBirthday("1990-01-01", "2026-12-31"), "week");

// 29/02 is observed on 28/02 in non-leap years.
assert.equal(classifyBirthday("2000-02-29", "2025-02-28"), "today");
assert.equal(classifyBirthday("2000-02-29", "2024-02-29"), "today");
assert.equal(classifyBirthday("2000-02-29", "2025-02-10"), "month");
assert.equal(birthdayMatchesMonthDay("2000-02-29", 2), true);
assert.equal(birthdayMatchesMonthDay("2000-02-29", 2, 29), true);
assert.equal(birthdayMatchesMonthDay("2000-02-29", 2, 28), false);

assert.throws(() => birthDateSchema.parse("2099-01-01"));
assert.throws(() => birthDateSchema.parse("2026-02-30"));
assert.equal(birthDateSchema.parse(""), null);

const highlights = getBirthdayHighlights(
  [
    {
      memberId: "today",
      memberName: "Pessoa hoje",
      photoUrl: null,
      birthDate: "1990-10-16",
      franchiseeId: "unit-1",
      unitName: "Unidade 1",
    },
    {
      memberId: "week",
      memberName: "Pessoa semana",
      photoUrl: null,
      birthDate: "1990-10-17",
      franchiseeId: "unit-1",
      unitName: "Unidade 1",
    },
    {
      memberId: "today-2",
      memberName: "Outra pessoa hoje",
      photoUrl: null,
      birthDate: "1988-10-16",
      franchiseeId: "unit-1",
      unitName: "Unidade 1",
    },
    {
      memberId: "month",
      memberName: "Pessoa mês",
      photoUrl: null,
      birthDate: "1990-10-30",
      franchiseeId: "unit-2",
      unitName: "Unidade 2",
    },
    {
      memberId: "month",
      memberName: "Duplicada",
      photoUrl: null,
      birthDate: "1990-10-30",
      franchiseeId: "unit-2",
      unitName: "Unidade 2",
    },
  ],
  "2026-10-16",
);
assert.deepEqual(
  highlights.map((item) => [item.memberId, item.status]),
  [
    ["today-2", "today"],
    ["today", "today"],
    ["week", "week"],
    ["month", "month"],
  ],
);

const decemberWindow = getBirthdayMonthWindow(
  [
    {
      memberId: "december",
      memberName: "Pessoa dezembro",
      photoUrl: null,
      birthDate: "1990-12-31",
      franchiseeId: "unit-1",
      unitName: "Unidade 1",
    },
    {
      memberId: "january",
      memberName: "Pessoa janeiro",
      photoUrl: null,
      birthDate: "1990-01-01",
      franchiseeId: "unit-1",
      unitName: "Unidade 1",
    },
  ],
  "2026-12-15",
);
assert.deepEqual(
  [decemberWindow.current.year, decemberWindow.current.month],
  [2026, 12],
);
assert.deepEqual(
  [decemberWindow.next.year, decemberWindow.next.month],
  [2027, 1],
);
assert.deepEqual(
  decemberWindow.current.birthdays.map((item) => item.memberId),
  ["december"],
);
assert.deepEqual(
  decemberWindow.next.birthdays.map((item) => item.memberId),
  ["january"],
);

const emptyNextWindow = getBirthdayMonthWindow(
  [
    {
      memberId: "december-only",
      memberName: "Pessoa dezembro",
      photoUrl: null,
      birthDate: "1990-12-31",
      franchiseeId: "unit-1",
      unitName: "Unidade 1",
    },
  ],
  "2026-12-15",
);
assert.equal(emptyNextWindow.current.birthdays.length, 1);
assert.equal(emptyNextWindow.next.birthdays.length, 0);

const emptyWindow = getBirthdayMonthWindow([], "2026-12-15");
assert.equal(emptyWindow.current.birthdays.length, 0);
assert.equal(emptyWindow.next.birthdays.length, 0);

console.log("birthday domain tests passed");
