const ATTRACTIONS = [
  {name:"Central Samui",destination:"koh_samui",categories:["קניות","משחקיות"],rating:4,
   description:"קניון מרכזי וממוזג עם אזור משחקים, מסעדות וחנויות ילדים."},
  {name:"Big C Supercenter Samui",destination:"koh_samui",categories:["קניות","סופרים"],rating:4,
   description:"סופר גדול עם מחירים מקומיים, בגדי ילדים וציוד יומיומי."},
  {name:"Lotus’s Samui",destination:"koh_samui",categories:["קניות","סופרים"],rating:4,
   description:"קניות יומיומיות נוחות למשפחות."},
  {name:"Let’s Relax Spa Samui",destination:"koh_samui",categories:["ספא & טיפוח"],rating:4,
   description:"ספא מוכר עם ביקורות טובות ממשפחות, לטיפולים קצרים."},
  {name:"Health Land Samui",destination:"koh_samui",categories:["ספא & טיפוח"],rating:null,
   description:"רשת מוכרת – תלוי סניף, לבדוק מדיניות ילדים."},
  {name:"7-Eleven Bang Rak",destination:"koh_samui",categories:["סופרים"],rating:4,
   description:"מינימרקטים 24/7 ליד הבית."}
];

document.getElementById("app").innerHTML =
  "<h1>קוסמוי – אטרקציות למשפחות</h1>" +
  ATTRACTIONS.map(a => `<div><strong>${a.name}</strong> (${a.categories.join(", ")})</div>`).join("");
