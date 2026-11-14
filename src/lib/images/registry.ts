import { resolveImage, type ImageEntry } from "./resolve";

function pexels(id: number, w: number, h: number): string {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&h=${h}&dpr=1`;
}

const registry = {
  heroLivingRoom: {
    url: pexels(19689230, 1600, 900),
    alt: "Warmly lit luxury living room styled with handcrafted decor",
  },
  heroBedroom: {
    url: pexels(5824522, 1600, 900),
    alt: "Classic bedroom interior with wooden furniture and antique carpets",
  },
  heroFestive: {
    url: pexels(4094847, 1600, 900),
    alt: "Diya oil lamps arranged for an Indian festive occasion",
  },
  storyOurCraft: {
    url: pexels(10011988, 1200, 900),
    alt: "Artisan's handmade terracotta pottery on a wooden table",
  },
  storyCraftsmen: {
    url: pexels(29998352, 1200, 900),
    alt: "Handwoven textile art, close-up craftsmanship detail",
  },
  instagram1: { url: pexels(5905067, 400, 400), alt: "Framed wall art styled above a console table" },
  instagram2: { url: pexels(10699966, 400, 400), alt: "Traditional decorative rug in a home interior" },
  instagram3: { url: pexels(13613289, 400, 400), alt: "Contemporary pendant lamps in a minimalist interior" },
  instagram4: { url: pexels(19786395, 400, 400), alt: "Potted plant beside a wooden mirror" },
  instagram5: { url: pexels(12284838, 400, 400), alt: "Vintage-style living room with teal velvet sofa" },
  instagram6: { url: pexels(18688394, 400, 400), alt: "Modern minimalist home interior styling" },
} as const satisfies Record<string, ImageEntry>;

export type ImageKey = keyof typeof registry;

export function getImage(key: ImageKey): ImageEntry {
  return resolveImage(registry[key]);
}
