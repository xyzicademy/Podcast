import React from 'react';
import { X, Play, Scissors, Copy, Trash2, Undo, Redo, Settings2, Mic, Upload, Download, Split, Crop, Layers, Music, Volume2, VolumeX, FastForward, Rewind, SkipBack, SkipForward, HelpCircle, Brush, Eraser, MapPin, SlidersHorizontal, Plus, Undo2, Redo2, Save, Edit2, Lock } from 'lucide-react';

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
          <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-3">
            <HelpCircle className="w-6 h-6 text-orange-500" />
            מדריך למשתמש - עורך אודיו
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-12 text-zinc-300">
          
          {/* 1. Welcome Screen */}
          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-orange-500 flex items-center gap-2 border-b border-zinc-800 pb-2">
              <span className="bg-orange-500/20 text-orange-500 w-8 h-8 rounded-lg flex items-center justify-center text-sm">1</span>
              מסך הפתיחה: הוספת אודיו והקלטה
            </h3>
            <p className="leading-relaxed">
              כאשר תפתחו את המערכת ללא פרויקט פעיל, תראו את מסך הפתיחה. כאן תוכלו להתחיל לעבוד בשתי דרכים:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="bg-zinc-800/30 p-5 rounded-xl border border-zinc-700/50 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center">
                  <Upload className="w-6 h-6 text-blue-400" />
                </div>
                <strong className="text-zinc-100">העלאת קובץ (Upload)</strong>
                <p className="text-sm">לחצו על אזור ההעלאה או גררו אליו קבצי אודיו (MP3, WAV) מהמחשב שלכם כדי להוסיף אותם לפרויקט.</p>
              </div>
              <div className="bg-zinc-800/30 p-5 rounded-xl border border-zinc-700/50 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center">
                  <Mic className="w-6 h-6 text-red-400" />
                </div>
                <strong className="text-zinc-100">הקלטה (Record)</strong>
                <p className="text-sm">לחצו על "הכנה להקלטה" ולאחר מכן על "התחל הקלטה" כדי להקליט ישירות מהדפדפן. בסיום ההקלטה, לחצו על כפתור העצירה והיא תתווסף אוטומטית כרצועה חדשה.</p>
              </div>
            </div>
          </section>

          {/* 2. Top Bar Actions */}
          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-orange-500 flex items-center gap-2 border-b border-zinc-800 pb-2">
              <span className="bg-orange-500/20 text-orange-500 w-8 h-8 rounded-lg flex items-center justify-center text-sm">2</span>
              פעולות סרגל עליון
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex gap-4 items-start bg-zinc-800/20 p-3 rounded-lg">
                <div className="bg-zinc-800 p-2 rounded-lg mt-1"><Undo2 className="w-4 h-4 text-zinc-400" /></div>
                <div>
                  <strong className="block text-zinc-100">בטל (Undo)</strong>
                  <p className="text-sm">מבטל את הפעולה האחרונה שביצעתם.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start bg-zinc-800/20 p-3 rounded-lg">
                <div className="bg-zinc-800 p-2 rounded-lg mt-1"><Redo2 className="w-4 h-4 text-zinc-400" /></div>
                <div>
                  <strong className="block text-zinc-100">בצע שוב (Redo)</strong>
                  <p className="text-sm">מבצע שוב פעולה שבוטלה.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start bg-zinc-800/20 p-3 rounded-lg">
                <div className="bg-zinc-800 p-2 rounded-lg mt-1"><Save className="w-4 h-4 text-zinc-400" /></div>
                <div>
                  <strong className="block text-zinc-100">שמור (Save)</strong>
                  <p className="text-sm">שומר את הפרויקט הנוכחי (העבודה שלכם נשמרת אוטומטית בדפדפן, אך מומלץ לשמור ידנית לפני יציאה).</p>
                </div>
              </div>
              <div className="flex gap-4 items-start bg-zinc-800/20 p-3 rounded-lg">
                <div className="bg-zinc-800 p-2 rounded-lg mt-1"><Upload className="w-4 h-4 text-zinc-400" /></div>
                <div>
                  <strong className="block text-zinc-100">טען (Load)</strong>
                  <p className="text-sm">טוען פרויקט שנשמר בעבר.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start bg-zinc-800/20 p-3 rounded-lg">
                <div className="bg-zinc-800 p-2 rounded-lg mt-1"><HelpCircle className="w-4 h-4 text-orange-400" /></div>
                <div>
                  <strong className="block text-zinc-100">מדריך (Guide)</strong>
                  <p className="text-sm">פותח את חלון העזרה והמדריך למשתמש.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start bg-zinc-800/20 p-3 rounded-lg">
                <div className="bg-zinc-800 p-2 rounded-lg mt-1"><Trash2 className="w-4 h-4 text-zinc-400" /></div>
                <div>
                  <strong className="block text-zinc-100">איפוס (Reset)</strong>
                  <p className="text-sm">מוחק את כל הרצועות וההגדרות ומתחיל פרויקט חדש ונקי.</p>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Timeline Tools */}
          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-orange-500 flex items-center gap-2 border-b border-zinc-800 pb-2">
              <span className="bg-orange-500/20 text-orange-500 w-8 h-8 rounded-lg flex items-center justify-center text-sm">3</span>
              כלי ציר הזמן (Timeline)
            </h3>
            <p className="leading-relaxed">
              סרגל הכלים העליון בציר הזמן מאפשר לכם לערוך את הרצועות שלכם. כדי להשתמש ברוב הכלים, <strong>יש לבחור רצועה קודם</strong> (לחיצה על הרצועה תסמן אותה במסגרת כתומה).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex gap-4 items-start bg-zinc-800/20 p-3 rounded-lg">
                <div className="bg-zinc-800 p-2 rounded-lg mt-1"><Scissors className="w-4 h-4 text-orange-400" /></div>
                <div>
                  <strong className="block text-zinc-100">פיצול (Split)</strong>
                  <p className="text-sm">מפצל את הרצועה הנבחרת לשתיים בנקודה שבה נמצא סמן הניגון (הקו הכתום).</p>
                </div>
              </div>
              <div className="flex gap-4 items-start bg-zinc-800/20 p-3 rounded-lg">
                <div className="bg-zinc-800 p-2 rounded-lg mt-1 flex items-center">
                  <Eraser className="w-4 h-4 text-orange-400" />
                  <VolumeX className="w-3 h-3 text-orange-400 -mr-1" />
                </div>
                <div>
                  <strong className="block text-zinc-100">הסרת שקט (Auto Trim)</strong>
                  <p className="text-sm">מסיר אוטומטית שקט (Silence) מההתחלה ומהסוף של הרצועה הנבחרת.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start bg-zinc-800/20 p-3 rounded-lg">
                <div className="bg-zinc-800 p-2 rounded-lg mt-1"><MapPin className="w-4 h-4 text-orange-400" /></div>
                <div>
                  <strong className="block text-zinc-100">סמן (Marker)</strong>
                  <p className="text-sm">מוסיף סמן על ציר הזמן לציון נקודות חשובות.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start bg-zinc-800/20 p-3 rounded-lg">
                <div className="bg-zinc-800 p-2 rounded-lg mt-1 flex items-center">
                  <Plus className="w-4 h-4 text-orange-400" />
                  <Layers className="w-4 h-4 text-orange-400 -ml-1" />
                </div>
                <div>
                  <strong className="block text-zinc-100">ערוץ חדש (Add Channel)</strong>
                  <p className="text-sm">מוסיף ערוץ חדש (שכבה) לציר הזמן, אליו ניתן לגרור רצועות.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start bg-zinc-800/20 p-3 rounded-lg">
                <div className="bg-zinc-800 p-2 rounded-lg mt-1"><Trash2 className="w-4 h-4 text-orange-400" /></div>
                <div>
                  <strong className="block text-zinc-100">מחק ערוצים ריקים</strong>
                  <p className="text-sm">מוחק את כל הערוצים (שכבות) שאין בהם רצועות אודיו.</p>
                </div>
              </div>
            </div>
            <div className="bg-zinc-800/30 p-4 rounded-xl border border-zinc-700/50 mt-4">
              <strong className="text-zinc-100 block mb-3">פקדים על גבי הרצועה (בציר הזמן)</strong>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 bg-zinc-800/50 p-2 rounded">
                  <Edit2 className="w-4 h-4 text-zinc-400" /> <strong>עריכת שם:</strong> שינוי שם הערוץ.
                </div>
                <div className="flex items-center gap-2 bg-zinc-800/50 p-2 rounded">
                  <VolumeX className="w-4 h-4 text-zinc-400" /> <strong>השתקה (Mute):</strong> השתקת הערוץ.
                </div>
                <div className="flex items-center gap-2 bg-zinc-800/50 p-2 rounded">
                  <Lock className="w-4 h-4 text-zinc-400" /> <strong>נעילה:</strong> מניעת עריכה של קטע האודיו.
                </div>
                <div className="flex items-center gap-2 bg-zinc-800/50 p-2 rounded">
                  <Copy className="w-4 h-4 text-zinc-400" /> <strong>שכפול:</strong> יצירת עותק של קטע האודיו.
                </div>
                <div className="flex items-center gap-2 bg-zinc-800/50 p-2 rounded sm:col-span-2">
                  <Trash2 className="w-4 h-4 text-zinc-400" /> <strong>מחיקת ערוץ / קטע:</strong> מחיקת הערוץ כולו (בצד שמאל) או מחיקת קטע האודיו הספציפי (על גבי הקטע עצמו).
                </div>
              </div>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl mt-4">
              <strong className="text-blue-400 block mb-1">💡 טיפ: מחיקת אזור (Region)</strong>
              <p className="text-sm">ניתן למחוק חלק ספציפי מתוך רצועה על ידי גרירת העכבר על סרגל הזמן העליון (היכן שמופיעים המספרים) כדי לסמן אזור, ואז לחיצה על מקש <kbd className="bg-zinc-800 px-1 rounded">Delete</kbd>.</p>
            </div>
          </section>

          {/* 4. Playback Controls */}
          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-orange-500 flex items-center gap-2 border-b border-zinc-800 pb-2">
              <span className="bg-orange-500/20 text-orange-500 w-8 h-8 rounded-lg flex items-center justify-center text-sm">4</span>
              תיבת הניגון (Playback) ופקדי רצועה
            </h3>
            <p className="leading-relaxed">
              בצד ימין תמצאו את פאנל השליטה המרכזי. הוא מחולק לשליטה כללית בפרויקט ולשליטה ספציפית ברצועה נבחרת.
            </p>
            
            <div className="space-y-6">
              <div className="bg-zinc-800/30 p-4 rounded-xl border border-zinc-700/50">
                <strong className="text-zinc-100 block mb-3">שליטה כללית (Global)</strong>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex bg-zinc-800 rounded-lg p-1">
                    <SkipBack className="w-4 h-4 m-1" />
                    <Rewind className="w-4 h-4 m-1" />
                    <Play className="w-4 h-4 m-1 text-orange-500" />
                    <FastForward className="w-4 h-4 m-1" />
                    <SkipForward className="w-4 h-4 m-1" />
                  </div>
                </div>
                <p className="text-sm">כפתורי הניגון שולטים בכל הפרויקט יחד. תוכלו לנגן, לעצור, לקפוץ להתחלה/סוף, או לדלג קדימה ואחורה בקפיצות קטנות. תחתיהם נמצא סליידר "מהירות כללית" לשליטה במהירות הניגון של כל הפרויקט.</p>
              </div>

              <div className="bg-zinc-800/30 p-4 rounded-xl border border-zinc-700/50">
                <h4 className="text-lg font-semibold text-orange-400 mb-3 border-b border-zinc-700/50 pb-2">שליטה ברצועה נבחרת</h4>
                <strong className="text-zinc-100 block mb-3">פאנל צדדי (Track Controls)</strong>
                <p className="text-sm mb-3">כאשר תבחרו רצועה בציר הזמן, יפתחו אפשרויות השליטה עבורה בפאנל הימני:</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2"><Volume2 className="w-4 h-4 text-zinc-400" /> <strong>עוצמת קול (Volume):</strong> מאפשר להגביר או להנמיך את הרצועה הספציפית (עד 500%). שינוי העוצמה ישתקף ויזואלית בגובה הגל (Waveform) של הרצועה.</li>
                  <li className="flex items-center gap-2"><FastForward className="w-4 h-4 text-zinc-400" /> <strong>מהירות (Speed):</strong> מאפשר להאיץ או להאט את הרצועה.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 5. Styles & Advanced Settings */}
          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-orange-500 flex items-center gap-2 border-b border-zinc-800 pb-2">
              <span className="bg-orange-500/20 text-orange-500 w-8 h-8 rounded-lg flex items-center justify-center text-sm">5</span>
              תיבת הסגנונות (Presets) והגדרות מתקדמות
            </h3>
            <p className="leading-relaxed">
              המערכת מגיעה עם סגנונות סאונד מוכנים מראש, ומאפשרת ליצור סגנונות משלכם באמצעות הגדרות מתקדמות.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-zinc-800/30 p-4 rounded-xl border border-zinc-700/50">
                <strong className="text-zinc-100 block mb-2 flex items-center gap-2"><Music className="w-4 h-4" /> סגנונות מובנים</strong>
                <p className="text-sm mb-3">בחרו מתוך רשימת הסגנונות (כגון "סטודיו טבעי (Pro)", "פודקאסט / רדיו (Pro)", "חד וברור (Pro)") כדי להחיל עיבוד סאונד מיידי על כל הפרויקט.</p>
                <div className="flex gap-2">
                  <span className="bg-zinc-800 px-2 py-1 rounded text-xs">Podcast</span>
                  <span className="bg-zinc-800 px-2 py-1 rounded text-xs">Radio</span>
                  <span className="bg-zinc-800 px-2 py-1 rounded text-xs">Deep</span>
                </div>
              </div>

              <div className="bg-zinc-800/30 p-4 rounded-xl border border-zinc-700/50">
                <strong className="text-zinc-100 block mb-2 flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" /> הגדרות מתקדמות</strong>
                <p className="text-sm">לחיצה על "הצג הגדרות מתקדמות (דיוקים)" תפתח פאנל מתקדם עם כפתורי סיבוב (Knobs) לשליטה מדויקת:</p>
                <ul className="list-disc list-inside text-sm mt-2 space-y-1 text-zinc-400">
                  <li><strong>EQ:</strong> שליטה בתדרים נמוכים (Low), אמצעיים (Mid) וגבוהים (High).</li>
                  <li><strong>Compressor:</strong> שליטה בדינמיקה (Threshold, Ratio) לאיזון עוצמת הקול.</li>
                  <li><strong>Noise Gate:</strong> השתקת רעשי רקע חלשים.</li>
                  <li><strong>Reverb:</strong> הוספת הדהוד/חלל לסאונד.</li>
                  <li><strong>נרמול (Normalize):</strong> השוואת עוצמת הקול המקסימלית.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 6. Add Media, Match Style, Export */}
          <section className="space-y-4">
            <h3 className="text-xl font-semibold text-orange-500 flex items-center gap-2 border-b border-zinc-800 pb-2">
              <span className="bg-orange-500/20 text-orange-500 w-8 h-8 rounded-lg flex items-center justify-center text-sm">6</span>
              הוספת מדיה, התאמת סגנון וייצוא
            </h3>
            
            <div className="space-y-4">
              <div className="bg-zinc-800/30 p-4 rounded-xl border border-zinc-700/50 flex flex-col sm:flex-row gap-4 items-start">
                <div className="bg-zinc-800 p-3 rounded-xl shrink-0"><Upload className="w-6 h-6 text-blue-400" /></div>
                <div>
                  <strong className="text-zinc-100 text-lg block mb-1">הוסף מדיה (Add Media)</strong>
                  <p className="text-sm">מאפשר להוסיף רצועות נוספות לפרויקט הקיים. תוכלו להעלות קובץ או להקליט רצועה חדשה שתתווסף מתחת לרצועות הקיימות בציר הזמן.</p>
                </div>
              </div>

              <div className="bg-zinc-800/30 p-4 rounded-xl border border-zinc-700/50 flex flex-col sm:flex-row gap-4 items-start">
                <div className="bg-zinc-800 p-3 rounded-xl shrink-0"><Brush className="w-6 h-6 text-purple-400" /></div>
                <div>
                  <strong className="text-zinc-100 text-lg block mb-1">התאמת סגנון (Style Match)</strong>
                  <p className="text-sm mb-2">כלי חכם המעתיק את מאפייני הסאונד מרצועה אחת לאחרת:</p>
                  <ol className="list-decimal list-inside text-sm space-y-1 text-zinc-400">
                    <li>בחרו בציר הזמן את הרצועה שתרצו <strong>לערוך</strong> (קטע יעד).</li>
                    <li>בתיבת "התאמת סגנון", בחרו מהרשימה את <strong>רצועת הרפרנס</strong> (קטע מקור - זו שאת הסאונד שלה תרצו להעתיק).</li>
                    <li>לחצו על "החל סגנון". המערכת תנתח ותשווה את ה-EQ והעוצמות.</li>
                  </ol>
                </div>
              </div>

              <div className="bg-zinc-800/30 p-4 rounded-xl border border-zinc-700/50 flex flex-col sm:flex-row gap-4 items-start">
                <div className="bg-zinc-800 p-3 rounded-xl shrink-0"><Download className="w-6 h-6 text-green-400" /></div>
                <div>
                  <strong className="text-zinc-100 text-lg block mb-1">ייצוא פרויקט (Export)</strong>
                  <p className="text-sm">בסיום העבודה, תוכלו לשמור את התוצאה הסופית. בחרו את הפורמט הרצוי (MP3, WAV, או WebM) ולחצו על "ייצוא לקובץ". המערכת תמזג את כל הרצועות ותחיל את האפקטים לקובץ אחד להורדה.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Keyboard Shortcuts */}
          <section className="space-y-4 pt-6 border-t border-zinc-800">
            <h3 className="text-xl font-semibold text-orange-500">קיצורי מקלדת שימושיים</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div className="flex justify-between items-center bg-zinc-800/50 px-3 py-2 rounded-lg">
                <span className="text-sm">ניגון / עצירה</span>
                <kbd className="bg-zinc-700 px-2 py-1 rounded text-xs font-mono">Space</kbd>
              </div>
              <div className="flex justify-between items-center bg-zinc-800/50 px-3 py-2 rounded-lg">
                <span className="text-sm">חיתוך רצועה</span>
                <kbd className="bg-zinc-700 px-2 py-1 rounded text-xs font-mono">S</kbd>
              </div>
              <div className="flex justify-between items-center bg-zinc-800/50 px-3 py-2 rounded-lg">
                <span className="text-sm">מחיקה</span>
                <kbd className="bg-zinc-700 px-2 py-1 rounded text-xs font-mono">Delete</kbd>
              </div>
              <div className="flex justify-between items-center bg-zinc-800/50 px-3 py-2 rounded-lg">
                <span className="text-sm">שכפול</span>
                <kbd className="bg-zinc-700 px-2 py-1 rounded text-xs font-mono">Ctrl+D</kbd>
              </div>
              <div className="flex justify-between items-center bg-zinc-800/50 px-3 py-2 rounded-lg">
                <span className="text-sm">ביטול פעולה</span>
                <kbd className="bg-zinc-700 px-2 py-1 rounded text-xs font-mono">Ctrl+Z</kbd>
              </div>
              <div className="flex justify-between items-center bg-zinc-800/50 px-3 py-2 rounded-lg">
                <span className="text-sm">ביצוע שוב</span>
                <kbd className="bg-zinc-700 px-2 py-1 rounded text-xs font-mono">Ctrl+Y</kbd>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};
