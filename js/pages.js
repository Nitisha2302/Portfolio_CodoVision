/**
 * Each entry is one open-book spread.
 * Landscape mockups (1536×1024) are split across left + right leaves
 * so one image fills both sides of the book.
 */
window.CODOVISION_PAGES = [
  {
    src: "assets/pages/01-cover.png",
    title: "Portfolio & Past Work",
    section: "Intro",
    linkLayout: "stack",
    linkRegion: "cover-bottom",
    links: [
      { kind: "website", href: "https://codovision.tech/", label: "Website" },
    ],
  },
  { src: "assets/pages/03-hub.png", title: "13 Projects Hub", section: "Intro" },
  {
    src: "assets/pages/06-gday-talk.png",
    title: "G'Day Talk",
    section: "Comm",
    linkLayout: "row",
    links: [
      { kind: "appstore", href: "https://apps.apple.com/in/app/gday-talk/id6744549580", label: "App Store" },
      { kind: "playstore", href: "https://play.google.com/store/apps/details?id=com.gdaytalk", label: "Play Store" },
    ],
  },
  {
    src: "assets/pages/07-ninja.png",
    title: "Ninja Private Messenger",
    section: "Comm",
    linkLayout: "stack",
    links: [
      { kind: "appstore", href: "https://apps.apple.com/in/app/ninja-private-messenger/id6446875889", label: "App Store" },
    ],
  },
  {
    src: "assets/pages/08-tasty-punjab.png",
    title: "Tasty Punjab",
    section: "Commerce",
    linkLayout: "stack",
    linkBox: { top: "20%", height: "34%", left: "4%", width: "78%" },
    linkBoxFull: { top: "20%", height: "34%", left: "52%", width: "44%" },
    links: [
      { kind: "appstore", href: "https://apps.apple.com/in/app/tasty-punjab-au/id6475163123", label: "App Store" },
      { kind: "playstore", href: "https://play.google.com/store/search?q=Tasty%20Punjab%20AU&c=apps", label: "Play Store" },
    ],
  },
  {
    src: "assets/pages/09-qadampayk.png",
    title: "QadamPayk",
    section: "Mobility",
    linkLayout: "stack",
    links: [
      { kind: "appstore", href: "https://apps.apple.com/in/app/qadampayk/id6753160014", label: "App Store" },
      { kind: "playstore", href: "https://play.google.com/store/apps/details?id=com.qadam_payk", label: "Play Store" },
    ],
  },
  {
    src: "assets/pages/10-rohnamo.png",
    title: "Rohnamo Transport",
    section: "Mobility",
    linkLayout: "stack",
    links: [
      { kind: "playstore", href: "https://play.google.com/store/apps/details?id=tj.rohnamo.app", label: "Play Store" },
      { kind: "appstore", href: "https://apps.apple.com/in/app/rohnamo-dushanbe-transport/id6775823965", label: "App Store" },
    ],
  },
  {
    src: "assets/pages/11-efiiri.png",
    title: "eFiiri",
    section: "Mobility",
    linkLayout: "stack",
    links: [
      { kind: "playstore", href: "https://play.google.com/store/apps/details?id=com.casqi.efiiri", label: "Play Store" },
      { kind: "website", href: "https://efiriapp.com/", label: "Website" },
    ],
  },
  {
    src: "assets/pages/12-inbozor-user.png",
    title: "inBozor User",
    section: "Commerce",
    linkLayout: "stack",
    links: [
      { kind: "appstore", href: "https://apps.apple.com/in/app/inbozor/id6771488951", label: "App Store" },
      { kind: "playstore", href: "https://play.google.com/store/search?q=inBozor&c=apps", label: "Play Store" },
    ],
  },
  {
    src: "assets/pages/13-inbozor-seller.png",
    title: "inBozor Seller",
    section: "Commerce",
    linkLayout: "stack",
    links: [
      { kind: "playstore", href: "https://play.google.com/store/apps/details?id=com.inbozor_seller", label: "Play Store" },
      { kind: "appstore", href: "https://apps.apple.com/in/app/inbozor-seller/id6772361649", label: "App Store" },
    ],
  },
  {
    src: "assets/pages/14-hewie.png",
    title: "Hewie",
    section: "AI & Health",
    linkLayout: "stack",
    links: [
      { kind: "playstore", href: "https://play.google.com/store/apps/details?id=com.hewie&hl=en", label: "Play Store" },
      { kind: "appstore", href: "https://apps.apple.com/in/app/hewie/id6755109121", label: "App Store" },
      { kind: "website", href: "https://hewie.app/", label: "Website" },
    ],
  },
  { src: "assets/pages/15-usb-camera.png", title: "USB Camera Module", section: "Platform" },
  {
    src: "assets/pages/16-talent-growth.png",
    title: "My Talent Growth",
    section: "Platform",
    linkLayout: "stack",
    links: [
      { kind: "playstore", href: "https://play.google.com/store/apps/details?id=com.mytalents.growth", label: "Play Store" },
    ],
  },
  {
    src: "assets/pages/17-aimshala.png",
    title: "Aimshala",
    section: "Platform",
    linkLayout: "stack",
    links: [
      { kind: "website", href: "https://aimshala.com/", label: "Website" },
    ],
  },
  {
    src: "assets/pages/18-whats-in-it.png",
    title: "What's in it?",
    section: "AI & Health",
    linkLayout: "stack",
    links: [
      { kind: "playstore", href: "https://play.google.com/store/apps/details?id=com.nexever.whats", label: "Play Store" },
      { kind: "appstore", href: "https://apps.apple.com/in/app/whats-in-it/id1542297341", label: "App Store" },
    ],
  },
];
