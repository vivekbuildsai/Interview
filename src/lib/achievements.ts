import type { AchievementDef } from "./types"

// Every achievement is a pure predicate over real, tracked activity --
// nothing here is ever unlocked just to make the UI look populated.
export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: "first-steps",
    title: "First Steps",
    description: "Complete your first practice session.",
    icon: "Footprints",
    check: (ctx) => ctx.totalSessions >= 1,
  },
  {
    id: "ten-correct",
    title: "Getting Sharp",
    description: "Answer 10 questions correctly.",
    icon: "Target",
    check: (ctx) => ctx.totalCorrect >= 10,
  },
  {
    id: "fifty-correct",
    title: "On a Roll",
    description: "Answer 50 questions correctly.",
    icon: "Flame",
    check: (ctx) => ctx.totalCorrect >= 50,
  },
  {
    id: "hundred-correct",
    title: "Relentless",
    description: "Answer 100 questions correctly.",
    icon: "Swords",
    check: (ctx) => ctx.totalCorrect >= 100,
  },
  {
    id: "perfect-session",
    title: "Flawless Run",
    description: "Finish a session with 100% accuracy.",
    icon: "Gem",
    check: (ctx) => ctx.perfectSessions >= 1,
  },
  {
    id: "streak-3",
    title: "Building Momentum",
    description: "Practice on 3 consecutive days.",
    icon: "CalendarCheck",
    check: (ctx) => ctx.bestStreak >= 3,
  },
  {
    id: "streak-7",
    title: "Week-Long Warrior",
    description: "Practice on 7 consecutive days.",
    icon: "CalendarHeart",
    check: (ctx) => ctx.bestStreak >= 7,
  },
  {
    id: "multi-domain",
    title: "Full Stack of Knowledge",
    description: "Play games from at least 2 different domains.",
    icon: "LayoutGrid",
    check: (ctx) => ctx.gamesPlayed.size >= 2,
  },
  {
    id: "extreme-clear",
    title: "Into the Extreme",
    description: "Clear a session on Extreme difficulty.",
    icon: "Skull",
    check: (ctx) => ctx.difficultiesCleared.has("extreme"),
  },
  {
    id: "topic-master",
    title: "Topic Mastery",
    description: "Reach 90%+ accuracy on a topic with 5+ attempts.",
    icon: "Crown",
    check: (ctx) => ctx.masteredTopics.size >= 1,
  },
]
