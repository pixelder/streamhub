export const providers = [
  { ds: "1", name: "VidLink" },
  {
    ds: "2",
    name: "VidPlay",
    settings: [
      {
        type: "version",
        switches: [
          {
            value: "2",
            active: true,
            label: "v2"
          },
          {
            value: "3",
            active: false,
            label: "v3"
          }
        ]
      }
    ]
  },
  {
    ds: "100",
    name: "Anime",
    hiddenOn: 'movie',
    settings: [
      {
        type: "format",
        switches: [
          {
            value: "sub",
            active: true,
            label: "Sub"
          },
          {
            value: "dub",
            active: false,
            label: "Dub"
          }
        ]
      }
    ]
  },
  {
    ds: "101",
    name: "Anime2",
    hiddenOn: 'movie',
    settings: [
      {
        type: "format",
        switches: [
          {
            value: "0",
            active: false,
            label: "Sub"
          },
          {
            value: "1",
            active: true,
            label: "Dub"
          }
        ]
      }
    ]
  },
  { ds: "8", name: "VidFast" },
  { ds: "6", name: "111Movies" },
  { ds: "10", name: "VidSu" },
  { ds: "11", name: "VidCore" },
  { ds: "3", name: "VidSrc" },
  {
    ds: "4",
    name: "Whvx",
    hidden: 'true'
  },
  { ds: "5", name: "VidEasy" },
  { ds: "7", name: "PrimeWire" },
  { ds: "9", name: "AutoEmbed+" }
];
