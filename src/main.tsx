import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { entries, missions, shuffled, taskById, type Task } from "./content";
import { initial, level, reducer, type Action, type State } from "./game";
import { encode, load, SAVE_KEY } from "./persistence";
import "./style.css";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let ready = false;
registerSW({
  onOfflineReady() {
    ready = true;
    window.dispatchEvent(new Event("offline-ready"));
  },
  onNeedRefresh() {
    window.dispatchEvent(new Event("update-ready"));
  },
});
const navs = [
  ["adventure", "冒险", "◈"],
  ["journal", "词契手记", "▤"],
  ["character", "调查员", "♙"],
  ["settings", "设置", "⚙"],
];
function App() {
  const [s, setS] = useState<State>(load);
  const [screen, setScreen] = useState(location.hash.slice(1) || "adventure");
  const [saveError, setSaveError] = useState(false);
  const paused = s.paused;
  const [away, setAway] = useState(document.hidden);
  const [help, setHelp] = useState(false);
  const [glossary, setGlossary] = useState(false);
  const [offlineReady, setOfflineReady] = useState(ready);
  const [online, setOnline] = useState(navigator.onLine);
  const [update, setUpdate] = useState(false);
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const [reset, setReset] = useState(false);
  useEffect(() => {
    if (!help && !glossary) return;
    const previous = document.activeElement as HTMLElement | null;
    document.querySelector<HTMLButtonElement>(".modal .close")?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setHelp(false);
        setGlossary(false);
      }
      if (event.key !== "Tab") return;
      const buttons = Array.from(
        document.querySelectorAll<HTMLElement>(
          ".modal button:not(:disabled), .modal a, .modal input",
        ),
      );
      const first = buttons[0],
        last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keyboard);
      previous?.focus();
    };
  }, [help, glossary]);
  const dispatch = (action: Action) => setS((old) => reducer(old, action));
  useEffect(() => {
    try {
      localStorage.setItem(SAVE_KEY, encode(s));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }, [s]);
  useEffect(() => {
    const hash = () => setScreen(location.hash.slice(1) || "adventure");
    window.addEventListener("hashchange", hash);
    return () => window.removeEventListener("hashchange", hash);
  }, []);
  useEffect(() => {
    const visibility = () => setAway(document.hidden);
    const blur = () => setAway(true);
    const focus = () => setAway(document.hidden);
    const net = () => setOnline(navigator.onLine);
    const cached = () => setOfflineReady(true);
    const updated = () => setUpdate(true);
    const prompt = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallPrompt);
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", blur);
    window.addEventListener("focus", focus);
    window.addEventListener("online", net);
    window.addEventListener("offline", net);
    window.addEventListener("offline-ready", cached);
    window.addEventListener("update-ready", updated);
    window.addEventListener("beforeinstallprompt", prompt);
    // A previous visit can already have a fully installed offline worker.
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.getRegistration("/wordbound/").then((r) => {
        if (r?.active && navigator.serviceWorker.controller)
          setOfflineReady(true);
      });
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", blur);
      window.removeEventListener("focus", focus);
      window.removeEventListener("online", net);
      window.removeEventListener("offline", net);
      window.removeEventListener("offline-ready", cached);
      window.removeEventListener("update-ready", updated);
      window.removeEventListener("beforeinstallprompt", prompt);
    };
  }, []);
  const a = s.active;
  const frozen =
    paused ||
    away ||
    help ||
    glossary ||
    screen !== "adventure" ||
    !!a?.question;
  useEffect(() => {
    if (!a?.pending || a.phase !== "combat" || frozen) return;
    const timer = setTimeout(
      () => setS((old) => reducer(old, { type: "beat" })),
      1800,
    );
    return () => clearTimeout(timer);
  }, [a, frozen]);
  const move = (page: string) => {
    location.hash = page;
    setScreen(page);
  };
  const start = (id: number) => {
    dispatch({ type: "start", mission: id });
  };
  return (
    <div className={s.reduced ? "app reduced" : "app"}>
      <header className="topbar">
        <a href="#adventure" className="brand">
          W
          <span>
            WORD​BOUND<small>言契之城</small>
          </span>
        </a>
        <span className="status">
          <i className={online ? "dot" : "dot offline"} />
          {online ? "本地旅程" : "离线旅程"}
        </span>
      </header>
      {saveError && (
        <div role="alert" className="warning">
          无法保存到浏览器。请检查存储权限；关闭页面可能丢失本次进度。
        </div>
      )}
      <main>
        <aside className="identity">
          <p className="eyebrow">THE CITY KEEPS ITS WORD</p>
          <h1>
            每一句话，
            <br />
            都有力量。
          </h1>
          <p>
            雾起之时，契约失真。
            <br />
            以证据为灯，以语言为刃。
          </p>
          <img
            src={`${import.meta.env.BASE_URL}city.svg`}
            alt="雾港、潮汐泵站与金秤交易所的城市线描"
          />
          <div className="chapter-label">
            <span>第一章</span>
            <strong>失真的契约</strong>
            <small>THE FRACTURED PACT</small>
          </div>
          <div className="aside-note">
            调查手册 / 01
            <br />
            探索 · 理解 · 改变
            <br />
            <span>无需账号。进度保存在这台设备。</span>
          </div>
        </aside>
        <section className="pages">
          <nav aria-label="主导航" className="navigation">
            {navs.map(([id, label, icon]) => (
              <button
                key={id}
                className={screen === id ? "selected" : ""}
                onClick={() => move(id)}
                aria-current={screen === id ? "page" : undefined}
              >
                <span>{icon}</span>
                {label}
              </button>
            ))}
          </nav>
          {screen === "adventure" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">FIELD NOTES / CHAPTER I</p>
                  <h2>
                    {a && a.phase !== "victory"
                      ? "进行中的调查"
                      : "城市等待你的回音"}
                  </h2>
                </div>
                <button
                  className="icon-button"
                  aria-label="玩法说明"
                  onClick={() => setHelp(true)}
                >
                  ?
                </button>
              </div>
              {!a && (
                <div className="welcome card">
                  <span className="tag">致新任契约调查员</span>
                  <h3>欢迎来到雾港。</h3>
                  <p>
                    三份异常契约，一座等待修复的城市。读懂措辞背后的意图，让你的判断改变战局。
                  </p>
                  <button className="primary" onClick={() => start(0)}>
                    开启第一份调查 <span>→</span>
                  </button>
                  <small>每份调查约 5–8 分钟 · 随时离开，自动保存</small>
                </div>
              )}
              {a && (
                <section className="encounter card" aria-label="当前任务">
                  <div className="mission-kicker">
                    {missions[a.mission].district}
                    <span>
                      {a.phase === "combat"
                        ? frozen
                          ? "Ⅱ 已暂停"
                          : a.pending
                            ? "● 战斗推进 · 1.8 秒"
                            : "◇ 等待你的决策"
                        : "调查札记"}
                    </span>
                  </div>
                  <h3>{missions[a.mission].name}</h3>
                  {a.phase === "route" && (
                    <>
                      <p>{missions[a.mission].intro}</p>
                      <h4>你将从哪里入手？</h4>
                      <div className="route-list">
                        {missions[a.mission].routes.map((r) => (
                          <button
                            key={r.kind}
                            onClick={() =>
                              dispatch({ type: "route", route: r.kind })
                            }
                          >
                            <strong>{r.name} →</strong>
                            <span>{r.text}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {a.phase === "story" && (
                    <>
                      <span className="tag">
                        {
                          missions[a.mission].routes.find(
                            (r) => r.kind === a.route,
                          )?.name
                        }
                      </span>
                      <p>{missions[a.mission].scene}</p>
                      <p className="note">
                        已发现本任务 10
                        条词契。三个契印需要依次用「分析」解读；普通攻击不能跳过契印。
                      </p>
                      <button
                        className="primary"
                        onClick={() => dispatch({ type: "engage" })}
                      >
                        接近契印 · 进入战斗 →
                      </button>
                    </>
                  )}
                  {a.phase === "combat" && (
                    <>
                      <div className="combatants">
                        <Meter
                          label={`调查员 · LV ${level(s)}`}
                          value={a.hp}
                          max={a.maxHp}
                        />
                        <Meter
                          label={missions[a.mission].enemy}
                          value={a.enemy}
                          max={a.maxEnemy}
                          enemy
                        />
                      </div>
                      <div className="intent">
                        <span>敌方意图</span>
                        <strong>
                          {a.turn % 3 === 2
                            ? "重击 · 16 伤害"
                            : "契印冲击 · 8 伤害"}
                        </strong>
                        <small>防守可减伤 75% · 只在你行动后推进</small>
                      </div>
                      <div className="resource">
                        <span>
                          能量{" "}
                          <b>
                            {"◆".repeat(a.energy)}
                            {"◇".repeat(4 - a.energy)}
                          </b>
                        </span>
                        <span>已解契印 {a.taskIndex} / 3</span>
                      </div>
                      <p className="battle-log" aria-live="polite">
                        {a.log}
                      </p>
                      {a.question ? (
                        <Question
                          key={a.question}
                          task={taskById(a.question)}
                          blocks={a.draft}
                          setBlocks={(ids) => dispatch({ type: "draft", ids })}
                          hinted={a.hinted}
                          feedback={a.feedback}
                          onHint={() => dispatch({ type: "hint" })}
                          onAnswer={(ids) => dispatch({ type: "answer", ids })}
                          onContinue={() => dispatch({ type: "continue" })}
                        />
                      ) : (
                        <>
                          <div className="skills">
                            <button
                              disabled={a.pending || frozen}
                              onClick={() =>
                                dispatch({ type: "skill", skill: "attack" })
                              }
                            >
                              <strong>攻击</strong>
                              <small>
                                {s.equipment === "金秤笔尖" ? 14 : 10} 伤害 · +1
                                能量
                              </small>
                            </button>
                            <button
                              disabled={a.pending || frozen}
                              onClick={() =>
                                dispatch({ type: "skill", skill: "guard" })
                              }
                            >
                              <strong>防守</strong>
                              <small>减伤 · 回血 5 · +2 能量</small>
                            </button>
                            <button
                              className="gold"
                              disabled={
                                a.pending ||
                                frozen ||
                                a.energy < 2 ||
                                a.taskIndex >= 3
                              }
                              onClick={() =>
                                dispatch({ type: "skill", skill: "analysis" })
                              }
                            >
                              <strong>分析 / 协商</strong>
                              <small>
                                {a.taskIndex >= 3
                                  ? "契印已全部解读"
                                  : "语境技能 · 消耗 2 能量"}
                              </small>
                            </button>
                          </div>
                          {a.taskIndex >= 3 && (
                            <p className="note">
                              封印已解除。继续攻击击败敌人，或防守等待更好时机。
                            </p>
                          )}
                        </>
                      )}
                      <div className="toolbar">
                        <button
                          onClick={() =>
                            dispatch({ type: "pause", value: !paused })
                          }
                        >
                          {paused ? "继续战斗" : "暂停战斗"}
                        </button>
                        <button
                          onClick={() => {
                            setGlossary(true);
                            if (a.question) dispatch({ type: "hint" });
                          }}
                        >
                          查阅词契
                        </button>
                      </div>
                    </>
                  )}
                  {(a.phase === "victory" || a.phase === "defeat") && (
                    <div className="resolution">
                      <span className="seal">
                        {a.phase === "victory" ? "契" : "归"}
                      </span>
                      <h4>
                        {a.phase === "victory"
                          ? "契约已修复"
                          : "整顿之后，再次出发"}
                      </h4>
                      <p>
                        {a.phase === "victory"
                          ? missions[a.mission].ending
                          : "敌人的契印暂时压过了你的声音。试着在重击前防守，并利用分析恢复生命。"}
                      </p>
                      <p className="note" role="status">
                        {a.log}
                      </p>
                      {a.phase === "defeat" ? (
                        <button
                          className="primary"
                          onClick={() => dispatch({ type: "retry" })}
                        >
                          重新调查 · 恢复生命
                        </button>
                      ) : (
                        <button
                          className="primary"
                          onClick={() => move("character")}
                        >
                          查看成长与装备 →
                        </button>
                      )}
                    </div>
                  )}
                </section>
              )}
              <div className="section-title">
                <h3>第一章 · 调查路线</h3>
                <span>{s.completed.length} / 3 修复</span>
              </div>
              <div className="missions">
                {missions.map((m) => (
                  <article key={m.id} className="mission-card">
                    <span className="number">0{m.id + 1}</span>
                    <div>
                      <small>
                        {m.district.split(" / ")[1]} ·{" "}
                        {s.completed.includes(m.id) ? "已修复" : "待调查"}
                      </small>
                      <h4>{m.name}</h4>
                      <p>{m.en}</p>
                      <button
                        disabled={
                          !!a && ["route", "story", "combat"].includes(a.phase)
                        }
                        onClick={() => start(m.id)}
                      >
                        {s.completed.includes(m.id) ? "重访调查" : "开始调查"}{" "}
                        <span>↗</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {a && ["route", "story", "combat"].includes(a.phase) && (
                <p className="note">
                  先完成当前调查，再开启其他任务。可切换手记或设置，战斗会暂停。
                </p>
              )}
            </>
          )}
          {screen === "journal" && <Journal state={s} dispatch={dispatch} />}
          {screen === "character" && (
            <>
              <PageTitle kicker="THE INVESTIGATOR" title="把经历，化为力量。" />
              <div className="card character">
                <span className="seal">契</span>
                <h3>
                  雾港调查员 <span className="tag">LV {level(s)}</span>
                </h3>
                <p>
                  {s.xp} XP · 已修复 {s.completed.length} 份契约
                </p>
                <p className="note">
                  每份任务首次完成 +100 XP，提升一级；每级最大生命
                  +4。重访可继续练习，不重复发放经验。
                </p>
                <h4>随身装备</h4>
                <p>装备效果在下次调查生效。当前调查中不可更换。</p>
                {[
                  "旅人外套",
                  ...missions
                    .filter((m) => s.completed.includes(m.id))
                    .map((m) => m.reward),
                ].map((name) => (
                  <div className="equipment" key={name}>
                    <div>
                      <strong>{name}</strong>
                      <small>
                        {
                          {
                            旅人外套: "无额外加成 · 轻装出行",
                            保温护符: "最大生命 +10",
                            潮汐透镜: "正确分析伤害 +4",
                            金秤笔尖: "普通攻击伤害 +4",
                          }[name]
                        }
                      </small>
                    </div>
                    <button
                      disabled={
                        s.equipment === name ||
                        (!!a && ["route", "story", "combat"].includes(a.phase))
                      }
                      onClick={() => dispatch({ type: "equip", name })}
                    >
                      {s.equipment === name ? "已装备" : "装备"}
                    </button>
                  </div>
                ))}
              </div>
              <div className="card">
                <h3>学习不等于通关</h3>
                <p>
                  词契的「发现、识别、应用」独立记录。使用提示也能推进故事，但不增加独立掌握次数。这里不估算或承诺
                  IELTS 分数。
                </p>
                <button onClick={() => move("journal")}>打开学习手记 →</button>
              </div>
            </>
          )}
          {screen === "settings" && (
            <>
              <PageTitle kicker="YOUR LOCAL JOURNEY" title="旅途设置" />
              <div className="card">
                <h3>离线与安装</h3>
                <p role="status">
                  {offlineReady
                    ? "✓ 整章离线资源已就绪"
                    : "离线资源准备中；请保持联网，等待缓存完成。"}
                </p>
                <p>
                  当前{online ? "在线" : "离线"}
                  。首次联网打开后，故事、词契和战斗均可离线使用。
                </p>
                {install ? (
                  <button
                    className="primary"
                    onClick={async () => {
                      await install.prompt();
                      await install.userChoice;
                      setInstall(null);
                    }}
                  >
                    安装 Wordbound
                  </button>
                ) : (
                  <p className="note">
                    安装：Android / 桌面 Chromium
                    在浏览器菜单中选择「安装应用」（可用时）。iPhone / iPad 请用
                    Safari 打开，点击分享 → 添加到主屏幕。也可直接在浏览器游玩。
                  </p>
                )}
                {update && (
                  <p className="note">
                    新版本已下载。请在结束调查后关闭所有应用标签，再打开以使用新版本；不会在战斗中强制刷新。
                  </p>
                )}
              </div>
              <div className="card">
                <h3>阅读与操作</h3>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={s.reduced}
                    onChange={(e) =>
                      dispatch({ type: "motion", value: e.target.checked })
                    }
                  />
                  减少动态效果
                </label>
                <button onClick={() => setHelp(true)}>阅读玩法说明</button>
              </div>
              <div className="card">
                <h3>本机存档</h3>
                <p>
                  无需注册，无云端同步。进度与当前反馈自动存储在此浏览器；清理站点数据会删除存档。无广告、无追踪、无付费服务。
                </p>
                {reset ? (
                  <div className="warning">
                    <strong>确定清除所有进度？此操作不可撤销。</strong>
                    <div className="toolbar">
                      <button
                        onClick={() => {
                          setS(initial());
                          setReset(false);
                          move("adventure");
                        }}
                      >
                        确认清除
                      </button>
                      <button onClick={() => setReset(false)}>取消</button>
                    </div>
                  </div>
                ) : (
                  <button className="danger" onClick={() => setReset(true)}>
                    重置本机进度
                  </button>
                )}
              </div>
            </>
          )}
          <footer>
            WORD​BOUND <span>语言有据，承诺有声。</span>
          </footer>
        </section>
      </main>
      {(help || glossary) && (
        <div
          className="overlay"
          onClick={() => {
            setHelp(false);
            setGlossary(false);
          }}
        >
          <section
            className="modal card"
            role="dialog"
            aria-modal="true"
            aria-label={help ? "玩法说明" : "任务词契"}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close"
              onClick={() => {
                setHelp(false);
                setGlossary(false);
              }}
            >
              关闭 ×
            </button>
            {help ? (
              <>
                <p className="eyebrow">INVESTIGATOR’S GUIDE</p>
                <h2>读懂，再行动。</h2>
                <p>
                  先选择调查路线，再与腐化契印交锋。每次行动后，敌人在 1.8
                  秒后出招；之后等待你的下一次决策。
                </p>
                <ol>
                  <li>
                    <b>攻击：</b>造成伤害并恢复 1 能量。
                  </li>
                  <li>
                    <b>防守：</b>恢复 5 生命、2 能量，并抵挡下一击的 75%
                    伤害。重击前尤其有效。
                  </li>
                  <li>
                    <b>分析 / 协商：</b>消耗 2 能量，触发英语语境任务。正确造成
                    18 伤害并恢复 4 生命；答错仍造成 6 伤害。
                  </li>
                </ol>
                <p>
                  三个契印全部解读后才能击败敌人。答错不会阻止解印。英文任务、反馈、词契和说明阅读期间均暂停；切换页面或离开标签也暂停。
                </p>
                <p>
                  提示不影响战斗伤害，但不计为独立掌握。失败保留学习记录，可满血重试。
                </p>
              </>
            ) : (
              <>
                <h2>当前任务 · 词契</h2>
                <p className="note">战斗已暂停。题目中查阅词契视为使用提示。</p>
                {entries
                  .filter((e) => e.mission === a?.mission)
                  .map((e) => (
                    <div className="gloss-entry" key={e.id}>
                      <strong>{e.term}</strong>
                      <span>{e.zh}</span>
                      <p lang="en">{e.example}</p>
                    </div>
                  ))}
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
function PageTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{kicker}</p>
        <h2>{title}</h2>
      </div>
    </div>
  );
}
function Meter({
  label,
  value,
  max,
  enemy = false,
}: {
  label: string;
  value: number;
  max: number;
  enemy?: boolean;
}) {
  return (
    <div className={enemy ? "meter enemy" : "meter"}>
      <div>
        <strong>{label}</strong>
        <span>
          {value}/{max}
        </span>
      </div>
      <progress aria-label={label + "生命"} value={value} max={max} />
    </div>
  );
}
function Question({
  task,
  blocks,
  setBlocks,
  hinted,
  feedback,
  onHint,
  onAnswer,
  onContinue,
}: {
  task: Task;
  blocks: string[];
  setBlocks: (ids: string[]) => void;
  hinted: boolean;
  feedback: { correct: boolean; text: string } | null;
  onHint: () => void;
  onAnswer: (ids: string[]) => void;
  onContinue: () => void;
}) {
  const options = useMemo(() => shuffled(task.options), [task.id]);
  return (
    <div className="question">
      <span className="tag">
        {task.type === "assembly"
          ? "03 / 词块组句"
          : task.type === "intent"
            ? "02 / 意图与语气"
            : "01 / 语境判断"}
      </span>
      <p>{task.context}</p>
      <h4>{task.prompt}</h4>
      {!feedback ? (
        <>
          {task.type === "assembly" ? (
            <>
              <div className="sentence" aria-label="已组句子">
                {blocks.length === 0 && <span>按顺序点选下方词块…</span>}
                {blocks.map((id, i) => (
                  <button
                    key={id}
                    onClick={() => setBlocks(blocks.filter((_, n) => n !== i))}
                  >
                    {task.options.find((o) => o.id === id)?.text} ×
                  </button>
                ))}
              </div>
              <div className="blocks">
                {options.map((o) => (
                  <button
                    lang="en"
                    key={o.id}
                    disabled={blocks.includes(o.id)}
                    onClick={() => setBlocks([...blocks, o.id])}
                  >
                    {o.text}
                  </button>
                ))}
              </div>
              <button
                className="primary"
                disabled={blocks.length !== task.answer.length}
                onClick={() => onAnswer(blocks)}
              >
                确认表达
              </button>
            </>
          ) : (
            <div className="answers">
              {options.map((o) => (
                <button lang="en" key={o.id} onClick={() => onAnswer([o.id])}>
                  {o.text}
                </button>
              ))}
            </div>
          )}
          {hinted ? (
            <p className="hint">提示 · {task.hint}</p>
          ) : (
            <button className="hint-button" onClick={onHint}>
              需要线索？查看中文提示
            </button>
          )}
        </>
      ) : (
        <div
          className={feedback.correct ? "feedback good" : "feedback"}
          role="status"
        >
          <h4>{feedback.correct ? "✓ 措辞准确" : "↺ 从这一次理解更多"}</h4>
          <p>{feedback.text}</p>
          <p lang="en" className="correct-answer">
            {task.answer
              .map((id) => task.options.find((o) => o.id === id)?.text)
              .join(" ")}
          </p>
          <button className="primary" onClick={onContinue}>
            已读反馈 · 继续交锋 →
          </button>
        </div>
      )}
    </div>
  );
}
function Journal({
  state,
  dispatch,
}: {
  state: State;
  dispatch: (a: Action) => void;
}) {
  const [filter, setFilter] = useState(-1);
  const [review, setReview] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  const [result, setResult] = useState<boolean | null>(null);
  const entry = entries.find((e) => e.id === review);
  const options = useMemo(
    () =>
      entry
        ? shuffled([
            entry,
            ...entries
              .filter((e) => e.id !== entry.id)
              .slice(entry.mission * 3, entry.mission * 3 + 2),
          ])
        : [],
    [review],
  );
  const discovered = Object.values(state.knowledge).filter(
    (k) => k.discovered,
  ).length;
  return (
    <>
      <PageTitle kicker="A LEXICON OF EXPERIENCE" title="你的词契手记" />
      <div className="learning-stats">
        <div>
          <b>{discovered}</b>
          <span>已发现 / 30</span>
        </div>
        <div>
          <b>
            {
              Object.values(state.knowledge).filter((k) => k.recognised > 0)
                .length
            }
          </b>
          <span>独立识别</span>
        </div>
        <div>
          <b>
            {Object.values(state.knowledge).filter((k) => k.applied > 0).length}
          </b>
          <span>语境应用</span>
        </div>
      </div>
      <p className="note">
        识别：无提示答对。应用：调查中无提示答对。复习巩固识别；辅助和错误次数如实保留。
      </p>
      {entry && (
        <section className="card review" aria-label="词契复习">
          <span className="tag">语境复习 · {missions[entry.mission].name}</span>
          <h3 lang="en">{entry.term}</h3>
          <p lang="en">{entry.example}</p>
          <h4>在这句话中，词契表达什么含义？</h4>
          {result === null ? (
            <>
              <div className="answers">
                {options.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => {
                      const correct = o.id === entry.id;
                      setResult(correct);
                      dispatch({
                        type: "review",
                        entry: entry.id,
                        correct,
                        hinted: hint,
                      });
                    }}
                  >
                    {o.zh}
                  </button>
                ))}
              </div>
              {hint ? (
                <p className="hint">提示：{entry.zh}。请再读一次完整例句。</p>
              ) : (
                <button onClick={() => setHint(true)}>查看释义提示</button>
              )}
            </>
          ) : (
            <div className="feedback" role="status">
              <h4>{result ? "✓ 理解准确" : "↺ 再看一次语境"}</h4>
              <p>
                {entry.term}：{entry.zh}。
                {hint
                  ? "辅助练习已记录，不计独立识别。"
                  : result
                    ? "独立识别 +1。"
                    : "错误次数 +1，下次继续练习。"}
              </p>
              <button
                onClick={() => {
                  setReview(null);
                  setResult(null);
                }}
              >
                完成复习
              </button>
            </div>
          )}
        </section>
      )}
      <div className="filters" aria-label="词契主题">
        {["全部", "冷链运输", "环境能源", "商务协商"].map((name, i) => (
          <button
            key={name}
            className={filter === i - 1 ? "active" : ""}
            onClick={() => setFilter(i - 1)}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="lexicon">
        {entries
          .filter((e) => filter === -1 || e.mission === filter)
          .map((e) => {
            const k = state.knowledge[e.id];
            return (
              <article className="lexicon-entry" key={e.id}>
                <div>
                  <span className="eyebrow">
                    {missions[e.mission].district}
                  </span>
                  <h3 lang="en">{e.term}</h3>
                  <p>{e.zh}</p>
                  <p className="example" lang="en">
                    {e.example}
                  </p>
                  <small>
                    {k
                      ? `识别 ${k.recognised} · 应用 ${k.applied} · 辅助 ${k.assisted} · 错误 ${k.errors}`
                      : "尚未发现 · 可提前研读"}
                  </small>
                </div>
                <button
                  disabled={review !== null}
                  onClick={() => {
                    dispatch({ type: "discover", entry: e.id });
                    setReview(e.id);
                    setHint(false);
                    setResult(null);
                    window.scrollTo({ top: 0, behavior: "instant" });
                  }}
                >
                  复习 ↗
                </button>
              </article>
            );
          })}
      </div>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
