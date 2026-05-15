import { useCallback, useState } from 'react';
import styles from './PetStage.module.css';

type ImportStatus = 'idle' | 'choosing' | 'success' | 'error';
type ImportSourceType = 'zip' | 'directory';

export function PetImportPanel() {
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [message, setMessage] = useState('选择一个 zip 包，或者选择已经解压的宠物目录。');

  const chooseSource = useCallback(async (sourceType: ImportSourceType) => {
    if (!window.electronAPI?.choosePetImportSource) return;

    setStatus('choosing');
    setMessage(sourceType === 'zip' ? '正在选择 zip 宠物包…' : '正在选择宠物目录…');

    try {
      const result = await window.electronAPI.choosePetImportSource(sourceType);
      if (result.cancelled) {
        setStatus('idle');
        setMessage('已取消选择，可以重新选择 zip 包或宠物目录。');
        return;
      }
      if (!result.ok) {
        setStatus('error');
        setMessage(result.errors?.[0] ?? '导入失败，请确认宠物包包含 pet.json 和 spritesheet.webp。');
        return;
      }
      setStatus('success');
      setMessage(`已导入：${result.imported?.manifest?.name ?? '新宠物'}`);
      window.setTimeout(() => {
        void window.electronAPI?.closePetImportPanel?.();
      }, 700);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : '导入失败，请重试。');
    }
  }, []);

  const closePanel = useCallback(() => {
    void window.electronAPI?.closePetImportPanel?.();
  }, []);

  return (
    <main className={styles.importDesktop} data-pet-import-panel="true">
      <section className={styles.importPanel} aria-label="pet-import-panel" data-status={status}>
        <div className={styles.importHeader}>
          <div>
            <p className={styles.importEyebrow}>Pawkit</p>
            <h1 className={styles.importTitle}>导入宠物包</h1>
          </div>
          <button className={styles.importCloseButton} type="button" onClick={closePanel} aria-label="关闭导入面板">
            ×
          </button>
        </div>
        <p className={styles.importMessage}>{message}</p>
        <div className={styles.importActions}>
          <button
            className={styles.importPrimaryButton}
            type="button"
            disabled={status === 'choosing'}
            onClick={() => void chooseSource('zip')}
          >
            选择 zip 包
          </button>
          <button
            className={styles.importSecondaryButton}
            type="button"
            disabled={status === 'choosing'}
            onClick={() => void chooseSource('directory')}
          >
            选择目录
          </button>
        </div>
        <p className={styles.importHint}>兼容 Codex Pet 格式：pet.json + spritesheet.webp。</p>
      </section>
    </main>
  );
}
