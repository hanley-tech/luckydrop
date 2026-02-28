import { EmojiId } from "@/types";

export interface BallEmoji {
  id: EmojiId;
  emoji: string;
  name: string;
  bgColor: string;
}

export const BALL_EMOJIS: BallEmoji[] = [
  // Animals
  { id: "dog", emoji: "\u{1F436}", name: "Dog", bgColor: "#F59E0B" },
  { id: "cat", emoji: "\u{1F431}", name: "Cat", bgColor: "#F97316" },
  { id: "fox", emoji: "\u{1F98A}", name: "Fox", bgColor: "#F97316" },
  { id: "lion", emoji: "\u{1F981}", name: "Lion", bgColor: "#F59E0B" },
  { id: "wolf", emoji: "\u{1F43A}", name: "Wolf", bgColor: "#94A3B8" },
  { id: "bear", emoji: "\u{1F43B}", name: "Bear", bgColor: "#92400E" },
  { id: "panda", emoji: "\u{1F43C}", name: "Panda", bgColor: "#F8FAFC" },
  { id: "monkey", emoji: "\u{1F435}", name: "Monkey", bgColor: "#92400E" },
  { id: "unicorn", emoji: "\u{1F984}", name: "Unicorn", bgColor: "#A855F7" },
  { id: "dragon", emoji: "\u{1F409}", name: "Dragon", bgColor: "#22C55E" },
  { id: "owl", emoji: "\u{1F989}", name: "Owl", bgColor: "#92400E" },
  { id: "penguin", emoji: "\u{1F427}", name: "Penguin", bgColor: "#1E293B" },
  { id: "dolphin", emoji: "\u{1F42C}", name: "Dolphin", bgColor: "#06B6D4" },
  { id: "octopus", emoji: "\u{1F419}", name: "Octopus", bgColor: "#EC4899" },
  { id: "butterfly", emoji: "\u{1F98B}", name: "Butterfly", bgColor: "#A855F7" },
  { id: "turtle", emoji: "\u{1F422}", name: "Turtle", bgColor: "#22C55E" },
  // Objects & symbols
  { id: "rocket", emoji: "\u{1F680}", name: "Rocket", bgColor: "#EF4444" },
  { id: "fire", emoji: "\u{1F525}", name: "Fire", bgColor: "#F97316" },
  { id: "star", emoji: "\u{2B50}", name: "Star", bgColor: "#ECD510" },
  { id: "lightning", emoji: "\u{26A1}", name: "Lightning", bgColor: "#F59E0B" },
  { id: "heart", emoji: "\u{2764}\u{FE0F}", name: "Heart", bgColor: "#EC4899" },
  { id: "diamond", emoji: "\u{1F48E}", name: "Diamond", bgColor: "#06B6D4" },
  { id: "crown", emoji: "\u{1F451}", name: "Crown", bgColor: "#F59E0B" },
  { id: "rainbow", emoji: "\u{1F308}", name: "Rainbow", bgColor: "#8B5CF6" },
  { id: "sun", emoji: "\u{2600}\u{FE0F}", name: "Sun", bgColor: "#ECD510" },
  { id: "moon", emoji: "\u{1F319}", name: "Moon", bgColor: "#6366F1" },
  { id: "snowflake", emoji: "\u{2744}\u{FE0F}", name: "Snowflake", bgColor: "#06B6D4" },
  { id: "clover", emoji: "\u{1F340}", name: "Clover", bgColor: "#22C55E" },
  { id: "mushroom", emoji: "\u{1F344}", name: "Mushroom", bgColor: "#EF4444" },
  { id: "cherry", emoji: "\u{1F352}", name: "Cherry", bgColor: "#EF4444" },
  // Faces & fun
  { id: "ghost", emoji: "\u{1F47B}", name: "Ghost", bgColor: "#94A3B8" },
  { id: "alien", emoji: "\u{1F47D}", name: "Alien", bgColor: "#22C55E" },
  { id: "robot", emoji: "\u{1F916}", name: "Robot", bgColor: "#94A3B8" },
  { id: "skull", emoji: "\u{1F480}", name: "Skull", bgColor: "#F8FAFC" },
  { id: "clown", emoji: "\u{1F921}", name: "Clown", bgColor: "#EF4444" },
  { id: "devil", emoji: "\u{1F608}", name: "Devil", bgColor: "#8B5CF6" },
  { id: "angel", emoji: "\u{1F607}", name: "Angel", bgColor: "#ECD510" },
  { id: "cool", emoji: "\u{1F60E}", name: "Cool", bgColor: "#3B82F6" },
  { id: "nerd", emoji: "\u{1F913}", name: "Nerd", bgColor: "#6366F1" },
  { id: "party", emoji: "\u{1F973}", name: "Party", bgColor: "#EC4899" },
  // Sports & activities
  { id: "soccer", emoji: "\u{26BD}", name: "Soccer", bgColor: "#F8FAFC" },
  { id: "basketball", emoji: "\u{1F3C0}", name: "Basketball", bgColor: "#F97316" },
  { id: "football", emoji: "\u{1F3C8}", name: "Football", bgColor: "#92400E" },
  { id: "tennis", emoji: "\u{1F3BE}", name: "Tennis", bgColor: "#84CC16" },
  { id: "dice", emoji: "\u{1F3B2}", name: "Dice", bgColor: "#F8FAFC" },
  { id: "guitar", emoji: "\u{1F3B8}", name: "Guitar", bgColor: "#EF4444" },
  { id: "trophy", emoji: "\u{1F3C6}", name: "Trophy", bgColor: "#F59E0B" },
  { id: "medal", emoji: "\u{1F3C5}", name: "Medal", bgColor: "#F59E0B" },
  // More animals
  { id: "frog", emoji: "\u{1F438}", name: "Frog", bgColor: "#22C55E" },
  { id: "shark", emoji: "\u{1F988}", name: "Shark", bgColor: "#3B82F6" },
  { id: "bat", emoji: "\u{1F987}", name: "Bat", bgColor: "#6366F1" },
  { id: "pig", emoji: "\u{1F437}", name: "Pig", bgColor: "#F9A8D4" },
  { id: "chicken", emoji: "\u{1F414}", name: "Chicken", bgColor: "#F59E0B" },
  { id: "snake", emoji: "\u{1F40D}", name: "Snake", bgColor: "#22C55E" },
  { id: "bee", emoji: "\u{1F41D}", name: "Bee", bgColor: "#ECD510" },
  { id: "ladybug", emoji: "\u{1F41E}", name: "Ladybug", bgColor: "#EF4444" },
  { id: "crab", emoji: "\u{1F980}", name: "Crab", bgColor: "#EF4444" },
  { id: "squid", emoji: "\u{1F991}", name: "Squid", bgColor: "#EC4899" },
  { id: "trex", emoji: "\u{1F996}", name: "T-Rex", bgColor: "#22C55E" },
  { id: "gorilla", emoji: "\u{1F98D}", name: "Gorilla", bgColor: "#6B7280" },
  // Food & drink
  { id: "pizza", emoji: "\u{1F355}", name: "Pizza", bgColor: "#F59E0B" },
  { id: "taco", emoji: "\u{1F32E}", name: "Taco", bgColor: "#F97316" },
  { id: "donut", emoji: "\u{1F369}", name: "Donut", bgColor: "#EC4899" },
  { id: "icecream", emoji: "\u{1F366}", name: "Ice Cream", bgColor: "#F9A8D4" },
  { id: "hotdog", emoji: "\u{1F32D}", name: "Hot Dog", bgColor: "#F59E0B" },
  { id: "avocado", emoji: "\u{1F951}", name: "Avocado", bgColor: "#84CC16" },
  { id: "watermelon", emoji: "\u{1F349}", name: "Watermelon", bgColor: "#22C55E" },
  { id: "peach", emoji: "\u{1F351}", name: "Peach", bgColor: "#F97316" },
  // More fun
  { id: "poop", emoji: "\u{1F4A9}", name: "Poop", bgColor: "#92400E" },
  { id: "ufo", emoji: "\u{1F6F8}", name: "UFO", bgColor: "#6366F1" },
  { id: "bomb", emoji: "\u{1F4A3}", name: "Bomb", bgColor: "#1E293B" },
  { id: "tornado", emoji: "\u{1F32A}\u{FE0F}", name: "Tornado", bgColor: "#94A3B8" },
  { id: "volcano", emoji: "\u{1F30B}", name: "Volcano", bgColor: "#EF4444" },
  { id: "crystal", emoji: "\u{1F52E}", name: "Crystal Ball", bgColor: "#8B5CF6" },
  { id: "joystick", emoji: "\u{1F579}\u{FE0F}", name: "Joystick", bgColor: "#EF4444" },
  { id: "ninja", emoji: "\u{1F977}", name: "Ninja", bgColor: "#1E293B" },
  { id: "zombie", emoji: "\u{1F9DF}", name: "Zombie", bgColor: "#84CC16" },
  { id: "vampire", emoji: "\u{1F9DB}", name: "Vampire", bgColor: "#8B5CF6" },
  { id: "mermaid", emoji: "\u{1F9DC}", name: "Merperson", bgColor: "#06B6D4" },
  { id: "wizard", emoji: "\u{1F9D9}", name: "Wizard", bgColor: "#8B5CF6" },
  { id: "fairy", emoji: "\u{1F9DA}", name: "Fairy", bgColor: "#EC4899" },
  { id: "astronaut", emoji: "\u{1F9D1}\u{200D}\u{1F680}", name: "Astronaut", bgColor: "#F8FAFC" },
  { id: "pirate", emoji: "\u{1F3F4}\u{200D}\u{2620}\u{FE0F}", name: "Pirate", bgColor: "#1E293B" },
  { id: "eyes", emoji: "\u{1F440}", name: "Eyes", bgColor: "#F8FAFC" },
  { id: "monocle", emoji: "\u{1F9D0}", name: "Monocle", bgColor: "#F59E0B" },
  { id: "hot", emoji: "\u{1F975}", name: "Hot Face", bgColor: "#EF4444" },
  { id: "cold", emoji: "\u{1F976}", name: "Cold Face", bgColor: "#06B6D4" },
  { id: "mindblown", emoji: "\u{1F92F}", name: "Mind Blown", bgColor: "#F59E0B" },
  { id: "money", emoji: "\u{1F911}", name: "Money Face", bgColor: "#22C55E" },
  { id: "rage", emoji: "\u{1F92C}", name: "Rage", bgColor: "#EF4444" },
  { id: "shush", emoji: "\u{1F92B}", name: "Shush", bgColor: "#F59E0B" },
];

export function getEmoji(id: EmojiId): string {
  return BALL_EMOJIS.find((e) => e.id === id)?.emoji ?? "\u{1F680}";
}

export function getEmojiBgColor(id: EmojiId): string {
  return BALL_EMOJIS.find((e) => e.id === id)?.bgColor ?? "#3B82F6";
}
