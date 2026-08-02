const features = [
  {
    icon: '📊',
    title: 'לוח חודשי ברור',
    desc: 'כל ההלוואות שלך מסודרות בטבלה אחת — ראה בבת אחת כמה משלמים, לאיזה גורם ומתי.',
  },
  {
    icon: '✅',
    title: 'סימון תשלום שבוצע',
    desc: 'אישרת תשלום? לחיצה אחת הופכת אותו לירוק. הנתון נשמר לחודש הבא אוטומטית.',
  },
  {
    icon: '📅',
    title: 'היסטוריה מלאה',
    desc: 'גלול אחורה לכל חודש שעבר וראה בדיוק כמה שילמת, גם אחרי שינויים.',
  },
  {
    icon: '❄️',
    title: 'הקפאת הלוואה',
    desc: 'לא משלם חודש? הקפא את ההלוואה והיא לא תופיע בלוח עד שתחזיר אותה.',
  },
  {
    icon: '🏦',
    title: 'קטגוריות גמישות',
    desc: 'צור קטגוריות לבנקים, לגורמים פרטיים או לכל מקור אחר — לפי הצורך שלך.',
  },
  {
    icon: '🔐',
    title: 'כניסה גמישה ומאובטחת',
    desc: 'התחבר עם קוד חד-פעמי למייל, או הגדר סיסמה ותיכנס עם מייל וסיסמה — מה שנוח לך.',
  },
];

export default function AboutPage() {
  return (
    <section style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 2rem' }}>

      {/* Hero */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #0c5561 0%, #22b8c2 100%)',
        borderRadius: 20,
        padding: '2.5rem 2rem',
        textAlign: 'center',
        marginBottom: '1.5rem',
        color: '#fff',
      }}>
        <div style={{ fontSize: '3.2rem', marginBottom: '0.5rem' }}>₪</div>
        <h1 style={{ margin: '0 0 0.4rem', fontSize: '1.8rem', fontWeight: 800 }}>מעקב הלוואות</h1>
        <p style={{ margin: 0, opacity: 0.85, fontSize: '1.05rem' }}>
          כלי אישי לניהול כל ההלוואות שלך במקום אחד
        </p>
      </div>

      {/* What is it */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.5rem 1.75rem' }}>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.1rem', color: '#0c5561' }}>למה זה קיים?</h2>
        <p style={{ margin: 0, lineHeight: 1.8, color: '#3a5a62' }}>
          כשיש כמה הלוואות בו-זמנית — לבנק, לבן משפחה, לחברת ביטוח — קשה לעקוב מי שולם,
          כמה נשאר ומתי מסיימים. האפליקציה הזו נותנת תמונה שלמה בלוח אחד, חודש אחר חודש,
          בלי גיליונות אקסל ובלי לנחש.
        </p>
      </div>

      {/* Features grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        {features.map((f) => (
          <div key={f.title} className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.8rem', lineHeight: 1, flexShrink: 0 }}>{f.icon}</span>
            <div>
              <strong style={{ display: 'block', color: '#0c5561', marginBottom: '0.3rem' }}>{f.title}</strong>
              <span style={{ color: '#62757b', fontSize: '0.92rem', lineHeight: 1.6 }}>{f.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="card" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <span style={{ color: '#62757b', fontSize: '0.88rem' }}>
          הנתונים שלך שמורים בענן ומאובטחים — נגישים מכל מכשיר
        </span>
        <span style={{ color: '#aaa', fontSize: '0.82rem', flexShrink: 0 }}>גרסה 1.0</span>
      </div>

    </section>
  );
}
