// backend/scripts/simulate-user.js
const API_URL = "http://localhost:5000/api";

async function runSimulation() {
    console.log("🤖 מתחיל אוטומציה דרך הטרמינל...");
    
    // נייצר אימייל רנדומלי כדי שנוכל להריץ את הסקריפט שוב ושוב בלי שגיאת "משתמש קיים"
    const randomNum = Math.floor(Math.random() * 10000);
    const userPayload = {
        name: `Terminal User ${randomNum}`,
        email: `tester${randomNum}@chalturot.com`,
        password: "password123"
    };

    try {
        // --- שלב 1: הרשמה וקבלת טוקן ---
        console.log(`1️⃣ רושם משתמש חדש: ${userPayload.email}...`);
        const regRes = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userPayload)
        });
        
        const regData = await regRes.json();
        if (!regRes.ok) throw new Error(regData.message);
        
        const token = regData.token;
        console.log(`✅ משתמש נוצר בהצלחה! מזהה טוקן: ${token.substring(0, 15)}...`);

        // --- שלב 2: ביצוע פעולה (פתיחת משימה) עם הטוקן ---
        console.log("2️⃣ פותח משימה חדשה בשם המשתמש...");
        const gigPayload = {
            title: "צריך עזרה להתקין טלוויזיה",
            description: "קניתי 65 אינץ' וצריך לקדוח בקיר",
            postType: "WANTED",
            category: "Handyman",
            location: { city: "תל אביב", address: "דיזנגוף 100" }
        };

        const gigRes = await fetch(`${API_URL}/gigs`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // כאן אנחנו מעבירים את תעודת הזהות שלנו!
            },
            body: JSON.stringify(gigPayload)
        });

        const gigData = await gigRes.json();
        if (!gigRes.ok) throw new Error(gigData.message);

        console.log(`✅ המשימה נוצרה בהצלחה! מזהה המשימה: ${gigData.gig._id}`);
        console.log("🎯 האוטומציה הסתיימה.");

    } catch (error) {
        console.error("❌ שגיאה במהלך האוטומציה:", error.message);
    }
}

runSimulation();