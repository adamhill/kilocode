// kilocode_change - new file
import { dict as en } from "./en"
type Keys = keyof typeof en
export const dict = {
  // Kilo Gateway provider translations
  "provider.connect.kiloGateway.line1":
    "Kilo Gateway omogućava pristup pažljivo odabranom skupu pouzdanih modela optimizovanih za rad sa agentima za kodiranje.",
  "provider.connect.kiloGateway.line2":
    "Sa jednim API ključem dobijate pristup modelima kao što su Claude, GPT, Gemini, GLM i drugi.",
  "provider.connect.kiloGateway.visit.prefix": "Posjetite ",
  "provider.connect.kiloGateway.visit.link": "kilo.ai",
  "provider.connect.kiloGateway.visit.suffix": " da preuzmete svoj API ključ.",

  // Provider dialog translations
  "dialog.provider.group.recommended": "Preporučeno",
  "dialog.provider.kilo.note": "Pristup za 500+ AI modela",
} satisfies Partial<Record<Keys, string>>
