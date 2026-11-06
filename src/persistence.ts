import { initial, type State } from "./game";
import { entries, missions } from "./content";
const count = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;
export const SAVE_KEY = "wordbound-save-v1";
export function encode(s: State) {
  return JSON.stringify(s);
}
export function decode(raw: string | null): State {
  if (!raw) return initial();
  try {
    const s = JSON.parse(raw);
    if (
      !s ||
      s.version !== 1 ||
      !count(s.xp) ||
      !Array.isArray(s.completed) ||
      !s.completed.every(
        (x: unknown) => Number.isInteger(x) && Number(x) >= 0 && Number(x) < 3,
      ) ||
      typeof s.knowledge !== "object" ||
      !s.knowledge ||
      !["旅人外套", ...missions.map((m) => m.reward)].includes(s.equipment) ||
      typeof s.reduced !== "boolean" ||
      typeof s.paused !== "boolean" ||
      Array.isArray(s.knowledge) ||
      !Object.entries(s.knowledge).every(([id, value]) => {
        const k = value as State["knowledge"][string];
        return (
          entries.some((e) => e.id === id) &&
          k &&
          typeof k.discovered === "boolean" &&
          [k.recognised, k.applied, k.errors, k.assisted].every(count)
        );
      })
    )
      return initial();
    const a = s.active;
    if (
      a !== null &&
      (!a ||
        !count(a.mission) ||
        a.mission > 2 ||
        !["route", "story", "combat", "victory", "defeat"].includes(a.phase) ||
        ![
          a.hp,
          a.maxHp,
          a.enemy,
          a.maxEnemy,
          a.energy,
          a.turn,
          a.taskIndex,
        ].every(count) ||
        a.hp > a.maxHp ||
        a.enemy > a.maxEnemy ||
        a.energy > 4 ||
        a.taskIndex > 3 ||
        !["", "insight", "shelter"].includes(a.route) ||
        ![a.guard, a.hinted, a.pending].every((v) => typeof v === "boolean") ||
        typeof a.log !== "string" ||
        !Array.isArray(a.draft) ||
        (a.question !== null &&
          !missions[a.mission].tasks.some((t) => t.id === a.question)) ||
        (a.question !== null &&
          !a.draft.every((id: unknown) =>
            missions[a.mission].tasks
              .find((t) => t.id === a.question)!
              .options.some((o) => o.id === id),
          )) ||
        (a.feedback !== null &&
          (!a.feedback ||
            typeof a.feedback.correct !== "boolean" ||
            typeof a.feedback.text !== "string")))
    )
      return initial();
    return s as State;
  } catch {
    return initial();
  }
}
export function load() {
  try {
    return decode(localStorage.getItem(SAVE_KEY));
  } catch {
    return initial();
  }
}
