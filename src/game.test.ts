import { describe, it, expect } from "vitest";
import { initial, reducer, type State } from "./game";
import { decode, encode } from "./persistence";
import { missions, taskById } from "./content";
const begin = (mission = 0, route = "insight") =>
  reducer(
    reducer(reducer(initial(), { type: "start", mission }), {
      type: "route",
      route,
    }),
    { type: "engage" },
  );
function answer(s: State, correct = true, hinted = false) {
  s = reducer(s, { type: "skill", skill: "analysis" });
  if (hinted) s = reducer(s, { type: "hint" });
  return reducer(s, {
    type: "answer",
    ids: correct ? taskById(s.active!.question!).answer : ["incorrect"],
  });
}
function win(s: State, correct = true) {
  for (let i = 0; i < 100 && s.active?.phase === "combat"; i++) {
    const a = s.active!;
    if (a.feedback) s = reducer(s, { type: "continue" });
    else if (a.pending) s = reducer(s, { type: "beat" });
    else if (a.taskIndex < 3 && a.energy >= 2) s = answer(s, correct);
    else
      s = reducer(s, {
        type: "skill",
        skill:
          a.hp < 25 || a.turn % 3 === 2 || a.energy < 2 ? "guard" : "attack",
      });
  }
  return s;
}
describe("tactical contract combat", () => {
  it("persists manual pause and prevents queued damage until resumed", () => {
    let s = reducer(begin(), { type: "skill", skill: "attack" });
    s = reducer(s, { type: "pause", value: true });
    s = decode(encode(s));
    expect(reducer(s, { type: "beat" })).toEqual(s);
    const resumed = reducer(reducer(s, { type: "pause", value: false }), {
      type: "beat",
    });
    expect(resumed.active!.hp).toBe(s.active!.hp - 8);
  });
  it("guard reduces a heavy strike, heals and restores energy", () => {
    const s = begin();
    s.active!.hp = 25;
    s.active!.turn = 2;
    s.active!.energy = 0;
    const guarded = reducer(reducer(s, { type: "skill", skill: "guard" }), {
      type: "beat",
    });
    expect(guarded.active!.hp).toBe(26);
    expect(guarded.active!.energy).toBe(2);
    const attacked = reducer(reducer(s, { type: "skill", skill: "attack" }), {
      type: "beat",
    });
    expect(attacked.active!.hp).toBe(9);
  });
  it("requires a player action for each enemy beat and never damages during a question", () => {
    let s = begin();
    expect(reducer(s, { type: "beat" })).toEqual(s);
    s = reducer(s, { type: "skill", skill: "analysis" });
    expect(reducer(s, { type: "beat" })).toEqual(s);
  });
  it("cannot bypass the three seals with attacks or early analysis", () => {
    const s = begin();
    s.active!.enemy = 2;
    const attacked = reducer(s, { type: "skill", skill: "attack" });
    expect(attacked.active!.enemy).toBe(1);
    const answered = answer(s);
    expect(answered.active!.enemy).toBe(1);
    expect(answered.active!.phase).toBe("combat");
  });
  it("cannot spend energy twice or answer twice", () => {
    const s = answer(begin());
    expect(
      reducer(s, { type: "answer", ids: missions[0].tasks[0].answer }),
    ).toEqual(s);
    const poor = begin();
    poor.active!.energy = 1;
    expect(reducer(poor, { type: "skill", skill: "analysis" })).toEqual(poor);
  });
  it("tracks correct, wrong and hinted knowledge independently", () => {
    const correct = answer(begin());
    expect(correct.knowledge.v1).toMatchObject({
      recognised: 1,
      applied: 1,
      errors: 0,
      assisted: 0,
    });
    const wrong = answer(begin(), false);
    expect(wrong.knowledge.v1).toMatchObject({
      recognised: 0,
      applied: 0,
      errors: 1,
    });
    expect(wrong.active!.enemy).toBe(68);
    const hinted = answer(begin(), true, true);
    expect(hinted.knowledge.v1).toMatchObject({
      recognised: 0,
      applied: 0,
      assisted: 1,
    });
    expect(hinted.active!.enemy).toBe(correct.active!.enemy);
  });
  it("review builds recognition, never mission application", () => {
    const s = reducer(initial(), {
      type: "review",
      entry: "v20",
      correct: true,
      hinted: false,
    });
    expect(s.knowledge.v20).toMatchObject({ recognised: 1, applied: 0 });
    expect(s.completed).toEqual([]);
  });
  it("loss and retry preserve learning and restore health", () => {
    let s = answer(begin(), false);
    s = reducer(s, { type: "continue" });
    s.active!.hp = 1;
    s = reducer(s, { type: "beat" });
    expect(s.active!.phase).toBe("defeat");
    const retried = reducer(s, { type: "retry" });
    expect(retried.active!.phase).toBe("route");
    expect(retried.active!.hp).toBe(retried.active!.maxHp);
    expect(retried.knowledge).toEqual(s.knowledge);
    expect(retried.xp).toBe(0);
  });
  it.each([0, 1, 2])(
    "mission %i is winnable even with all language answers wrong",
    (mission) => {
      const s = win(begin(mission), false);
      expect(s.active!.phase).toBe("victory");
      expect(s.completed).toEqual([mission]);
      expect(s.xp).toBe(100);
    },
  );
  it("replay never duplicates rewards and gear has a real effect", () => {
    let s = win(begin());
    s = reducer(s, { type: "equip", name: "保温护符" });
    s = reducer(s, { type: "start", mission: 0 });
    expect(s.active!.maxHp).toBe(62);
    s = reducer(reducer(s, { type: "route", route: "shelter" }), {
      type: "engage",
    });
    expect(s.active!.maxHp).toBe(70);
    s = win(s);
    expect(s.xp).toBe(100);
    expect(s.completed).toEqual([0]);
  });
  it("restores a question, draft, hints, pending beat and persistent feedback exactly", () => {
    let s = begin();
    s = reducer(s, { type: "skill", skill: "analysis" });
    s = reducer(s, { type: "hint" });
    s = reducer(s, { type: "draft", ids: ["cold-a-0"] });
    expect(decode(encode(s))).toEqual(s);
    s = reducer(s, { type: "answer", ids: missions[0].tasks[0].answer });
    expect(decode(encode(s))).toEqual(s);
    s = reducer(s, { type: "continue" });
    expect(decode(encode(s))).toEqual(s);
  });
  it("falls back safely for unreadable or unsupported saves", () => {
    expect(decode("broken")).toEqual(initial());
    expect(decode('{"version":2}')).toEqual(initial());
    const damaged = begin();
    damaged.active!.energy = 99;
    expect(decode(encode(damaged))).toEqual(initial());
    expect(
      decode(
        JSON.stringify({ ...initial(), knowledge: { v0: { recognised: 1 } } }),
      ),
    ).toEqual(initial());
  });
});
