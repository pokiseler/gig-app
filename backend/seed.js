/**
 * Seed script — populates the DB with sample users and gigs.
 *
 * Usage:
 *   node seed.js          — drop existing users & gigs then recreate
 *   node seed.js --admin  — also print the admin credentials at the end
 *
 * WARNING: clears all existing users, gigs, and reviews before seeding.
 */

'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./db');
const User = require('./models/User');
const Gig = require('./models/Gig');
const Review = require('./models/Review');

// ─── Sample data ────────────────────────────────────────────────────────────

const USERS = [
  {
    name: 'מנהל מערכת',
    email: 'admin@chalatura.co.il',
    password: 'Admin1234!',
    role: 'admin',
    balance: 9999,
    bio: 'מנהל מערכת חלתורות.',
    phone: '050-0000000',
    skills: ['ניהול', 'תמיכה'],
  },
  {
    name: 'יוסי כהן',
    email: 'yossi@example.com',
    password: 'Password1!',
    role: 'consumer',
    balance: 120,
    bio: 'מחפש עזרה בניקיון ואינסטלציה.',
    phone: '052-1111111',
    skills: [],
  },
  {
    name: 'מירה לוי',
    email: 'mira@example.com',
    password: 'Password1!',
    role: 'consumer',
    balance: 90,
    bio: 'גרה בתל אביב, צריכה עזרה בגינה.',
    phone: '054-2222222',
    skills: [],
  },
  {
    name: 'דוד ישראלי',
    email: 'david@example.com',
    password: 'Password1!',
    role: 'provider',
    balance: 60,
    bio: 'אינסטלטור מוסמך עם 10 שנות ניסיון.',
    phone: '053-3333333',
    skills: ['אינסטלציה', 'חשמל'],
  },
  {
    name: 'שירה אברהם',
    email: 'shira@example.com',
    password: 'Password1!',
    role: 'provider',
    balance: 75,
    bio: 'מנקה מקצועית, עובדת עם חומרים אקולוגיים.',
    phone: '058-4444444',
    skills: ['ניקיון'],
  },
];

const GIG_TEMPLATES = [
  {
    title: 'דרוש/ה מנקה לדירה 4 חדרים',
    description: 'אני מחפש/ת מנקה מקצועי/ת לניקיון שבועי של דירת 4 חדרים בתל אביב. יש להביא ציוד. נא ליצור קשר לתיאום.',
    category: 'ניקיון',
    city: 'תל אביב',
    address: 'רחוב דיזנגוף 100',
    tags: ['ניקיון שבועי', 'דירה'],
    tipAmount: 50,
    tipMethod: 'bit',
  },
  {
    title: 'תיקון ברז מטפטף בחדר אמבטיה',
    description: 'הברז בחדר האמבטיה מטפטף כבר שבוע. אני צריך/ה אינסטלטור שיגיע ויתקן אותו. מוכן/ה לשלם גם טיפ.',
    category: 'אינסטלציה',
    city: 'ירושלים',
    address: 'רחוב יפו 45',
    tags: ['ברז', 'תיקון'],
    tipAmount: 30,
    tipMethod: 'cash',
  },
  {
    title: 'הזזת ריהוט + הובלה קצרה',
    description: 'אני עוזב/ת דירה ברמת גן ועובר/ת לתל אביב. צריך/ה עזרה בהזזת ספה, מיטה ושולחן אוכל.',
    category: 'הובלות',
    city: 'רמת גן',
    address: 'רחוב ביאליק 12',
    tags: ['הובלה', 'ריהוט'],
    tipAmount: 0,
    tipMethod: 'cash',
  },
  {
    title: 'גיזום גינה קטנה פעם בחודש',
    description: 'יש לי גינה קטנה בחצר הבית בהרצליה. מחפש/ת מי שיגיע פעם בחודש לגזום ולסדר. שעה עבודה בערך.',
    category: 'גינון',
    city: 'הרצליה',
    address: 'שדרות רוטשילד 8',
    tags: ['גינון', 'חצר'],
    tipAmount: 20,
    tipMethod: 'cash',
  },
  {
    title: 'שיעור פרטי במתמטיקה לכיתה י׳',
    description: 'הבן שלי צריך חיזוק במתמטיקה לקראת הבגרות. מחפש/ת מורה סבלני/ת עם ניסיון. פגישה אחת לשבוע, שעה וחצי.',
    category: 'שיעורים פרטיים',
    city: 'פתח תקווה',
    address: 'רחוב הציר 30',
    tags: ['מתמטיקה', 'בגרות'],
    tipAmount: 0,
    tipMethod: 'cash',
  },
  {
    title: 'צביעת חדר שינה — צבע לבן',
    description: 'צריך/ה לצבוע חדר שינה 15 מ"ר בצבע לבן. הצבע יסופק על ידי. מחפש/ת עבודה מסודרת ונקייה.',
    category: 'צביעה',
    city: 'חיפה',
    address: 'רחוב הנמל 5',
    tags: ['צביעה', 'חדר שינה'],
    tipAmount: 40,
    tipMethod: 'bit',
  },
  {
    title: 'התקנת מדפים בסלון',
    description: 'קניתי 3 מדפי איקאה וצריך/ה מישהו שיתלה אותם בסלון. יש קדח ועוגנים. עבודה של כשעה.',
    category: 'נגרות',
    city: 'חולון',
    address: 'רחוב סוקולוב 20',
    tags: ['מדפים', 'IKEA'],
    tipAmount: 0,
    tipMethod: 'cash',
  },
  {
    title: 'תמיכה טכנית — הגדרת מחשב חדש',
    description: 'קיבלתי מחשב נייד חדש ואני צריך/ה עזרה בהגדרה: חיבור לרשת, התקנת תוכנות ועברת קבצים מהמחשב הישן.',
    category: 'תמיכה טכנית',
    city: 'נתניה',
    address: 'רחוב הרצל 55',
    tags: ['מחשב', 'הגדרה'],
    tipAmount: 0,
    tipMethod: 'cash',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  await connectDB();

  console.log('\n🗑  Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Gig.deleteMany({}),
    Review.deleteMany({}),
  ]);

  // Drop indexes so they're cleanly rebuilt
  await Promise.allSettled([
    User.collection.dropIndexes(),
    Gig.collection.dropIndexes(),
    Review.collection.dropIndexes(),
  ]);
  await Promise.all([
    User.ensureIndexes(),
    Gig.ensureIndexes(),
    Review.ensureIndexes(),
  ]);

  console.log('👤 Creating users...');
  const createdUsers = await Promise.all(
    USERS.map(async ({ password, ...rest }) => {
      const hashed = await bcrypt.hash(password, 10);
      return User.create({ ...rest, password: hashed });
    }),
  );

  const adminUser    = createdUsers[0];
  const consumerUsers = createdUsers.filter((u) => u.role === 'consumer');

  console.log('📋 Creating gigs...');
  await Promise.all(
    GIG_TEMPLATES.map((template, idx) => {
      const author = consumerUsers[idx % consumerUsers.length];
      return Gig.create({
        ...template,
        postType: 'WANTED',
        price: 30,
        author: author._id,
        location: { city: template.city, address: template.address },
        status: 'open',
      });
    }),
  );

  console.log('\n✅ Seed complete!\n');
  console.log('──────────────────────────────────');
  console.log('👤 Admin credentials:');
  console.log(`   Email   : ${adminUser.email}`);
  console.log(`   Password: Admin1234!`);
  console.log('──────────────────────────────────');
  console.log(`   Created ${createdUsers.length} users`);
  console.log(`   Created ${GIG_TEMPLATES.length} gigs`);
  console.log('──────────────────────────────────\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
