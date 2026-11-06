export type Entry = {
  id: string;
  term: string;
  zh: string;
  example: string;
  mission: number;
};
const rows = [
  ["cold chain", "冷链", "A reliable cold chain keeps vaccines safe."],
  [
    "temperature excursion",
    "温度偏离规定范围",
    "Report any temperature excursion immediately.",
  ],
  ["shipment", "货物 / 发运批次", "The shipment arrived two hours late."],
  ["dispatch", "发出货物", "Please dispatch the replacement today."],
  ["consignment", "托运货物", "Inspect the consignment before signing."],
  ["traceability", "可追溯性", "Batch numbers improve traceability."],
  ["comply with", "遵守", "Carriers must comply with storage requirements."],
  ["take responsibility", "承担责任", "We take responsibility for the delay."],
  ["replacement", "替换品", "We can offer a replacement at no extra cost."],
  ["proof of delivery", "交货凭证", "Could you send us the proof of delivery?"],
  ["water scarcity", "水资源短缺", "Water scarcity affects local businesses."],
  ["renewable energy", "可再生能源", "The pumps run on renewable energy."],
  [
    "energy efficiency",
    "能源效率",
    "Better insulation improves energy efficiency.",
  ],
  ["consumption", "消耗量", "Water consumption fell by ten percent."],
  ["leakage", "泄漏", "Leakage accounts for much of the water loss."],
  ["sustainable", "可持续的", "We need a sustainable water supply."],
  ["allocate", "分配", "The council will allocate funds to repairs."],
  [
    "evidence suggests",
    "证据表明",
    "The evidence suggests that the pipe is leaking.",
  ],
  ["trade-off", "权衡 / 取舍", "There is a trade-off between cost and speed."],
  ["reduce emissions", "减少排放", "Electric pumps can reduce emissions."],
  ["payment terms", "付款条件", "We would like to discuss the payment terms."],
  ["counteroffer", "还价 / 反提案", "Thank you for your counteroffer."],
  ["reach an agreement", "达成协议", "We hope to reach an agreement today."],
  [
    "provided that",
    "条件是 / 只要",
    "We can accept, provided that delivery is included.",
  ],
  ["bulk order", "大批量订单", "We offer a discount on a bulk order."],
  ["lead time", "交付周期", "The lead time is three weeks."],
  [
    "mutually beneficial",
    "互利的",
    "Let us find a mutually beneficial solution.",
  ],
  ["meet halfway", "各让一步", "Could we meet halfway on the price?"],
  [
    "binding agreement",
    "有约束力的协议",
    "Both parties signed a binding agreement.",
  ],
  [
    "resolve a complaint",
    "解决投诉",
    "We aim to resolve a complaint within two days.",
  ],
];
export const entries: Entry[] = rows.map((r, i) => ({
  id: `v${i}`,
  term: r[0],
  zh: r[1],
  example: r[2],
  mission: Math.floor(i / 10),
}));
export type Task = {
  id: string;
  type: "choice" | "intent" | "assembly";
  context: string;
  prompt: string;
  options: { id: string; text: string }[];
  answer: string[];
  entry: string;
  hint: string;
  explain: string;
};
const choice = (
  id: string,
  type: "choice" | "intent",
  context: string,
  prompt: string,
  texts: string[],
  entry: string,
  hint: string,
  explain: string,
): Task => ({
  id,
  type,
  context,
  prompt,
  options: texts.map((text, i) => ({ id: `${id}-${i}`, text })),
  answer: [`${id}-0`],
  entry,
  hint,
  explain,
});
const assembly = (
  id: string,
  context: string,
  words: string[],
  entry: string,
  hint: string,
): Task => ({
  id,
  type: "assembly",
  context,
  prompt: "拼出适合此刻的完整表达。",
  options: words.map((text, i) => ({ id: `${id}-${i}`, text })),
  answer: words.map((_, i) => `${id}-${i}`),
  entry,
  hint,
  explain: `${words.join(" ")} — ${hint} 注意固定搭配与从句顺序。`,
});
export const missions = [
  {
    id: 0,
    name: "雾港的冷链",
    en: "The broken cold chain",
    district: "01 / 雾港货栈",
    intro:
      "黎明前，一批诊所疫苗抵达雾港。交货契约声称全程低温，封印却在发烫。货运员林请求你查清真相：是延误，还是记录被篡改？",
    routes: [
      {
        name: "追查温度记录",
        text: "走进档案室，比对批次与温度。获得分析优势：开战能量 +1。",
        kind: "insight",
      },
      {
        name: "护送备用冷箱",
        text: "先保住疫苗，再追究责任。获得防护优势：最大生命 +8。",
        kind: "shelter",
      },
    ],
    scene:
      "你发现两小时的温度空白。破损的契约化作「霜印守卫」，阻止任何人接近原始记录。让证据说话，也要撑住它的攻击。",
    enemy: "霜印守卫",
    ending:
      "原始记录证实转运站断电。你促成免费补发与温度追踪，诊所终于收到安全的疫苗。责任不再被一枚印章掩盖。",
    reward: "保温护符",
    tasks: [
      choice(
        "cold-a",
        "choice",
        "货运员问你为什么不能直接签收。",
        "选择准确描述风险的英文。",
        [
          "There was a temperature excursion during transit.",
          "The shipment was delivered in perfect condition.",
          "We would like to place a bulk order.",
        ],
        "v1",
        "excursion 在冷链中指超出允许温度范围，不是旅行。",
        "温度异常必须被记录；不能声称完好，也不是下新订单。",
      ),
      choice(
        "cold-b",
        "intent",
        "你需要交货凭证，但希望保持专业与合作。",
        "哪句话是礼貌而明确的请求？",
        [
          "Could you send us the proof of delivery?",
          "Send it now. You are obviously lying.",
          "Perhaps delivery exists somewhere.",
        ],
        "v9",
        "Could you + 动词原形，是清晰、礼貌的请求。",
        "第一句明确索要凭证；指责会升级冲突，含糊表达不能推动调查。",
      ),
      assembly(
        "cold-c",
        "承运方承认失误。帮它写出承担责任的句子。",
        ["We", "take responsibility", "for", "the delay."],
        "v7",
        "take responsibility for + 事项：为延误承担责任。",
      ),
    ],
  },
  {
    id: 1,
    name: "逐渐干涸的河",
    en: "A current of evidence",
    district: "02 / 潮汐泵站",
    intro:
      "城北水价上涨，议会把一切归咎于旱季。但河面仍然很高。你沿着旧水道走向泵站：能源契约正在吞噬本该流向居民区的水。",
    routes: [
      {
        name: "测量夜间流量",
        text: "收集漏水证据。获得分析优势：开战能量 +1。",
        kind: "insight",
      },
      {
        name: "组织社区储水",
        text: "帮助居民渡过停水。获得防护优势：最大生命 +8。",
        kind: "shelter",
      },
    ],
    scene:
      "仪表显示夜间仍有大量耗水。裂隙中升起「涡流司账」，它用虚假的节能数字保护漏水管网。你必须打断它的论证。",
    enemy: "涡流司账",
    ending:
      "议会公开了流量数据，并先修复漏管，再升级节能泵。节约不是让居民少喝水，而是让系统少浪费。",
    reward: "潮汐透镜",
    tasks: [
      choice(
        "water-a",
        "choice",
        "夜间无人用水，管网流量却持续偏高。",
        "选择谨慎、有证据支持的判断。",
        [
          "The evidence suggests that the pipe is leaking.",
          "This proves that all renewable energy is useless.",
          "Water scarcity never affects cities.",
        ],
        "v17",
        "suggests 表示证据支持的推断，避免无根据的绝对化。",
        "持续流量支持漏水推断；它不能证明所有能源无用，也不能否认水资源问题。",
      ),
      choice(
        "water-b",
        "intent",
        "工程师需要向议会正式说明新泵的优点。",
        "选择适合正式报告的措辞。",
        [
          "The new pumps will improve energy efficiency.",
          "These pumps are, like, super cool.",
          "The pumps will make water free forever.",
        ],
        "v12",
        "energy efficiency 指以更少能源完成同样工作。",
        "正式报告应准确而克制；口语夸赞与永久免费的承诺都不合适。",
      ),
      assembly(
        "water-c",
        "资金有限。请写明修复工程的资源分配。",
        ["The council", "will allocate", "funds", "to repairs."],
        "v16",
        "allocate funds to…：为某项用途拨款。",
      ),
    ],
  },
  {
    id: 2,
    name: "金秤之约",
    en: "Terms worth keeping",
    district: "03 / 金秤交易所",
    intro:
      "冷链与供水恢复了，商会却要求居民承担全部修复费。你带着两份调查记录走进交易所。城中最后一枚腐化契印，藏在这份看似公平的协议中。",
    routes: [
      {
        name: "准备成本对照表",
        text: "用证据争取合理条件。获得分析优势：开战能量 +1。",
        kind: "insight",
      },
      {
        name: "联合小商户担保",
        text: "共同承担履约风险。获得防护优势：最大生命 +8。",
        kind: "shelter",
      },
    ],
    scene:
      "「镀金仲裁者」从合同纸页中站起。它声称所有条款不可协商。把条件说清楚，守住底线，才能缔结真正互利的契约。",
    enemy: "镀金仲裁者",
    ending:
      "双方同意分期付款、明确交付期限，并共同承担修复费用。契印终于安静下来。你没有用漂亮话赢得一切；你让每一句话都成为可以兑现的承诺。第一章 · 完。",
    reward: "金秤笔尖",
    tasks: [
      choice(
        "trade-a",
        "choice",
        "商会愿意降价，但要求当天全额付款。你需要讨论付款安排。",
        "哪句话能准确开启协商？",
        [
          "We would like to discuss the payment terms.",
          "We accept every condition without question.",
          "Please send the temperature log.",
        ],
        "v20",
        "payment terms 包括付款时间、方式与分期条件。",
        "讨论付款条件保留协商空间；无条件接受放弃底线，温度记录偏离主题。",
      ),
      choice(
        "trade-b",
        "intent",
        "双方报价仍有差距，你想礼貌地建议各让一步。",
        "选择合作性的还价表达。",
        [
          "Could we meet halfway on the price?",
          "Your price is stupid.",
          "We have already agreed to your price.",
        ],
        "v27",
        "meet halfway 是双方妥协，不是地理上的见面。",
        "礼貌提出折中能推进协商；侮辱或错误声称已同意都会破坏谈判。",
      ),
      assembly(
        "trade-c",
        "你可以接受报价，前提是包含配送。",
        ["We can accept,", "provided that", "delivery", "is included."],
        "v23",
        "provided that 引出接受条件：只要包含配送。",
      ),
    ],
  },
];
export const taskById = (id: string) =>
  missions.flatMap((m) => m.tasks).find((t) => t.id === id)!;
export function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
