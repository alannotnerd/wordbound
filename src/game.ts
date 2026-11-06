import { entries, missions, taskById } from "./content";
export type Knowledge = {
  discovered: boolean;
  recognised: number;
  applied: number;
  errors: number;
  assisted: number;
};
export type Encounter = {
  mission: number;
  phase: "route" | "story" | "combat" | "victory" | "defeat";
  route: string;
  hp: number;
  maxHp: number;
  enemy: number;
  maxEnemy: number;
  energy: number;
  guard: boolean;
  turn: number;
  taskIndex: number;
  question: string | null;
  draft: string[];
  hinted: boolean;
  feedback: { correct: boolean; text: string } | null;
  pending: boolean;
  log: string;
};
export type State = {
  version: 1;
  xp: number;
  completed: number[];
  equipment: string;
  knowledge: Record<string, Knowledge>;
  active: Encounter | null;
  reduced: boolean;
  paused: boolean;
};
export const initial = (): State => ({
  version: 1,
  xp: 0,
  completed: [],
  equipment: "旅人外套",
  knowledge: {},
  active: null,
  reduced: false,
  paused: false,
});
export const level = (s: State) => 1 + Math.floor(s.xp / 100);
export type Action =
  | { type: "start"; mission: number }
  | { type: "route"; route: string }
  | { type: "engage" }
  | { type: "skill"; skill: "attack" | "guard" | "analysis" }
  | { type: "draft"; ids: string[] }
  | { type: "hint" }
  | { type: "answer"; ids: string[] }
  | { type: "continue" }
  | { type: "beat" }
  | { type: "retry" }
  | { type: "equip"; name: string }
  | { type: "review"; entry: string; correct: boolean; hinted: boolean }
  | { type: "discover"; entry: string }
  | { type: "motion"; value: boolean }
  | { type: "pause"; value: boolean };
function knowledge(
  s: State,
  id: string,
  correct: boolean,
  hinted: boolean,
  applied: boolean,
) {
  const k = s.knowledge[id] ?? {
    discovered: true,
    recognised: 0,
    applied: 0,
    errors: 0,
    assisted: 0,
  };
  s.knowledge[id] = {
    ...k,
    discovered: true,
    errors: k.errors + Number(!correct),
    assisted: k.assisted + Number(hinted),
    recognised: k.recognised + Number(correct && !hinted),
    applied: k.applied + Number(correct && !hinted && applied),
  };
}
function finish(s: State) {
  const a = s.active!;
  if (a.enemy <= 0) {
    a.enemy = 0;
    a.phase = "victory";
    a.pending = false;
    if (!s.completed.includes(a.mission)) {
      s.completed.push(a.mission);
      s.xp += 100;
      a.log = "首次完成：+100 XP，获得 " + missions[a.mission].reward + "。";
    } else a.log = "重访完成：学习记录已更新。本任务首次奖励已领取。";
  }
}
export function reducer(state: State, action: Action): State {
  const s = structuredClone(state);
  let a = s.active;
  if (action.type === "start") {
    s.paused = false;
    const hp = 48 + (level(s) - 1) * 4 + (s.equipment === "保温护符" ? 10 : 0);
    s.active = {
      mission: action.mission,
      phase: "route",
      route: "",
      hp,
      maxHp: hp,
      enemy: 74 + action.mission * 10,
      maxEnemy: 74 + action.mission * 10,
      energy: 2,
      guard: false,
      turn: 0,
      taskIndex: 0,
      question: null,
      draft: [],
      hinted: false,
      feedback: null,
      pending: false,
      log: "调查即将开始。",
    };
    for (const e of entries.filter((e) => e.mission === action.mission))
      if (!s.knowledge[e.id])
        s.knowledge[e.id] = {
          discovered: true,
          recognised: 0,
          applied: 0,
          errors: 0,
          assisted: 0,
        };
    return s;
  }
  if (action.type === "equip") {
    if (a && ["route", "story", "combat"].includes(a.phase)) return s;
    if (
      action.name === "旅人外套" ||
      missions.some(
        (m) => m.reward === action.name && s.completed.includes(m.id),
      )
    )
      s.equipment = action.name;
    return s;
  }
  if (action.type === "motion") {
    s.reduced = action.value;
    return s;
  }
  if (action.type === "pause") {
    s.paused = action.value;
    return s;
  }
  if (action.type === "discover") {
    s.knowledge[action.entry] ??= {
      discovered: true,
      recognised: 0,
      applied: 0,
      errors: 0,
      assisted: 0,
    };
    return s;
  }
  if (action.type === "review") {
    knowledge(s, action.entry, action.correct, action.hinted, false);
    return s;
  }
  if (!a) return s;
  if (action.type === "retry")
    return reducer(s, { type: "start", mission: a.mission });
  if (action.type === "route" && a.phase === "route") {
    a.route = action.route;
    a.phase = "story";
    if (action.route === "shelter") {
      a.hp += 8;
      a.maxHp += 8;
    } else a.energy = Math.min(4, a.energy + 1);
    return s;
  }
  if (action.type === "engage" && a.phase === "story") {
    a.phase = "combat";
    a.log = "敌人正在蓄势。先观察意图，再行动。";
    return s;
  }
  if (a.phase !== "combat") return s;
  if (action.type === "draft" && a.question && !a.feedback) {
    a.draft = action.ids;
    return s;
  }
  if (action.type === "hint" && a.question) {
    a.hinted = true;
    return s;
  }
  if (action.type === "answer" && a.question && !a.feedback) {
    const task = taskById(a.question);
    const correct = action.ids.join("|") === task.answer.join("|");
    knowledge(s, task.entry, correct, a.hinted, true);
    const damage = correct ? 18 + (s.equipment === "潮汐透镜" ? 4 : 0) : 6;
    a.taskIndex++;
    a.enemy = Math.max(a.taskIndex < 3 ? 1 : 0, a.enemy - damage);
    a.hp = Math.min(a.maxHp, a.hp + (correct ? 4 : 0));
    a.feedback = {
      correct,
      text: `${correct ? "意图传达成功" : "表达偏离了意图"}：分析造成 ${damage} 点伤害${correct ? "，恢复 4 生命" : ""}。${task.explain}${a.hinted ? " 本次已使用提示，计入辅助练习，不计独立掌握。" : ""}`,
    };
    a.log = "语言反馈待阅读，时间已暂停。";
    return s;
  }
  if (action.type === "continue" && a.feedback) {
    a.feedback = null;
    a.question = null;
    a.hinted = false;
    a.pending = true;
    finish(s);
    return s;
  }
  if (action.type === "skill" && !a.pending && !a.question) {
    if (action.skill === "analysis") {
      if (a.energy < 2 || a.taskIndex >= 3) return s;
      a.energy -= 2;
      a.question = missions[a.mission].tasks[a.taskIndex].id;
      a.draft = [];
      a.hinted = false;
      return s;
    }
    if (action.skill === "attack") {
      // The three contract seals must be read before a killing blow can land.
      a.enemy = Math.max(
        a.taskIndex < 3 ? 1 : 0,
        a.enemy - (s.equipment === "金秤笔尖" ? 14 : 10),
      );
      a.energy = Math.min(4, a.energy + 1);
      a.log = "你击破纸刃：普通攻击，能量 +1。";
    } else {
      a.guard = true;
      a.energy = Math.min(4, a.energy + 2);
      a.hp = Math.min(a.maxHp, a.hp + 5);
      a.log = "你稳住阵线：恢复 5 生命，能量 +2，抵挡下一击。";
    }
    a.pending = true;
    finish(s);
    return s;
  }
  if (action.type === "beat" && a.pending && !a.question && !s.paused) {
    const raw = a.turn % 3 === 2 ? 16 : 8;
    const damage = a.guard ? Math.ceil(raw * 0.25) : raw;
    a.hp = Math.max(0, a.hp - damage);
    a.turn++;
    a.guard = false;
    a.pending = false;
    a.log = `${raw === 16 ? "重击" : "契印冲击"}造成 ${damage} 点伤害。轮到你行动。`;
    if (a.hp <= 0) {
      a.phase = "defeat";
      a.log = "你暂时撤出战场。学习记录保留；重试会恢复生命，重新选择路线。";
    }
  }
  return s;
}
