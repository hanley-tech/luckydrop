import localFont from "next/font/local";

/** Creepster (SIL OFL, Font Diner) — Halloween theme display face.
 *  Latin only: Chinese text falls back to the default font. */
export const creepster = localFont({
  src: "../app/fonts/Creepster-Regular.ttf",
  variable: "--font-creepster",
  weight: "400",
  display: "swap",
});
