export default function AboutPage() {
  return (
    <section className="about-page card" style={{ maxWidth: 600, margin: '0 auto', padding: '2rem' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>מעקב הלוואות &#8362;</h1>
      <p className="eyebrow" style={{ marginBottom: '1.5rem' }}>אפליקציה לניהול הלוואות חודשי</p>

      <dl className="loan-details" style={{ marginBottom: '1.5rem' }}>
        <div>
          <dt>גרסה</dt>
          <dd>1.0.0</dd>
        </div>
        <div>
          <dt>טכנולוגיות</dt>
          <dd>React · TypeScript · Vite · FastAPI · PostgreSQL</dd>
        </div>
        <div>
          <dt>אחסון</dt>
          <dd>Vercel (Frontend) · Hugging Face Spaces (Backend) · Neon PostgreSQL (DB)</dd>
        </div>
        <div>
          <dt>כניסה</dt>
          <dd>אימות בקוד חד-פעמי (OTP) למייל — ללא סיסמאות</dd>
        </div>
      </dl>

      <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>מה האפליקציה עושה?</h2>
      <ul style={{ paddingRight: '1.2rem', lineHeight: 1.8, color: '#3a5a62' }}>
        <li>מעקב חודשי אחר הלוואות לפי קטגוריות (בנקים, גורמים פרטיים וכד')</li>
        <li>תצוגת לוח עם חיוב חודשי, מספר תשלום נוכחי ויתרת תשלומים</li>
        <li>אישור תשלומים כ"ירוק" לאחר ביצוע</li>
        <li>היסטוריה חודשית מלאה</li>
        <li>הקפאת הלוואות זמנית</li>
        <li>תמיכה בריבוי משתמשים עם בידוד מלא בין חשבונות</li>
      </ul>

      <p style={{ marginTop: '2rem', color: '#aaa', fontSize: '0.8rem', textAlign: 'center' }}>
        פותח עם ♥ · כל הנתונים שמורים בענן ומאובטחים
      </p>
    </section>
  );
}
