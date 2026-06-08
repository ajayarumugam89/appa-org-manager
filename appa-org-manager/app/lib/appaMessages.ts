// Appa (= "father" in many Indian languages) themed one-liners shown when
// someone reserves the org. Keep them affectionate and SFW.

const APPA_MESSAGES = [
  '👨‍🦳 Appa is all yours now. Respect your elders — no breaking the org!',
  '🍵 Appa has been booked. He says: "Beta, deploy responsibly."',
  '🧔 You now have custody of Appa. Bring him back in one piece.',
  '📿 Appa is reserved. Touch his feet, then touch the metadata.',
  "🛺 Appa is yours for the slot. Don't make him wait at the door again.",
  '🙏 Appa blessed your booking. May your demo have zero errors.',
  '🥥 Appa is booked! Remember: he raised this org, so be gentle.',
  "👴 Appa says: \"In my day, we refreshed sandboxes uphill both ways.\"",
  '🎓 Appa is on loan to you. Make the family proud during this demo.',
  "🪔 Appa reserved. He's watching your validation rules. Always.",
  "📺 Appa booked. He'll ask later why the demo took 'so long, hmm?'",
  '🧓 You got Appa! Charge his battery (and your demo data) fully.',
];

export function randomAppaMessage(): string {
  return APPA_MESSAGES[Math.floor(Math.random() * APPA_MESSAGES.length)];
}
