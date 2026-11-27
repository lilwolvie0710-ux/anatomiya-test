import { IMAGES, imageSrc } from '../content/images';
import { useI18n } from '../i18n';
import { Screen } from '../components/Layout';

export function SourcesScreen() {
  const { t } = useI18n();
  return (
    <Screen title={t('sources')}>
      <p className="muted">{t('sourcesIntro')}</p>
      {IMAGES.map((img) => (
        <div key={img.id} className="card stack">
          <img src={imageSrc(img.id)} alt="" style={{ maxHeight: 140, objectFit: 'contain', background: '#fff', borderRadius: 8 }} />
          <div style={{ fontWeight: 700 }}>{img.title}</div>
          <div className="small">
            {t('author')}: {img.author}
          </div>
          <div className="small">
            {t('source')}: {img.source}
          </div>
          <div className="small">
            {t('license')}:{' '}
            <a href={img.licenseUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
              {img.license}
            </a>
          </div>
          {img.changes && (
            <div className="small muted">
              {t('changes')}: {img.changes}
            </div>
          )}
          <a href={img.sourceUrl} target="_blank" rel="noreferrer" className="small" style={{ color: 'var(--accent)', wordBreak: 'break-all' }}>
            {img.sourceUrl}
          </a>
        </div>
      ))}
      <div className="card small muted">
        Terminologia Anatomica (FIPAT, 2-nd ed., 2019). Sillabus: HUMAN ANATOMY 1 (AN 112312), 2026–2027.
      </div>
    </Screen>
  );
}
