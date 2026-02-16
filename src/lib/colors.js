/**
 * Credits & Thanks to
 * Developer = Lucky Archz ( Zann )
 * Lead owner = HyuuSATAN
 * Owner = Keisya
 * Designer = Danzzz
 * Wileys = Penyedia baileys
 * Penyedia API
 * Penyedia Scraper
 *
 * JANGAN HAPUS/GANTI CREDITS & THANKS TO
 *
 * Saluran Resmi Ourin:
 * https://whatsapp.com/channel/0029VbB37bgBfxoAmAlsgE0t
 *
 */

const chalk = require("chalk");
const gradient = require("gradient-string");
const timeHelper = require("./timeHelper");
const bannerGradient = gradient(["#FF0080", "#7928CA", "#0070F3", "#00FF00"]);
const titleGradient = gradient(["#00FF00", "#0070F3"]);
const theme = {
  // Colors
  primary: chalk.hex("#00FF00"), // Bright Green (Highlights)
  secondary: chalk.hex("#9B30FF"), // Phantom Purple (Accents)
  text: chalk.hex("#FFFFFF"), // White (Main Text)
  dim: chalk.hex("#808080"), // Gray (Secondary Text)

  // Status Colors
  success: chalk.green,
  error: chalk.red.bold,
  warning: chalk.yellow,
  info: chalk.blue,
  debug: chalk.gray,

  // UI Elements
  border: chalk.hex("#404040"), // Dark Gray (Borders)
  icon: chalk.hex("#00FF00"), // Green (Icons)
};

const BOX = {
  tl: "╭",
  tr: "╮",
  bl: "╰",
  br: "╯",
  h: "─",
  v: "│",
  cross: "┼",
  arrow: "➜",
  bullet: "•",
};

/**
 * Modern ASCII Banner
 */
const ASCII_ART = `
  ██████╗ ██╗   ██╗██████╗ ██╗███╗   ██╗     █████╗ ██╗ 
 ██╔═══██╗██║   ██║██╔══██╗██║████╗  ██║    ██╔══██╗██║ 
 ██║   ██║██║   ██║██████╔╝██║██╔██╗ ██║    ███████║██║ 
 ██║   ██║██║   ██║██╔══██╗██║██║╚██╗██║    ██╔══██║██║ 
 ╚██████╔╝╚██████╔╝██║  ██║██║██║ ╚████║    ██║  ██║██║ 
  ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝    ╚═╝  ╚═╝╚═╝ 
`;

const MINI_ART = `
 ┌─────────────────────────────────┐
 │  OURIN-AI • WhatsApp MD Bot     │
 └─────────────────────────────────┘
`;

/**
 * Format timestamp
 */
function getTimestamp() {
  return theme.dim(timeHelper.formatTime("HH:mm:ss"));
}

/**
 * Logger Implementation
 */
const logger = {
  info: (msg, detail = "") => {
    console.log(`${theme.info("ℹ")} ${theme.text(msg)} ${theme.dim(detail)}`);
  },

  success: (msg, detail = "") => {
    console.log(
      `${theme.success("✔")} ${theme.text(msg)} ${theme.dim(detail)}`,
    );
  },

  warn: (msg, detail = "") => {
    console.log(
      `${theme.warning("⚠")} ${theme.warning(msg)} ${theme.dim(detail)}`,
    );
  },

  error: (msg, detail = "") => {
    console.log(`${theme.error("✖")} ${theme.error(msg)} ${theme.dim(detail)}`);
  },

  system: (msg, detail = "") => {
    console.log(
      `${theme.secondary("⚙")} ${theme.secondary(msg)} ${theme.dim(detail)}`,
    );
  },

  debug: (msg, detail = "") => {
    console.log(
      `${theme.debug("🐛")} ${theme.debug(msg)} ${theme.dim(detail)}`,
    );
  },

  tag: (tag, msg, detail = "") => {
    const tagStyled = chalk.bgHex("#333333").hex("#00FF00").bold(` ${tag} `);
    console.log(`${tagStyled} ${theme.text(msg)} ${theme.dim(detail)}`);
  },
};

/**
 * Log chat message with modern styling
 */
/**
 * Log chat message with modern styling
 * @param {Object} info - Message info
 */
function logMessage(info) {
  if (typeof info === "string") {
    const [chatType, sender, message] = arguments;
    info = {
      chatType,
      sender,
      message,
      pushName: sender,
      groupName: chatType === "group" ? "UNKNOWN GROUP" : "PRIVATE",
    };
  }

  const { chatType, groupName, pushName, sender, message } = info;

  if (!message || message.trim() === "" || !sender) return;

  // Format Group Name / Private
  const headerTitle = chatType === "group" ? `GRUP: ${groupName}` : "PRIVATE";
  const headerTitleStyled =
    chatType === "group"
      ? chalk.bold.hex("#9B30FF")(headerTitle)
      : chalk.bold.green(headerTitle);
  const senderNumber = sender.replace("@s.whatsapp.net", "");
  const time = getTimestamp();
  const cleanMsg =
    message.replace(/\n/g, " ").substring(0, 100) +
    (message.length > 100 ? "..." : "");
  console.log("");
  console.log(
    theme.border("╭──────────────────────────────────────────────────╮"),
  );
  console.log(`${theme.border("│")}  ${headerTitleStyled}`);
  console.log(
    `${theme.border("│")} ➜ ${theme.dim("Nama :")} ${theme.text(pushName)}`,
  );
  console.log(
    `${theme.border("│")} ➜ ${theme.dim("Nomor:")} ${theme.secondary(senderNumber)}`,
  );
  console.log(
    `${theme.border("│")} ➜ ${theme.dim("Pesan:")} ${chalk.white(cleanMsg)}`,
  );
  console.log(`${theme.border("│")} ➜ ${theme.dim("Time :")} ${time}`);
  console.log(
    theme.border("╰──────────────────────────────────────────────────╯"),
  );
}

/**
 * Log command execution
 */
function logCommand(command, user, chatType) {
  const type =
    chatType === "group" ? theme.secondary("GRP") : theme.primary("PVT");
  const time = getTimestamp();

  console.log("");
  console.log(
    `${theme.border("╭─")} ${theme.primary("⚡ COMMAND")} ${theme.border("────────────────────────────")}`,
  );
  console.log(
    `${theme.border("│")} ${theme.dim(BOX.bullet)} ${chalk.bold.white(command)}`,
  );
  console.log(
    `${theme.border("│")} ${theme.dim("User:")} ${chalk.cyan(user)} ${theme.dim("|")} ${type}`,
  );
  console.log(`${theme.border("╰──────────────────────────────────────────")}`);
}

/**
 * Plugin loader log
 */
function logPlugin(name, category) {
  console.log(
    `${theme.dim("├─")} ${theme.primary(name)} ${theme.dim(`(${category})`)}`,
  );
}

/**
 * Connection status log
 */
function logConnection(status, info = "") {
  const width = 50;
  const stats =
    status === "connected"
      ? chalk.green("● CONNECTED")
      : status === "connecting"
        ? chalk.yellow("◐ CONNECTING")
        : chalk.red("○ DISCONNECTED");

  console.log("");
  console.log(theme.border("═".repeat(width)));
  console.log(`  ${stats} ${theme.dim(info)}`);
  console.log(theme.border("═".repeat(width)));
}

/**
 * Error box
 */
function logErrorBox(title, message) {
  console.log("");
  console.log(
    chalk.red.bold("╔═ ERROR ══════════════════════════════════════"),
  );
  console.log(`${chalk.red("║")} ${chalk.white.bold(title)}`);
  console.log(chalk.red("╠══════════════════════════════════════════════"));
  console.log(`${chalk.red("║")} ${chalk.gray(message)}`);
  console.log(chalk.red("╚══════════════════════════════════════════════"));
}

/**
 * Print banner
 */
function printBanner(mini = false) {
  console.clear();
  console.log(mini ? gradient.pastel(MINI_ART) : bannerGradient(ASCII_ART));
  if (!mini) {
    const line = theme.border("━".repeat(60));
    console.log(line);
    console.log(
      `   ${theme.primary("WhatsApp Multi-Device Bot")} ${theme.dim("|")} ${theme.secondary("Powered by Baileys & Ourin")}`,
    );
    console.log(line);
    console.log("");
  }
}

/**
 * Startup info
 */
function printStartup(info = {}) {
  const { name, version, mode } = info;
  const table = [
    `${theme.dim("Bot Name :")} ${theme.primary(name)}`,
    `${theme.dim("Version  :")} ${theme.secondary("v" + version)}`,
    `${theme.dim("Mode     :")} ${theme.text(mode)}`,
    `${theme.dim("Prefix   :")} ${theme.text(".")}`,
  ];

  console.log(theme.border("┌── System Info ──────────────────────────┐"));
  table.forEach((row) => console.log(`${theme.border("│")} ${row}`));
  console.log(theme.border("└─────────────────────────────────────────┘"));
  console.log("");
}

/**
 * Helper to maintain backward compatibility with old CODES object
 * Maps old CODES to chalk equivalents where possible
 */
const CODES = {
  reset: "",
  bold: "",
  dim: "",
  italic: "",
  underline: "",
  green: "",
  purple: "",
  white: "",
  gray: "",
  phantom: "",
  lime: "",
  silver: "",
  red: "",
  yellow: "",
  blue: "",
  cyan: "",
  magenta: "",
  bgBlack: "",
  bgGray: "",
};

const c = {
  green: chalk.green,
  purple: chalk.hex("#9B30FF"),
  white: chalk.white,
  gray: chalk.gray,
  bold: chalk.bold,
  dim: chalk.dim,
  greenBold: (t) => chalk.green.bold(t),
  purpleBold: (t) => chalk.hex("#9B30FF").bold(t),
  whiteBold: (t) => chalk.white.bold(t),
  grayDim: (t) => chalk.gray.dim(t),
  red: chalk.red,
  yellow: chalk.yellow,
  cyan: chalk.cyan,
  blue: chalk.blue,
  magenta: chalk.magenta,
};

function divider() {
  console.log(theme.border("─".repeat(50)));
}

function createBanner(lines, color = "green") {
  const col = color === "purple" ? theme.secondary : theme.primary;
  const maxLen = Math.max(...lines.map((l) => l.length));
  const padded = lines.map((l) => l.padEnd(maxLen));

  let res = theme.border(`╭${"─".repeat(maxLen + 2)}╮`) + "\n";
  for (const line of padded) {
    res +=
      theme.border("│") +
      " " +
      chalk.white(line) +
      " " +
      theme.border("│") +
      "\n";
  }
  res += theme.border(`╰${"─".repeat(maxLen + 2)}╯`);
  return res;
}

module.exports = {
  c, // Kept for backward compatibility
  CODES, // Kept for backward compatibility
  logger,
  logMessage,
  logCommand,
  logPlugin,
  logConnection,
  logErrorBox,
  printBanner,
  printStartup,
  createBanner,
  getTimestamp,
  divider,
  theme,
  chalk,
  gradient,
};
