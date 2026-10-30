"use client";

// ---------------------------------------------------------------------------
// Localisation — Simplified Chinese (mainland) and English.
//
// Deliberately dependency-free and tiny. Three views (display / join /
// operator) run in separate browsers on separate devices, so the choice is
// per-device and persisted in localStorage rather than broadcast over the
// socket: the operator's phone and the projector legitimately want different
// languages, and an attendee who switches shouldn't change the big screen.
//
// Default is Chinese — this is built for mainland events.
// ---------------------------------------------------------------------------

import { useEffect, useState, useCallback } from "react";

import type { Lang } from "@/types";
export type { Lang };

export const DEFAULT_LANG: Lang = "zh";
const STORAGE_KEY = "luckydrop.lang";
const EVENT = "luckydrop:langchange";

type Dict = Record<string, string>;

const zh: Dict = {
  // brand / shared
  "app.name": "幸运掉落",
  "app.nameLucky": "幸运",
  "app.nameDrop": "掉落",

  // display — lobby
  "lobby.scanToJoin": "扫码加入！",
  "lobby.liveDemo": "演示中",
  "lobby.demoName": "演示",
  "lobby.players": "玩家",
  "lobby.waitingFirst": "等待第一位玩家加入…",
  "lobby.loading": "加载中…",
  "lobby.playersJoined": "{count} 位玩家已加入",

  // display — audio gate
  "audio.tapToEnable": "点击开启声音",
  "audio.clickAnywhere": "点击屏幕任意位置，开启音乐与音效",
  "audio.mute": "静音",
  "audio.unmute": "取消静音",

  // display — game
  "game.remaining": "剩余",
  "game.eliminated": "已淘汰",
  "game.noWinner": "无人进洞，再来一次…",
  "game.suddenDeath": "骤死赛！",
  "game.firstOneWins": "先进洞者获胜！",
  "game.suddenDeathRule": "没进洞？立刻从顶部重新掉落",
  "game.roundPre": "第 ",
  "game.roundPost": " 轮",

  // display — winner
  "winner.title": "获胜者！",
  "winner.runnersUp": "亚军榜",

  // connection
  "conn.reconnecting": "正在重新连接…",

  // join (phone)
  "join.yourName": "你的名字",
  "join.namePlaceholder": "输入名字",
  "join.pickEmoji": "选择你的表情",
  "join.submit": "加入！",
  "join.joining": "加入中…",
  "join.errNoName": "请输入名字。",
  "join.errNoEmoji": "请选择一个表情。",
  "join.errNotAllowed": "该名字不可用。",
  "join.errVerify": "无法验证名字，请重试。",
  "join.errRejected": "加入失败，请重试。",

  // waiting screen (phone)
  "wait.youreIn": "你已加入！",
  "wait.watchScreen": "请看大屏幕！",
  "wait.advanced": "你晋级了！",
  "wait.keepWatching": "继续看大屏幕…",
  "wait.alreadyJoined": "你已经加入过了！",
  "wait.youWon": "你赢了！",
  "wait.congrats": "恭喜！",
  "wait.betterLuck": "下次好运！",

  // operator
  "op.title": "控制台",
  "op.gameControl": "游戏控制",
  "op.phase": "阶段",
  "op.round": "轮次",
  "op.players": "玩家",
  "op.levelNext": "关卡（下一局）",
  "op.prizeWinners": "获奖人数",
  "op.startGame": "开始游戏",
  "op.restartMatch": "重开本局",
  "op.resetAll": "全部重置",
  "op.remove": "移除",
  "op.noPlayers": "还没有玩家加入。",
  "op.debugTools": "调试工具",
  "op.add5": "添加 5 位测试玩家",
  "op.add40": "添加 40 位测试玩家",
  "op.nameCheck": "名字审核",
  "op.language": "语言",
  "op.languageHint": "同时改变大屏幕和所有玩家手机上的语言。",
  "op.theme": "主题",
  "op.guide": "📖 主持人指南",
  "op.themeHint": "同时改变大屏幕和所有玩家手机上的外观，比赛中也可切换。",
  "op.winnerHint.one": "决出 1 位冠军，另展示 5 位亚军。",
  "op.suddenDeath": "骤死赛",
  "op.suddenDeathHint": "最后一轮（单个获胜格）若无人进洞，不再无限重来：未进洞的球立刻从顶部重新掉落，第一个进洞的人获胜。其余玩家按球的高度排名（越低越靠前）。比赛中也可开启。",
  "op.suddenDeathActive": "骤死赛进行中",
  "op.winnerHint.many": "前 {n} 名登上领奖台，另展示 5 位亚军。",

  // phases (values of gameState.phase)
  "phase.lobby": "等待中",
  "phase.dropping": "掉落中",
  "phase.recycling": "重新掉落",
  "phase.winner": "已决出获胜者",
  "op.footnote.restart": "重开本局",
  "op.footnote.restartDesc": " —— 回到等待区，保留所有玩家。 ",
  "op.footnote.reset": "全部重置",
  "op.footnote.resetDesc": " —— 清空一切，包括玩家。",

  // levels
  "level.classic.name": "经典",
  "level.classic.desc": "最原始的弹珠台 —— 全凭运气。",
  "level.cannon.name": "交叉火力",
  "level.cannon.desc": "两侧火炮乱射，弹性钉子把你弹回场内。",
  "level.tray.name": "午餐托盘",
  "level.tray.desc": "带孔的滑动托盘。掐准时机，否则被拍飞。",


  // TTS announcements (spoken on the display)
  "tts.joined": "{name} 加入了！",
  "tts.playersIn": "已有 {count} 位玩家参与！",
  "tts.gameStart": "开始！{count} 位玩家，第 1 轮。掉落！",
  "tts.roundStart": "第 {round} 轮，还剩 {count} 位玩家。掉落！",
  "tts.retry": "无人进洞！再来一次！",
  "tts.suddenDeath": "骤死赛！先进洞者获胜！",
  "tts.allAdvanced": "全部 {count} 位玩家都进洞了！再来一次！",
  "tts.roundComplete": "第 {round} 轮结束！{eliminated} 位淘汰，{advanced} 位晋级！",
  "tts.winner": "我们有获胜者了！恭喜 {name}！",
  "tts.bulkJoin": "新增 {added} 位玩家！共 {total} 位。",
  "tts.gameReset": "游戏已重置。扫描二维码加入！",
  "tts.restartMatch": "本局已重开！所有玩家回到等待区。",

  // language switcher
  "lang.label": "语言",
};

const en: Dict = {
  "app.name": "LuckyDrop",
  "app.nameLucky": "Lucky",
  "app.nameDrop": "Drop",

  "lobby.scanToJoin": "Scan to Join!",
  "lobby.liveDemo": "Live Demo",
  "lobby.demoName": "Demo",
  "lobby.players": "Players",
  "lobby.waitingFirst": "Waiting for the first player...",
  "lobby.loading": "Loading...",
  "lobby.playersJoined": "{count} players joined",

  "audio.tapToEnable": "Tap to enable sound",
  "audio.clickAnywhere": "Click anywhere on this screen to start the music & effects",
  "audio.mute": "Mute audio",
  "audio.unmute": "Unmute audio",

  "game.remaining": "Remaining",
  "game.eliminated": "Eliminated",
  "game.noWinner": "No winner! Dropping again...",
  "game.suddenDeath": "SUDDEN DEATH!",
  "game.firstOneWins": "FIRST ONE WINS!",
  "game.suddenDeathRule": "Miss and you drop straight back in from the top",
  "game.roundPre": "Round ",
  "game.roundPost": "",

  "winner.title": "WINNER!",
  "winner.runnersUp": "Runners-up",

  "conn.reconnecting": "Reconnecting…",

  "join.yourName": "Your Name",
  "join.namePlaceholder": "Enter your name",
  "join.pickEmoji": "Pick Your Emoji",
  "join.submit": "Join!",
  "join.joining": "Joining...",
  "join.errNoName": "Please enter your name.",
  "join.errNoEmoji": "Please pick an emoji.",
  "join.errNotAllowed": "Name not allowed.",
  "join.errVerify": "Could not verify name. Please try again.",
  "join.errRejected": "Join request rejected.",

  "wait.youreIn": "You're in!",
  "wait.watchScreen": "Watch the big screen!",
  "wait.advanced": "You advanced!",
  "wait.keepWatching": "Keep watching the big screen...",
  "wait.alreadyJoined": "You've already joined!",
  "wait.youWon": "YOU WON!",
  "wait.congrats": "Congratulations!",
  "wait.betterLuck": "Better luck next time!",

  "op.title": "Operator Panel",
  "op.gameControl": "Game Control",
  "op.phase": "Phase",
  "op.round": "Round",
  "op.players": "Players",
  "op.levelNext": "Level (next match)",
  "op.prizeWinners": "Prize winners",
  "op.startGame": "Start Game",
  "op.restartMatch": "Restart Match",
  "op.resetAll": "Reset All",
  "op.remove": "Remove",
  "op.noPlayers": "No players have joined yet.",
  "op.debugTools": "Debug Tools",
  "op.add5": "Add 5 Test Users",
  "op.add40": "Add 40 Test Users",
  "op.nameCheck": "Name Check",
  "op.language": "Language",
  "op.languageHint": "Changes the big screen and every player\u2019s phone.",
  "op.theme": "Theme",
  "op.guide": "📖 Operator Guide",
  "op.themeHint": "Restyles the big screen and every player\u2019s phone. Works mid-match.",
  "op.winnerHint.one": "Single champion + 5 runners-up shown at the finish.",
  "op.suddenDeath": "Sudden death",
  "op.suddenDeathHint": "If the final round (single win slot) ends with nobody in, skip the endless retries: misses drop straight back in from the top and the first ball in wins. Everyone else is ranked by how far down their ball got. Can be switched on mid-match.",
  "op.suddenDeathActive": "Sudden death in progress",
  "op.winnerHint.many": "Top {n} on the podium + 5 runners-up shown at the finish.",

  "phase.lobby": "Lobby",
  "phase.dropping": "Dropping",
  "phase.recycling": "Recycling",
  "phase.winner": "Winner",
  "op.footnote.restart": "Restart Match",
  "op.footnote.restartDesc": " — back to lobby, keep all players. ",
  "op.footnote.reset": "Reset All",
  "op.footnote.resetDesc": " — clears everything including players.",

  "level.classic.name": "Classic",
  "level.classic.desc": "The original plinko field — pure luck of the bounce.",
  "level.cannon.name": "Cannon Crossfire",
  "level.cannon.desc": "Side cannons rain mayhem; bouncy pegs slingshot you back into play.",
  "level.tray.name": "Lunch Tray",
  "level.tray.desc": "A sliding tray with holes. Time your drop or get slapped sideways.",


  "tts.joined": "{name} has joined!",
  "tts.playersIn": "{count} players in the game!",
  "tts.gameStart": "Let's go! {count} players, Round 1. Drop!",
  "tts.roundStart": "Round {round}. {count} players remain. Drop!",
  "tts.retry": "Nobody made it! Dropping again!",
  "tts.suddenDeath": "Sudden death! First one in wins!",
  "tts.allAdvanced": "All {count} players made it! Dropping again!",
  "tts.roundComplete": "Round {round} complete! {eliminated} eliminated. {advanced} advance!",
  "tts.winner": "We have a winner! Congratulations, {name}!",
  "tts.bulkJoin": "{added} players added! {total} total.",
  "tts.gameReset": "Game reset. Scan the QR code to join!",
  "tts.restartMatch": "Match restarted! All players back to lobby.",

  "lang.label": "Language",
};

const DICTS: Record<Lang, Dict> = { zh, en };

// --- store ------------------------------------------------------------------

let current: Lang = DEFAULT_LANG;
let hydrated = false;

/** Read the stored choice. Safe to call during SSR — returns the default. */
export function getLang(): Lang {
  if (typeof window === "undefined") return DEFAULT_LANG;
  if (!hydrated) {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    current = saved === "en" || saved === "zh" ? saved : DEFAULT_LANG;
    hydrated = true;
  }
  return current;
}

export function setLang(lang: Lang): void {
  current = lang;
  hydrated = true;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    window.dispatchEvent(new CustomEvent(EVENT, { detail: lang }));
  }
}

/** Translate outside React (audio.ts announcements, level metadata). */
export function tr(key: string, vars?: Record<string, string | number>): string {
  const lang = getLang();
  let out = DICTS[lang][key] ?? DICTS.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return out;
}

// --- React ------------------------------------------------------------------

/**
 * Renders with the default on the server and the stored choice after mount,
 * so the markup Next produces and the first client render agree — flipping
 * language during hydration would otherwise throw a mismatch warning.
 */
export function useLang() {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    setLangState(getLang());
    document.documentElement.lang = getLang() === "zh" ? "zh-CN" : "en";
    const onChange = (e: Event) =>
      setLangState((e as CustomEvent<Lang>).detail ?? getLang());
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      let out = DICTS[lang][key] ?? DICTS.en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          out = out.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return out;
    },
    [lang]
  );

  const change = useCallback((next: Lang) => setLang(next), []);

  return { lang, t, setLang: change };
}

/**
 * Subscribe to the server-owned language. The operator panel is the only
 * place that sets it; every other view just follows, so the projector, the
 * host's phone and every attendee's phone always agree.
 */
export function useServerLang(): void {
  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    // subscribeServerPrefs replays the latest value, so the lazy import can't
    // make us miss the one-time connect sync (which left phones on the default).
    import("@/lib/socket").then(({ subscribeServerPrefs }) => {
      if (cancelled) return;
      unsubscribe = subscribeServerPrefs(({ lang }) => {
        if (lang && lang !== getLang()) setLang(lang);
      });
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);
}
