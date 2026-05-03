import { loadFont as loadCinzel } from "@remotion/google-fonts/Cinzel";
import { loadFont as loadCormorant } from "@remotion/google-fonts/CormorantGaramond";

export const cinzel = loadCinzel("normal", { weights: ["400", "600", "700"] });
export const cormorant = loadCormorant("normal", {
  weights: ["300", "400", "500"],
  subsets: ["latin"],
});
