import { useEffect, useState } from 'react';
import { I18nProvider } from './i18n';
import { useUiSettings } from './settings';
import { navigate, useRoute } from './router';
import { db } from './db';
import { Home } from './screens/Home';
import { ProfileScreen } from './screens/Profile';
import { SettingsScreen } from './screens/Settings';
import { SourcesScreen } from './screens/Sources';
import { TrainingScreen } from './screens/Training';
import { StatsScreen } from './screens/Stats';
import { ExamStart } from './screens/ExamStart';
import { ExamRun } from './screens/ExamRun';
import { ExamResult } from './screens/ExamResult';
import { TeacherApp } from './teacher/TeacherApp';

export function App() {
  const ui = useUiSettings();
  const path = useRoute();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = ui.theme;
    document.documentElement.lang = ui.lang;
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute('content', ui.theme === 'dark' ? '#0f1115' : '#f5f6f8');
  }, [ui.theme, ui.lang]);

  // Незавершённый экзамен восстанавливается сразу после запуска/перезагрузки.
  useEffect(() => {
    db.exam
      .get('current')
      .then((s) => {
        if (s && !s.finished && !path.startsWith('/exam/run')) navigate('/exam/run', true);
      })
      .finally(() => setChecked(true));
    // только при первом запуске
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!checked) return null;

  return (
    <I18nProvider lang={ui.lang}>
      <div className="app">{route(path)}</div>
    </I18nProvider>
  );
}

function route(fullPath: string) {
  const path = fullPath.split('?')[0];
  if (path.startsWith('/teacher')) return <TeacherApp path={path} />;
  switch (path) {
    case '/profile':
      return <ProfileScreen />;
    case '/settings':
      return <SettingsScreen />;
    case '/sources':
      return <SourcesScreen />;
    case '/training':
      return <TrainingScreen />;
    case '/stats':
      return <StatsScreen />;
    case '/exam':
      return <ExamStart />;
    case '/exam/run':
      return <ExamRun />;
    case '/exam/result':
      return <ExamResult />;
    default:
      return <Home />;
  }
}
