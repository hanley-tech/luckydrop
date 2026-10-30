"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang, useServerLang } from "@/lib/i18n";
import { Crossfade, DropDemo, FlowDiagram, Reveal, ScreensDiagram, Shot } from "./visuals";

// ---------------------------------------------------------------------------
// Operator guide — how to run a LuckyDrop draw at an event. Linked from the
// operator panel. Follows the server-owned language like every other view.
// Content lives here (not in i18n.ts) because it is long-form prose, written
// separately per language rather than string-by-string.
// ---------------------------------------------------------------------------

type Visual =
  | "screens"
  | "lobby"
  | "flow"
  | "drop"
  | "phones"
  | "game"
  | "winner"
  | "operator"
  | "themes";

interface Section {
  title: string;
  /** Paragraphs or bullet lists. A string[] renders as a list. */
  body: (string | string[])[];
  /** Pictures/diagrams shown after the text, in order. */
  visuals?: Visual[];
}

interface Figures {
  screens: { server: string; display: string; phones: string; operator: string; wifi: string };
  flow: { icon: string; title: string; desc: string; loop?: string }[];
  drop: { win: string; out: string; advance: string; caption: string };
  lobby: string;
  phoneJoin: string;
  phoneWaiting: string;
  game: string;
  winner: string;
  operator: string;
  themes: { neon: string; halloween: string; alt: string; phones: string };
}

interface Guide {
  title: string;
  intro: string;
  back: string;
  urlsTitle: string;
  urls: { display: string; join: string; operator: string };
  fig: Figures;
  sections: Section[];
}

const GUIDE: Record<"zh" | "en", Guide> = {
  zh: {
    title: "主持人指南",
    intro: "一场幸运掉落抽奖需要三个画面：大屏幕、玩家手机、主持人面板。下面是从布置到颁奖的完整流程。",
    back: "← 返回主持人面板",
    urlsTitle: "三个网址",
    urls: {
      display: "大屏幕（投影 / 电视）",
      join: "玩家加入页（大屏幕上的二维码就是它）",
      operator: "主持人面板（建议用你的手机）",
    },
    fig: {
      screens: {
        server: "服务器",
        display: "大屏幕",
        phones: "玩家手机",
        operator: "主持人",
        wifi: "所有设备通过网络实时连接到同一台服务器",
      },
      flow: [
        { icon: "📱", title: "扫码加入", desc: "观众扫大屏幕上的二维码，输入名字、选表情" },
        { icon: "▶️", title: "开始游戏", desc: "主持人点「开始游戏」，所有球一起落下" },
        { icon: "🎯", title: "进 WIN 区就晋级", desc: "落到别处就爆炸出局", loop: "人多就再来一轮" },
        { icon: "🏆", title: "颁奖", desc: "礼花 + 领奖台，显示前 N 名和后面 5 名" },
      ],
      drop: { win: "WIN", out: "出局", advance: "晋级!", caption: "球一到底部就定输赢：只有中间的 WIN 区能晋级。" },
      lobby: "大厅：二维码在中间，左边是演示，右边是已加入的玩家",
      phoneJoin: "玩家手机：输入名字、选表情",
      phoneWaiting: "加入后：手机提示看大屏幕",
      game: "比赛中：左边剩余玩家，右边已淘汰",
      winner: "颁奖：领奖台 + 后面 5 名",
      operator: "主持人面板（手机）",
      themes: { neon: "霓虹", halloween: "万圣节", alt: "同一局比赛的两种主题", phones: "手机加入页：霓虹 / 万圣节" },
    },
    sections: [
      {
        title: "1. 开场前",
        visuals: ["screens", "lobby"],
        body: [
          [
            "在投影或电视上打开大屏幕网址，全屏显示（Mac 按 ⌃⌘F，Windows 按 F11）。",
            "点一下大屏幕上的「点击开启声音」——浏览器要求先点击一次才会播放音乐和音效。",
            "确认左下角是绿色小圆点。红色「正在重新连接…」表示网络断了，会自动重连，不用刷新。",
            "在主持人面板选好：语言、主题、关卡、获奖人数。",
            "用自己的手机扫一下二维码，确认能加入，然后在玩家列表里点「移除」把自己删掉。",
          ],
          "玩家手机需要能访问这台服务器（同一个 Wi-Fi，或服务器部署在公网）。",
        ],
      },
      {
        title: "2. 进行抽奖",
        visuals: ["flow", "drop", "phones", "game", "winner"],
        body: [
          [
            "大厅：观众扫码，输入名字（最多 8 个字）并选一个表情。大屏幕会实时显示加入的玩家。",
            "人到齐后点「开始游戏」。所有球同时从顶部落下。",
            "球一到底部就定输赢：落进中间的 WIN 区就晋级，否则爆炸出局。",
            "下一轮会自动开始。人越少，音乐越快，WIN 区越窄，关键时刻会慢动作。",
            "如果一轮里没有任何球进 WIN 区，会自动重来，没有人出局。",
            "骤死赛（可选）：从第 3 轮起 WIN 区只剩一格，这时若无人进洞，就不再无限重来，而是进入「骤死赛！先进洞者获胜！」。没进洞的球立刻从顶部重新掉落，第一个进 WIN 区的人获胜。其余骤死赛玩家按球当时的高度排名（越低越靠前），之前轮次淘汰的玩家排名不变。",
            "决出胜者后，大屏幕放礼花，并显示领奖台（前 N 名）和后面 5 名。",
          ],
        ],
      },
      {
        title: "3. 按钮说明",
        visuals: ["operator"],
        body: [
          [
            "关卡（仅大厅可改）：经典、炮火交叉、午餐托盘——障碍不同，混乱程度不同。",
            "获奖人数（仅大厅可改）：1–5 人，决定最后领奖台的大小。",
            "骤死赛（随时可改）：勾选后，最后一轮无人进洞时进入骤死赛。比赛卡在不断重来时也可以中途勾选；取消勾选不会中止已经开始的骤死赛。",
            "语言（随时可改）：同时切换大屏幕和所有玩家手机的语言，包括语音播报。",
            "主题（随时可改）：同时切换大屏幕和所有玩家手机的外观和声音。比赛中途也可以切。",
            "开始游戏：大厅里有玩家时才能点。",
            "重新开始比赛：回到大厅，保留所有玩家，可以再抽一次。",
            "全部重置：清空一切，包括所有玩家。",
            "移除：把某个玩家踢出（比如名字不合适、重复加入）。",
          ],
        ],
      },
      {
        title: "4. 主题",
        visuals: ["themes"],
        body: [
          [
            "霓虹：默认风格，电子音效和音乐。",
            "万圣节：墓地夜景、南瓜灯钉子、飞舞的蝙蝠和幽灵、闪电、哥特字体、万圣节音乐和音效，手机上优先显示万圣节表情。",
          ],
          "切换主题时音乐会平滑过渡到新主题的版本。万圣节的英文标题使用恐怖字体，中文标题保持普通字体。",
        ],
      },
      {
        title: "5. 测试（调试工具）",
        body: [
          [
            "「添加 5 / 40 个测试用户」可以在没有观众时彩排整个流程。",
            "正式开始前一定要点「全部重置」，清掉测试用户。",
            "「名字审核」会用 AI 过滤不当名字，需要服务器配置 OpenAI 密钥，默认关闭。",
          ],
        ],
      },
      {
        title: "6. 常见问题",
        body: [
          [
            "没有声音：点一下大屏幕（开启声音），检查右下角喇叭按钮没有静音，再检查电脑音量和输出设备。",
            "有音效但没有音乐：通常是还没点大屏幕开启声音，或右下角喇叭被静音了。两个主题的音乐都随代码一起部署，不需要另外拷贝。",
            "手机加入不了：确认手机和服务器网络互通；二维码下方显示的网址就是加入地址，可以手动输入。",
            "大屏幕卡住或显示异常：直接刷新大屏幕页面，游戏状态保存在服务器上，不会丢。",
            "有人加入了两次或名字不合适：在玩家列表里点「移除」。",
          ],
        ],
      },
      {
        title: "7. 素材版权",
        body: [
          "所有音频都可自由使用。霓虹主题的音乐和音效均为 CC0（public/sounds/default/CREDITS.md）。万圣节音乐使用了以下作品（其余音效为 CC0 / 公有领域，完整清单见 public/sounds/halloween/CREDITS.md）：",
          [
            "“Graveyard Shift”、“Danse Macabre” — Kevin MacLeod (incompetech.com)，CC BY 3.0",
            "“Toccata und Fuge d-moll, BWV 565”（巴赫）— 管风琴演奏 Norbert Schenk，CC BY 4.0",
            "“In the Hall of the Mountain King”（格里格）— Musopen Symphony，公有领域",
            "万圣节背景图由 AI 生成；表情图为 Twemoji（CC BY 4.0）；字体 Creepster（SIL OFL）。",
          ],
        ],
      },
    ],
  },
  en: {
    title: "Operator Guide",
    intro:
      "A LuckyDrop draw runs on three screens: the big screen, players' phones, and this operator panel. Here's the whole flow from setup to prizes.",
    back: "← Back to operator panel",
    urlsTitle: "The three URLs",
    urls: {
      display: "Big screen (projector / TV)",
      join: "Player join page (what the QR code on the big screen opens)",
      operator: "Operator panel (use your phone)",
    },
    fig: {
      screens: {
        server: "Server",
        display: "Big screen",
        phones: "Players",
        operator: "Operator",
        wifi: "Every device talks to the same server in real time",
      },
      flow: [
        { icon: "📱", title: "Scan to join", desc: "Guests scan the QR code, enter a name and pick an emoji" },
        { icon: "▶️", title: "Start Game", desc: "You tap Start Game and every ball drops at once" },
        { icon: "🎯", title: "WIN zone advances", desc: "Anywhere else explodes and is out", loop: "repeat while players remain" },
        { icon: "🏆", title: "Prizes", desc: "Confetti and a podium of your top N, plus the next 5" },
      ],
      drop: { win: "WIN", out: "OUT", advance: "Advance!", caption: "Decided the moment a ball hits the bottom: only the centre WIN zone advances." },
      lobby: "Lobby: QR code in the middle, live demo left, players who’ve joined right",
      phoneJoin: "On the phone: name + emoji",
      phoneWaiting: "After joining: “watch the big screen”",
      game: "Mid-match: remaining players left, eliminated right",
      winner: "Finish: the podium plus the next 5",
      operator: "The operator panel (on a phone)",
      themes: { neon: "Neon", halloween: "Halloween", alt: "The same match in both themes", phones: "Phone join page: Neon / Halloween" },
    },
    sections: [
      {
        title: "1. Before guests arrive",
        visuals: ["screens", "lobby"],
        body: [
          [
            "Open the big-screen URL on the projector or TV and make it full screen (⌃⌘F on Mac, F11 on Windows).",
            "Click “Tap to enable sound” on the big screen once — browsers won’t play music or effects until you do.",
            "Check the small dot bottom-left is green. A red “Reconnecting…” pill means the network dropped; it heals itself, no refresh needed.",
            "On this panel, set the language, theme, level and number of prize winners.",
            "Scan the QR code with your own phone to check joining works, then tap Remove next to yourself.",
          ],
          "Players’ phones must be able to reach this server (same Wi-Fi, or a public deployment).",
        ],
      },
      {
        title: "2. Running the draw",
        visuals: ["flow", "drop", "phones", "game", "winner"],
        body: [
          [
            "Lobby: guests scan, enter a name (up to 8 characters) and pick an emoji. They appear on the big screen as they join.",
            "When everyone’s in, tap Start Game. Every ball drops at once.",
            "The moment a ball reaches the bottom it’s decided: in the centre WIN zone it advances, anywhere else it explodes and is out.",
            "The next round starts automatically. As the field shrinks the music speeds up, the WIN zone narrows and slow-motion kicks in for big moments.",
            "If no ball lands in the WIN zone, the round replays automatically and nobody is eliminated.",
            "Sudden death (optional): from round 3 the WIN zone is a single slot. If a round there ends with nobody in, instead of replaying forever the big screen shows “SUDDEN DEATH! FIRST ONE WINS!”. A ball that misses drops straight back in from the top, and the first ball into WIN wins. Everyone else in sudden death is ranked by how far down their ball was at that moment (lowest = 2nd); players knocked out in earlier rounds keep their normal ranking.",
            "When it’s decided, the big screen throws confetti and shows the podium (your top N) plus the next 5.",
          ],
        ],
      },
      {
        title: "3. Controls",
        visuals: ["operator"],
        body: [
          [
            "Level (lobby only): Classic, Cannon Crossfire or Lunch Tray — different obstacles, different chaos.",
            "Prize winners (lobby only): 1–5, the size of the podium at the finish.",
            "Sudden death (any time): when ticked, a no-winner final round goes to sudden death. You can tick it mid-match to rescue a final that keeps replaying; unticking doesn’t stop a sudden death already running.",
            "Language (any time): switches the big screen, every phone and the spoken announcements.",
            "Theme (any time): restyles the big screen and every phone, sounds included. Works mid-match.",
            "Start Game: only available in the lobby with at least one player.",
            "Restart Match: back to the lobby with every player kept, ready to draw again.",
            "Reset All: clears everything, players included.",
            "Remove: kicks one player (duplicate join, inappropriate name).",
          ],
        ],
      },
      {
        title: "4. Themes",
        visuals: ["themes"],
        body: [
          [
            "Neon: the default look, with techno effects and music.",
            "Halloween: graveyard night scene, jack-o’-lantern pegs, flying bats and ghosts, lightning, a creepy title font, Halloween music and sounds, and spooky emojis first on phones.",
          ],
          "Switching theme crossfades the music to the new theme’s version. The creepy font only covers English text; Chinese titles stay in the normal font.",
        ],
      },
      {
        title: "5. Rehearsing (Debug Tools)",
        body: [
          [
            "Add 5 / Add 40 Test Users lets you rehearse the whole draw with no audience.",
            "Always tap Reset All before the real draw to clear the test users.",
            "Name Check filters inappropriate names with AI. It needs an OpenAI key on the server and is off by default.",
          ],
        ],
      },
      {
        title: "6. Troubleshooting",
        body: [
          [
            "No sound: click the big screen once (enables sound), check the speaker button bottom-right isn’t muted, then check the computer’s volume and output device.",
            "Effects but no music: usually the big screen hasn’t been clicked to enable sound yet, or the speaker button is muted. Both themes’ music deploys with the code — nothing to copy over.",
            "Phones can’t join: make sure phones can reach the server. The URL under the QR code is the join address — it can be typed in by hand.",
            "Big screen frozen or glitchy: just refresh it. Game state lives on the server, nothing is lost.",
            "Someone joined twice or picked a bad name: tap Remove in the player list.",
          ],
        ],
      },
      {
        title: "7. Credits",
        body: [
          "All audio is free to use. The Neon music and effects are all CC0 (public/sounds/default/CREDITS.md). The Halloween music uses these works (its sound effects are CC0 / public domain; full list in public/sounds/halloween/CREDITS.md):",
          [
            "“Graveyard Shift” and “Danse Macabre” by Kevin MacLeod (incompetech.com), CC BY 3.0",
            "“Toccata und Fuge d-moll, BWV 565” (J. S. Bach), organ recording by Norbert Schenk, CC BY 4.0",
            "“In the Hall of the Mountain King” (Grieg), Musopen Symphony, public domain",
            "Halloween backdrops are AI-generated; emoji art is Twemoji (CC BY 4.0); the Creepster font is SIL OFL.",
          ],
        ],
      },
    ],
  },
};

export default function OperatorGuidePage() {
  const { lang } = useLang();
  useServerLang();
  const g = GUIDE[lang];
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    document.title = `${g.title} · LuckyDrop`;
  }, [g.title]);

  useEffect(() => {
    setOrigin(`${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH || ""}`);
  }, []);

  return (
    <main className="min-h-dvh bg-[#0F172A] px-5 py-8 text-slate-200">
      <div className="mx-auto max-w-2xl space-y-8">
        <Link href="/operator" className="inline-block py-2 text-sm text-slate-400 hover:text-white">
          {g.back}
        </Link>

        <header className="space-y-3">
          <h1 className="text-3xl font-black text-white">{g.title}</h1>
          <p className="text-base leading-relaxed text-slate-300">{g.intro}</p>
        </header>

        <section className="space-y-3 rounded-xl border border-slate-700 bg-slate-800 p-5">
          <h2 className="text-xl font-bold text-white">{g.urlsTitle}</h2>
          <dl className="space-y-3 text-sm">
            {(
              [
                ["display", "/"],
                ["join", "/join"],
                ["operator", "/operator"],
              ] as const
            ).map(([key, path]) => (
              <div key={key}>
                <dt className="text-slate-400">{g.urls[key]}</dt>
                <dd className="break-all font-mono text-emerald-300">{origin ? `${origin}${path}` : path}</dd>
              </div>
            ))}
          </dl>
        </section>

        {g.sections.map((s) => (
          <section key={s.title} className="space-y-4">
            <h2 className="text-xl font-bold text-white">{s.title}</h2>
            {s.body.map((block, i) =>
              Array.isArray(block) ? (
                <ul key={i} className="list-disc space-y-2 pl-5 leading-relaxed">
                  {block.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p key={i} className="leading-relaxed text-slate-400">
                  {block}
                </p>
              )
            )}
            {s.visuals?.map((v) => (
              <Reveal key={v}>
                <GuideVisual id={v} lang={lang} fig={g.fig} />
              </Reveal>
            ))}
          </section>
        ))}

        <Link href="/operator" className="inline-block py-2 text-sm text-slate-400 hover:text-white">
          {g.back}
        </Link>
      </div>
    </main>
  );
}

function GuideVisual({ id, lang, fig }: { id: Visual; lang: "zh" | "en"; fig: Figures }) {
  // Screenshots come from scripts/guide-shots.mjs, one set per language
  const img = (name: string) => `/guide/${lang}/${name}.jpg`;
  switch (id) {
    case "screens":
      return <ScreensDiagram labels={fig.screens} />;
    case "lobby":
      return <Shot src={img("neon-display-lobby")} alt={fig.lobby} caption={fig.lobby} />;
    case "flow":
      return <FlowDiagram steps={fig.flow} />;
    case "drop":
      return (
        <div className="space-y-2">
          <DropDemo labels={fig.drop} />
          <p className="text-center text-sm text-slate-400">{fig.drop.caption}</p>
        </div>
      );
    case "phones":
      return (
        <div className="grid grid-cols-2 gap-4">
          <Shot kind="phone" src={img("neon-phone-join")} alt={fig.phoneJoin} caption={fig.phoneJoin} />
          <Shot kind="phone" src={img("neon-phone-waiting")} alt={fig.phoneWaiting} caption={fig.phoneWaiting} />
        </div>
      );
    case "game":
      return <Shot src={img("neon-display-game")} alt={fig.game} caption={fig.game} />;
    case "winner":
      return <Shot src={img("neon-display-winner")} alt={fig.winner} caption={fig.winner} />;
    case "operator":
      return <Shot kind="phone" src={img("operator-panel")} alt={fig.operator} caption={fig.operator} />;
    case "themes":
      return (
        <div className="space-y-6">
          <Crossfade
            a={img("neon-display-game")}
            b={img("halloween-display-game")}
            labelA={fig.themes.neon}
            labelB={fig.themes.halloween}
            alt={fig.themes.alt}
          />
          <div className="grid grid-cols-2 gap-4">
            <Shot kind="phone" src={img("neon-phone-join")} alt={fig.themes.neon} caption={fig.themes.neon} />
            <Shot kind="phone" src={img("halloween-phone-join")} alt={fig.themes.halloween} caption={fig.themes.halloween} />
          </div>
        </div>
      );
  }
}
