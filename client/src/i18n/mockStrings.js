// UI strings that exist only in mock mode (VITE_USE_MOCKS=true). Kept out of
// en.js/ar.js so production builds, where every use is removed by an inline
// env check, do not ship them (e.g. the demo password).
export const MOCK_STRINGS = {
  en: {
    reset: 'Mock API · reset',
    resetTitle: 'Reset mock data to the seed fixtures and sign out',
    accounts: 'Mock accounts (password demo1234): questioners sara, john · dāʿīs khalid, maryam · admin',
  },
  ar: {
    reset: 'واجهة تجريبية · إعادة ضبط',
    resetTitle: 'إعادة البيانات التجريبية إلى حالتها الأولى وتسجيل الخروج',
    accounts: 'حسابات تجريبية (كلمة المرور demo1234): السائلون sara وjohn · الدعاة khalid وmaryam · admin',
  },
}
