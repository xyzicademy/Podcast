import React from 'react';
import { X, Play, Scissors, Copy, Trash2, Undo, Redo, Settings2 } from 'lucide-react';

interface UserGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserGuide: React.FC<UserGuideProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" dir="rtl">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 p-6 flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold text-zinc-100">מדריך למשתמש - עורך אודיו</h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-10 text-zinc-300">
          
          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-orange-500 flex items-center gap-2">
              <Play className="w-5 h-5" />
              מבוא
            </h3>
            <p className="leading-relaxed">
              ברוכים הבאים לעורך האודיו המקצועי. המערכת מאפשרת לכם להקליט, לערוך, ולעבד קטעי קול בקלות. 
              התכונה המרכזית של המערכת היא <strong>התאמת סגנון (Style Transfer)</strong> המאפשרת לקחת קטע אודיו אחד ולהחיל עליו את מאפייני הסאונד (EQ, עוצמה, דינמיקה) של קטע אחר.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-orange-500 flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              התאמת סגנון (Style Transfer)
            </h3>
            <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700/50">
              <ol className="list-decimal list-inside space-y-3">
                <li>העלו או הקליטו לפחות שני קטעי אודיו שונים.</li>
                <li>בחרו את הקטע שאתם רוצים <strong>לערוך</strong> (הקטע שיושפע).</li>
                <li>בפאנל הכלים בצד ימין, תחת "התאמת סגנון", בחרו את <strong>רצועת הרפרנס</strong> (הקטע שאת הסגנון שלו תרצו להעתיק).</li>
                <li>לחצו על <strong>"החל סגנון"</strong>.</li>
                <li>המערכת תנתח את שני הקטעים ותתאים את העוצמה, תדרי ה-EQ (נמוכים, אמצעיים, גבוהים) והדינמיקה כדי שהקטע הנבחר יישמע כאילו הוקלט באותם תנאים כמו קטע הרפרנס.</li>
              </ol>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-orange-500 flex items-center gap-2">
              <Scissors className="w-5 h-5" />
              עריכה בסיסית
            </h3>
            <ul className="space-y-4">
              <li className="flex gap-4 items-start">
                <div className="bg-zinc-800 p-2 rounded-lg mt-1"><Scissors className="w-4 h-4 text-orange-400" /></div>
                <div>
                  <strong className="block text-zinc-100">חיתוך (Split)</strong>
                  <p>הציבו את סמן הניגון בנקודה הרצויה ולחצו על כפתור החיתוך (או מקש S). הרצועה תפוצל לשני חלקים שניתן להזיז בנפרד.</p>
                </div>
              </li>
              <li className="flex gap-4 items-start">
                <div className="bg-zinc-800 p-2 rounded-lg mt-1"><Trash2 className="w-4 h-4 text-orange-400" /></div>
                <div>
                  <strong className="block text-zinc-100">מחיקת אזור</strong>
                  <p>גררו את העכבר על גבי סרגל הזמן העליון, או החזיקו את מקש Shift וגררו על גבי רצועה כדי לסמן אזור. לאחר מכן לחצו על מקש Delete. החלקים הנותרים יתחברו אוטומטית.</p>
                </div>
              </li>
              <li className="flex gap-4 items-start">
                <div className="bg-zinc-800 p-2 rounded-lg mt-1"><Copy className="w-4 h-4 text-orange-400" /></div>
                <div>
                  <strong className="block text-zinc-100">שכפול</strong>
                  <p>בחרו רצועה ולחצו על כפתור השכפול (או Ctrl+D) כדי ליצור עותק מדויק שלה.</p>
                </div>
              </li>
            </ul>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-orange-500">קיצורי מקלדת</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-zinc-800/30 p-4 rounded-xl border border-zinc-700/30 flex justify-between items-center">
                <span>ניגון / עצירה</span>
                <kbd className="bg-zinc-700 px-2 py-1 rounded text-sm font-mono text-zinc-200">Space</kbd>
              </div>
              <div className="bg-zinc-800/30 p-4 rounded-xl border border-zinc-700/30 flex justify-between items-center">
                <span>חיתוך רצועה</span>
                <kbd className="bg-zinc-700 px-2 py-1 rounded text-sm font-mono text-zinc-200">S</kbd>
              </div>
              <div className="bg-zinc-800/30 p-4 rounded-xl border border-zinc-700/30 flex justify-between items-center">
                <span>מחיקת רצועה/אזור</span>
                <kbd className="bg-zinc-700 px-2 py-1 rounded text-sm font-mono text-zinc-200">Delete</kbd>
              </div>
              <div className="bg-zinc-800/30 p-4 rounded-xl border border-zinc-700/30 flex justify-between items-center">
                <span>שכפול רצועה</span>
                <kbd className="bg-zinc-700 px-2 py-1 rounded text-sm font-mono text-zinc-200">Ctrl + D</kbd>
              </div>
              <div className="bg-zinc-800/30 p-4 rounded-xl border border-zinc-700/30 flex justify-between items-center">
                <span>ביטול פעולה (Undo)</span>
                <kbd className="bg-zinc-700 px-2 py-1 rounded text-sm font-mono text-zinc-200">Ctrl + Z</kbd>
              </div>
              <div className="bg-zinc-800/30 p-4 rounded-xl border border-zinc-700/30 flex justify-between items-center">
                <span>ביצוע מחדש (Redo)</span>
                <kbd className="bg-zinc-700 px-2 py-1 rounded text-sm font-mono text-zinc-200">Ctrl + Shift + Z</kbd>
              </div>
              <div className="bg-zinc-800/30 p-4 rounded-xl border border-zinc-700/30 flex justify-between items-center">
                <span>הוספת סמן (Marker)</span>
                <kbd className="bg-zinc-700 px-2 py-1 rounded text-sm font-mono text-zinc-200">M</kbd>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};
