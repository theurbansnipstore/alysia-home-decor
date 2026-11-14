import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { slugify } from "../src/lib/utils";

const prisma = new PrismaClient();

// All image URLs below use Pexels (free for commercial use, no attribution
// required) via its stable images.pexels.com CDN. Every photo ID was
// verified via web search + direct fetch before use — none were guessed
// from memory. See PROJECT_DECISIONS.md for the lesson that made this
// verification step mandatory.
function pexels(id: number, w: number, h: number): string {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${w}&h=${h}&dpr=1`;
}

const CATEGORIES: { name: string; imageId: number }[] = [
  { name: "Wall Decor", imageId: 5905067 }, // framed wall art
  { name: "Living Room Decor", imageId: 19689230 }, // luxury living room
  { name: "Bedroom Decor", imageId: 5824522 }, // classic bedroom, wooden furniture
  { name: "Dining Decor", imageId: 1543443 }, // fine table setting
  { name: "Kitchen Accessories", imageId: 12908572 }, // tray with cups on kitchen counter
  { name: "Decorative Lighting", imageId: 13613289 }, // pendant lamps
  { name: "Artificial Plants", imageId: 5824815 }, // potted plant + framed art
  { name: "Handicrafts", imageId: 10011988 }, // handmade terracotta pottery
  { name: "Table Decor", imageId: 12127444 }, // dining table with pendant lighting
  { name: "Religious Decor", imageId: 4094847 }, // diya oil lamp
];

const THEMES: { name: string; imageId: number }[] = [
  { name: "Bengali Collection", imageId: 29998352 }, // handwoven textile art
  { name: "Marathi Collection", imageId: 10699966 }, // traditional decorative rugs
  { name: "Gujarati Collection", imageId: 10011988 }, // handmade pottery
  { name: "Muslim Collection", imageId: 5905067 }, // framed wall art
  { name: "South Indian Collection", imageId: 4094847 }, // diya oil lamp
  { name: "Punjabi Collection", imageId: 19689230 }, // luxury living room
  { name: "Rajasthani Collection", imageId: 5824522 }, // warm, ornate bedroom
  { name: "Traditional Collection", imageId: 12284838 }, // vintage-style living room
  { name: "Festival Collection", imageId: 29649754 }, // elegant dining with chandeliers
  { name: "Modern Collection", imageId: 18688394 }, // modern minimalist interior
];

const PRODUCTS: { name: string; imageId: number }[] = [
  { name: "Brass Diya Set", imageId: 4094847 },
  { name: "Madhubani Wall Art", imageId: 5905067 },
  { name: "Warli Painted Vase", imageId: 10011988 },
  { name: "Macrame Wall Hanging", imageId: 29998352 },
  { name: "Terracotta Wind Chime", imageId: 10011988 },
  { name: "Hand-carved Wooden Tray", imageId: 12908572 },
  { name: "Blue Pottery Bowl", imageId: 1543443 },
  { name: "Rattan Pendant Light", imageId: 13613289 },
  { name: "Artificial Areca Palm", imageId: 5824815 },
  { name: "Embroidered Cushion Cover", imageId: 5825398 },
  { name: "Jaipuri Mirror Frame", imageId: 19786395 },
  { name: "Bengal Kantha Table Runner", imageId: 12127444 },
];

async function main() {
  // Admin user
  const passwordHash = await bcrypt.hash("Admin@12345", 10);
  await prisma.user.upsert({
    where: { email: "admin@kutir.in" },
    update: {},
    create: {
      name: "Store Admin",
      email: "admin@kutir.in",
      passwordHash,
      role: "SUPER_ADMIN",
    },
  });

  const categories = [];
  for (const [i, { name, imageId }] of CATEGORIES.entries()) {
    const image = pexels(imageId, 600, 600);
    const cat = await prisma.category.upsert({
      where: { slug: slugify(name) },
      // Approved image-only fix: update ONLY the image URL on existing
      // rows. Name, slug, sortOrder, and every other field are untouched.
      update: { image },
      create: {
        name,
        slug: slugify(name),
        sortOrder: i,
        image,
      },
    });
    categories.push(cat);
  }

  const themes = [];
  for (const [i, { name, imageId }] of THEMES.entries()) {
    const banner = pexels(imageId, 800, 600);
    const theme = await prisma.theme.upsert({
      where: { slug: slugify(name) },
      update: { banner },
      create: {
        name,
        slug: slugify(name),
        sortOrder: i,
        banner,
      },
    });
    themes.push(theme);
  }

  for (const [i, { name, imageId }] of PRODUCTS.entries()) {
    const category = categories[i % categories.length];
    const theme = themes[i % themes.length];
    const price = 999 + i * 250;
    const url = pexels(imageId, 600, 750);
    await prisma.product.upsert({
      where: { sku: `KTR-${1000 + i}` },
      // Approved image-only fix: update only the related ProductImage's
      // url. updateMany on the nested relation updates the existing child
      // row in place — it does not delete/recreate it, so the
      // ProductImage's own id is preserved.
      update: {
        images: {
          updateMany: {
            where: {},
            data: { url },
          },
        },
      },
      create: {
        name,
        slug: slugify(name),
        description: `${name} — handcrafted piece that brings warmth and character to your space. Sustainably sourced materials, finished by independent artisans.`,
        price,
        discountPrice: i % 3 === 0 ? price - 200 : null,
        sku: `KTR-${1000 + i}`,
        categoryId: category.id,
        themeId: theme.id,
        isFeatured: i % 4 === 0,
        isBestSeller: i % 3 === 0,
        isNewArrival: i % 5 === 0,
        stockAvailable: 40 - i,
        images: {
          create: [{ url, sortOrder: 0 }],
        },
      },
    });
  }

  console.log("Seed complete. Admin login: admin@kutir.in / Admin@12345");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
